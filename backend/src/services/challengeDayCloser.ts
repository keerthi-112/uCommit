/**
 * Closing out missed days.
 *
 * Until now a miss was only ever recorded when an admin actively
 * rejected a proof. Someone who simply stopped submitting was never
 * penalised and never eliminated, which is the exact behaviour uCommit
 * exists to prevent. This closes that gap.
 *
 * A day counts as missed when all of the following hold:
 *   - the day has fully elapsed (today is never judged, it is not over)
 *   - it falls inside the challenge window
 *   - it is on or after the day the participant joined
 *   - they submitted nothing at all that day
 *
 * A day where they submitted and were rejected is NOT counted here.
 * That miss was already applied when the reviewer rejected it, and
 * double counting it would take the penalty twice.
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
 *
 * Days are bounded by server local time, the same way "already
 * submitted today" is decided in submission.controller.ts. If uCommit
 * ever serves users across timezones this needs revisiting in both
 * places together.
 */

import prisma from "../prisma/client";

/** Midnight at the start of the day containing `d`, server local time. */
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
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
  missedDays: MissedDayOutcome[];
  totalPenalty: number;
  eliminated: boolean;
}

export interface CloseResult {
  dryRun: boolean;
  /** Day boundary used; days on or after this were not judged. */
  judgedUpTo: string;
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

  // Today is still in progress, so the last judgeable day is yesterday.
  const cutoff = startOfDay(now);

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

    // Start from the later of the challenge opening and them joining,
    // so nobody is punished for days before they committed.
    const firstDay = startOfDay(
      participant.joinedAt >
        challenge.startDate
        ? participant.joinedAt
        : challenge.startDate
    );

    // Stop at whichever comes first: the challenge ending, or yesterday.
    const challengeEnd = startOfDay(
      challenge.endDate
    );

    const lastDay =
      challengeEnd < cutoff
        ? challengeEnd
        : cutoff;

    if (firstDay >= lastDay) continue;

    const submissions =
      await prisma.dailySubmission.findMany(
        {
          where: {
            userId: participant.userId,
            challengeId:
              participant.challengeId,
            submittedAt: {
              gte: firstDay,
              lt: lastDay,
            },
          },
          select: { submittedAt: true },
        }
      );

    const daysWithSubmission = new Set(
      submissions.map((s) =>
        startOfDay(
          s.submittedAt
        ).getTime()
      )
    );

    const alreadyPenalised = new Set(
      participant.missedDays.map((m) =>
        startOfDay(m.date).getTime()
      )
    );

    // Walk the elapsed days in order. Order matters: penalties compound
    // on the remaining stake, so the sequence changes the amounts.
    const missed: Date[] = [];

    for (
      let day = firstDay;
      day < lastDay;
      day = addDays(day, 1)
    ) {
      const key = day.getTime();

      if (daysWithSubmission.has(key))
        continue;

      if (alreadyPenalised.has(key))
        continue;

      missed.push(new Date(day));
    }

    if (missed.length === 0) continue;

    // Replay the penalties to work out the result. In a dry run this is
    // the whole job; otherwise it is written inside a transaction below.
    let stake = participant.currentStake;
    let misses = participant.misses;
    let eliminated = false;

    const dayOutcomes: MissedDayOutcome[] =
      [];

    for (const day of missed) {
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
        date: day.toISOString(),
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
                date: new Date(
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
      missedDays: dayOutcomes,
      totalPenalty: Number(
        totalPenalty.toFixed(2)
      ),
      eliminated,
    });
  }

  return {
    dryRun,
    judgedUpTo: cutoff.toISOString(),
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
