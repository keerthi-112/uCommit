import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

const DAY_MS = 86400000;

/** Midnight at the start of the day containing `d`, server local time. */
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * A day key in LOCAL time.
 *
 * Deliberately not toISOString().slice(0, 10): that converts to UTC, so
 * east of Greenwich local midnight lands on the previous UTC date and
 * every key shifts back a day, breaking comparisons against today.
 */
function toKey(d: Date): string {
  const day = startOfDay(d);

  const month = String(
    day.getMonth() + 1
  ).padStart(2, "0");

  const date = String(
    day.getDate()
  ).padStart(2, "0");

  return `${day.getFullYear()}-${month}-${date}`;
}

/**
 * The signed in user's dashboard.
 *
 * Every figure here is computed from their own rows. Definitions are
 * fixed here rather than left to the UI, so the same number means the
 * same thing everywhere:
 *
 *   activeDay      - a day with at least one APPROVED submission.
 *                    Pending and rejected proof does not count, because
 *                    an unreviewed proof is not yet evidence of anything.
 *
 *   currentStreak  - consecutive active days ending today or yesterday.
 *                    Yesterday still counts so the streak does not
 *                    appear to break before today is over.
 *
 *   longestStreak  - the longest run of consecutive active days ever.
 *
 *   consistency    - approved days divided by the days the user has been
 *                    expected to show up, across all their
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
      wallet,
      participations,
      rewards,
      submissions,
    ] = await Promise.all([
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

    // ---- Daily activity ----------------------------------------
    // One entry per day, counting approved submissions on that day.
    const activity = new Map<
      string,
      number
    >();

    for (const s of submissions) {
      if (s.approved !== true) continue;

      const key = toKey(s.submittedAt);

      activity.set(
        key,
        (activity.get(key) ?? 0) + 1
      );
    }

    const activeDayKeys = [
      ...activity.keys(),
    ].sort();

    // ---- Streaks -----------------------------------------------
    let longestStreak = 0;
    let run = 0;
    let previous: number | null = null;

    for (const key of activeDayKeys) {
      const time = new Date(
        key + "T00:00:00"
      ).getTime();

      run =
        previous !== null &&
        time - previous === DAY_MS
          ? run + 1
          : 1;

      if (run > longestStreak)
        longestStreak = run;

      previous = time;
    }

    // A streak is only "current" if it reaches today or yesterday.
    const today = startOfDay(
      new Date()
    ).getTime();

    let currentStreak = 0;

    if (activeDayKeys.length > 0) {
      const last = new Date(
        activeDayKeys[
          activeDayKeys.length - 1
        ] + "T00:00:00"
      ).getTime();

      if (
        last === today ||
        last === today - DAY_MS
      ) {
        currentStreak = 1;

        let cursor = last;

        for (
          let i =
            activeDayKeys.length - 2;
          i >= 0;
          i--
        ) {
          const time = new Date(
            activeDayKeys[i] +
              "T00:00:00"
          ).getTime();

          if (cursor - time !== DAY_MS)
            break;

          currentStreak++;
          cursor = time;
        }
      }
    }

    // ---- Expected days, for consistency ------------------------
    // Days elapsed since joining each challenge, bounded by its end.
    let expectedDays = 0;

    for (const p of participations) {
      const from = startOfDay(
        p.joinedAt >
        p.challenge.startDate
          ? p.joinedAt
          : p.challenge.startDate
      ).getTime();

      const challengeEnd = startOfDay(
        p.challenge.endDate
      ).getTime();

      const until = Math.min(
        challengeEnd,
        today
      );

      if (until > from) {
        expectedDays +=
          (until - from) / DAY_MS;
      }
    }

    const approvedDays =
      activeDayKeys.length;

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

      stats: {
        currentStreak,
        longestStreak,
        approvedDays,
        expectedDays: Math.round(
          expectedDays
        ),
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

      // [{ date: "2026-09-25", count: 2 }] - approved submissions per day.
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
