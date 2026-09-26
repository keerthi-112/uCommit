/**
 * Closing out missed days.
 *
 * Until this existed a miss was only ever recorded when an admin
 * actively rejected a proof, so someone who simply stopped submitting
 * was never penalised and never eliminated - the one accountability
 * rule uCommit promises that it did not actually enforce.
 *
 * A day counts as missed when all of the following hold:
 *   - the day has fully elapsed in the participant's own timezone
 *   - it falls inside the challenge window
 *   - it is on or after the day the participant joined
 *   - they submitted nothing at all that day
 *
 * A day where they submitted and were rejected is NOT counted here.
 * That miss was applied when the reviewer rejected it, and counting it
 * again would take the penalty twice.
 *
 * Days are the user's own calendar days, decided by utils/time.ts -
 * the same rule submitProof uses. If the two ever disagreed, this job
 * would charge people for days they had actually shown up for.
 *
 * Safety properties, in order of importance:
 *
 *   1. Idempotent. Every penalised day writes a MissedDay row, and the
 *      unique constraint on (participantId, date) means a second run
 *      cannot charge the same day again - enforced by the database,
 *      not by hoping the job runs once.
 *
 *   2. Dry run by default at the callable layer. The caller must ask
 *      explicitly for money to move.
 *
 *   3. Transactional per participant. A participant's penalties, miss
 *      count, elimination and audit rows all commit together or not
 *      at all.
 */

import prisma from "../prisma/client";

import {
  dayKey,
  todayKey,
  dayKeysBetween,
  queryFloor,
} from "../utils/time";

/** Midday UTC on a day key - a stable instant to store for that day. */
function keyToStoredDate(
  key: string
): Date {
  return new Date(key + "T12:00:00Z");
}

export interface MissedDayOutcome {
  date: string;
  penaltyAmount: number;
  stakeAfter: number;
  missesAfter: number;
  eliminated: boolean;
}

export interface ParticipantOutcome {
  participantId: string;
  userId: string;
  userName: string;
  challengeId: string;
  challengeTitle: string;
  timezone: string;
  missedDays: MissedDayOutcome[];
  totalPenalty: number;
  eliminated: boolean;
}

export interface CloseResult {
  dryRun: boolean;
  participantsChecked: number;
  participantsAffected: number;
  daysPenalised: number;
  totalPenalty: number;
  outcomes: ParticipantOutcome[];
}

export interface CloseOptions {
  /** When false, money actually moves. Callers must opt in. */
  dryRun?: boolean;
  /** Treat this instant as "now". Used by tests. */
  asOf?: Date;
  challengeId?: string;
}

export async function closeMissedDays(
  options: CloseOptions = {}
): Promise<CloseResult> {
  const dryRun = options.dryRun !== false;
  const now = options.asOf ?? new Date();

  const participants =
    await prisma.challengeParticipant.findMany(
      {
        where: {
          eliminated: false,
          challenge: {
            completed: false,
            ...(options.challengeId
              ? { id: options.challengeId }
              : {}),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              timezone: true,
            },
          },
          challenge: true,
          missedDays: {
            select: { date: true },
          },
        },
      }
    );

  const outcomes: ParticipantOutcome[] =
    [];

  for (const participant of participants) {
    const { challenge } = participant;

    const timezone =
      participant.user.timezone ?? "UTC";

    // Today is still in progress in their timezone, so the last
    // judgeable day is the one before it.
    const today = todayKey(
      timezone,
      now
    );

    // Start from the later of the challenge opening and them joining,
    // so nobody is punished for days before they committed.
    const challengeStart = dayKey(
      challenge.startDate,
      timezone
    );

    const joined = dayKey(
      participant.joinedAt,
      timezone
    );

    const firstDay =
      joined > challengeStart
        ? joined
        : challengeStart;

    // Stop at whichever comes first: the challenge ending, or today.
    const challengeEnd = dayKey(
      challenge.endDate,
      timezone
    );

    const lastDay =
      challengeEnd < today
        ? challengeEnd
        : today;

    if (firstDay >= lastDay) continue;

    const candidateDays =
      dayKeysBetween(firstDay, lastDay);

    if (candidateDays.length === 0)
      continue;

    const submissions =
      await prisma.dailySubmission.findMany(
        {
          where: {
            userId: participant.userId,
            challengeId:
              participant.challengeId,
            submittedAt: {
              gte: queryFloor(firstDay),
            },
          },
          select: { submittedAt: true },
        }
      );

    const daysWithSubmission = new Set(
      submissions.map((s) =>
        dayKey(s.submittedAt, timezone)
      )
    );

    const alreadyPenalised = new Set(
      participant.missedDays.map((m) =>
        m.date
          .toISOString()
          .slice(0, 10)
      )
    );

    const missed = candidateDays.filter(
      (key) =>
        !daysWithSubmission.has(key) &&
        !alreadyPenalised.has(key)
    );

    if (missed.length === 0) continue;

    // Replay the penalties to work out the result. In a dry run this is
    // the whole job; otherwise it is written in a transaction below.
    let stake = participant.currentStake;
    let misses = participant.misses;
    let eliminated = false;

    const dayOutcomes: MissedDayOutcome[] =
      [];

    for (const key of missed) {
      if (eliminated) break;

      const penalty =
        (stake *
          challenge.penaltyPercentage) /
        100;

      stake = stake - penalty;
      misses = misses + 1;

      eliminated =
        misses > challenge.maxMisses;

      dayOutcomes.push({
        date: key,
        penaltyAmount: Number(
          penalty.toFixed(2)
        ),
        stakeAfter: Number(
          stake.toFixed(2)
        ),
        missesAfter: misses,
        eliminated,
      });
    }

    const totalPenalty =
      participant.currentStake - stake;

    if (!dryRun) {
      await prisma.$transaction(
        async (tx) => {
          for (const outcome of dayOutcomes) {
            await tx.missedDay.create({
              data: {
                participantId:
                  participant.id,
                date: keyToStoredDate(
                  outcome.date
                ),
                penaltyAmount:
                  outcome.penaltyAmount,
              },
            });
          }

          await tx.challengeParticipant.update(
            {
              where: {
                id: participant.id,
              },
              data: {
                currentStake: stake,
                misses,
                eliminated,
              },
            }
          );
        }
      );
    }

    outcomes.push({
      participantId: participant.id,
      userId: participant.user.id,
      userName: participant.user.name,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      timezone,
      missedDays: dayOutcomes,
      totalPenalty: Number(
        totalPenalty.toFixed(2)
      ),
      eliminated,
    });
  }

  return {
    dryRun,
    participantsChecked:
      participants.length,
    participantsAffected:
      outcomes.length,
    daysPenalised: outcomes.reduce(
      (n, o) => n + o.missedDays.length,
      0
    ),
    totalPenalty: Number(
      outcomes
        .reduce(
          (n, o) => n + o.totalPenalty,
          0
        )
        .toFixed(2)
    ),
    outcomes,
  };
}
