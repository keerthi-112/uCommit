import { Request, Response } from "express";
import prisma from "../prisma/client";

import {
  dayKey,
  todayKey,
  daysBetween,
  previousDayKey,
} from "../utils/time";

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * The signed in user's dashboard.
 *
 * Every figure here is computed from their own rows, in their own
 * timezone. Definitions are fixed here rather than left to the UI, so
 * the same number means the same thing everywhere:
 *
 *   activeDay      - a day with at least one APPROVED submission.
 *                    Pending and rejected proof does not count, because
 *                    an unreviewed proof is not yet evidence of
 *                    anything.
 *
 *   currentStreak  - consecutive active days ending today or yesterday.
 *                    Yesterday still counts, so the streak does not
 *                    appear to break before today is over.
 *
 *   longestStreak  - the longest run of consecutive active days ever.
 *
 *   consistency    - approved days divided by the days the user has
 *                    been expected to show up, across all their
 *                    participations, capped at 100. Null when nothing
 *                    has been expected yet, rather than a made up 0.
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;

    const [
      user,
      wallet,
      participations,
      rewards,
      submissions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      }),

      prisma.wallet.findUnique({
        where: { userId },
      }),

      prisma.challengeParticipant.findMany(
        {
          where: { userId },
          include: { challenge: true },
        }
      ),

      prisma.challengePayout.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      prisma.dailySubmission.findMany({
        where: { userId },
        select: {
          submittedAt: true,
          approved: true,
        },
        orderBy: { submittedAt: "asc" },
      }),
    ]);

    const timezone =
      user?.timezone ?? "UTC";

    const today = todayKey(timezone);

    // ---- Daily activity ----------------------------------------
    const activity = new Map<
      string,
      number
    >();

    for (const s of submissions) {
      if (s.approved !== true) continue;

      const key = dayKey(
        s.submittedAt,
        timezone
      );

      activity.set(
        key,
        (activity.get(key) ?? 0) + 1
      );
    }

    const activeDays = [
      ...activity.keys(),
    ].sort();

    // ---- Streaks -----------------------------------------------
    let longestStreak = 0;
    let run = 0;

    for (
      let i = 0;
      i < activeDays.length;
      i++
    ) {
      run =
        i > 0 &&
        daysBetween(
          activeDays[i - 1],
          activeDays[i]
        ) === 1
          ? run + 1
          : 1;

      if (run > longestStreak)
        longestStreak = run;
    }

    // A streak is only "current" if it reaches today or yesterday.
    let currentStreak = 0;

    if (activeDays.length > 0) {
      const last =
        activeDays[
          activeDays.length - 1
        ];

      if (
        last === today ||
        last === previousDayKey(today)
      ) {
        currentStreak = 1;

        for (
          let i = activeDays.length - 2;
          i >= 0;
          i--
        ) {
          if (
            daysBetween(
              activeDays[i],
              activeDays[i + 1]
            ) !== 1
          )
            break;

          currentStreak++;
        }
      }
    }

    // ---- Expected days, for consistency ------------------------
    let expectedDays = 0;

    for (const p of participations) {
      const challengeStart = dayKey(
        p.challenge.startDate,
        timezone
      );

      const joined = dayKey(
        p.joinedAt,
        timezone
      );

      const from =
        joined > challengeStart
          ? joined
          : challengeStart;

      const challengeEnd = dayKey(
        p.challenge.endDate,
        timezone
      );

      const until =
        challengeEnd < today
          ? challengeEnd
          : today;

      const elapsed = daysBetween(
        from,
        until
      );

      if (elapsed > 0)
        expectedDays += elapsed;
    }

    const approvedDays =
      activeDays.length;

    const consistency =
      expectedDays > 0
        ? Math.min(
            100,
            Math.round(
              (approvedDays /
                expectedDays) *
                100
            )
          )
        : null;

    // ---- Challenge counts --------------------------------------
    const now = Date.now();

    const activeChallenges =
      participations.filter(
        (p) =>
          !p.eliminated &&
          !p.challenge.completed &&
          p.challenge.endDate.getTime() >
            now
      ).length;

    const completedChallenges =
      participations.filter(
        (p) => p.challenge.completed
      ).length;

    const eliminatedChallenges =
      participations.filter(
        (p) => p.eliminated
      ).length;

    return res.status(200).json({
      wallet,
      challenges: participations,
      rewards,
      timezone,

      stats: {
        currentStreak,
        longestStreak,
        approvedDays,
        expectedDays,
        consistency,
        activeChallenges,
        completedChallenges,
        eliminatedChallenges,
        totalSubmissions:
          submissions.length,
        pendingSubmissions:
          submissions.filter(
            (s) => s.approved === null
          ).length,
      },

      // [{ date: "2026-09-26", count: 2 }] - approved proof per day.
      activity: [...activity.entries()]
        .map(([date, count]) => ({
          date,
          count,
        }))
        .sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
