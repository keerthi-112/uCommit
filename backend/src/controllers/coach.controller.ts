import { Request, Response } from "express";
import prisma from "../prisma/client";

import {
  generateCoachMessage,
  isCoachConfigured,
  CoachFacts,
} from "../services/ai/coach";

interface AuthRequest extends Request {
  userId?: string;
}

const DAY_MS = 86400000;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * A day key in LOCAL time. Not toISOString(), which shifts to UTC and
 * moves local midnight onto the previous date east of Greenwich.
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
 * Builds the coach's view of one user and asks for a reflection.
 *
 * Every number handed to the model is computed here, from that user's
 * own rows. The model is asked to describe them, never to derive them.
 */
export const getCoachMessage = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;

    const [user, participations, submissions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        }),

        prisma.challengeParticipant.findMany(
          {
            where: { userId },
            include: { challenge: true },
          }
        ),

        prisma.dailySubmission.findMany({
          where: { userId },
          select: {
            submittedAt: true,
            approved: true,
            challengeId: true,
          },
          orderBy: {
            submittedAt: "asc",
          },
        }),
      ]);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ---- approved days, shared by several figures below -------------
    const approvedKeys = new Set<string>();
    const byWeekday: Record<
      string,
      number
    > = {};

    for (const day of WEEKDAYS) {
      byWeekday[day] = 0;
    }

    for (const s of submissions) {
      if (s.approved !== true) continue;

      const day = startOfDay(
        s.submittedAt
      );

      approvedKeys.add(toKey(day));

      byWeekday[
        WEEKDAYS[day.getDay()]
      ] += 1;
    }

    const sortedDays = [
      ...approvedKeys,
    ].sort();

    let longestStreak = 0;
    let run = 0;
    let previous: number | null = null;

    for (const key of sortedDays) {
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

    const today = startOfDay(
      new Date()
    ).getTime();

    let currentStreak = 0;

    if (sortedDays.length > 0) {
      const last = new Date(
        sortedDays[
          sortedDays.length - 1
        ] + "T00:00:00"
      ).getTime();

      if (
        last === today ||
        last === today - DAY_MS
      ) {
        currentStreak = 1;
        let cursor = last;

        for (
          let i = sortedDays.length - 2;
          i >= 0;
          i--
        ) {
          const time = new Date(
            sortedDays[i] + "T00:00:00"
          ).getTime();

          if (cursor - time !== DAY_MS)
            break;

          currentStreak++;
          cursor = time;
        }
      }
    }

    // ---- per challenge ---------------------------------------------
    let expectedDays = 0;

    const challenges =
      participations.map((p) => {
        const from = startOfDay(
          p.joinedAt >
          p.challenge.startDate
            ? p.joinedAt
            : p.challenge.startDate
        ).getTime();

        const end = startOfDay(
          p.challenge.endDate
        ).getTime();

        const until = Math.min(
          end,
          today
        );

        const elapsed =
          until > from
            ? Math.round(
                (until - from) / DAY_MS
              )
            : 0;

        expectedDays += elapsed;

        const start = startOfDay(
          p.challenge.startDate
        ).getTime();

        const totalDays = Math.max(
          1,
          Math.round(
            (end - start) / DAY_MS
          )
        );

        return {
          title: p.challenge.title,
          misses: p.misses,
          maxMisses:
            p.challenge.maxMisses,
          daysElapsed: elapsed,
          totalDays,
          approvedDays: submissions.filter(
            (s) =>
              s.challengeId ===
                p.challengeId &&
              s.approved === true
          ).length,
        };
      });

    const approvedDays =
      sortedDays.length;

    const facts: CoachFacts = {
      name: user.name,
      currentStreak,
      longestStreak,
      approvedDays,
      expectedDays,

      consistency:
        expectedDays > 0
          ? Math.min(
              100,
              Math.round(
                (approvedDays /
                  expectedDays) *
                  100
              )
            )
          : null,

      activeChallenges:
        participations.filter(
          (p) =>
            !p.eliminated &&
            !p.challenge.completed &&
            p.challenge.endDate.getTime() >
              Date.now()
        ).length,

      completedChallenges:
        participations.filter(
          (p) => p.challenge.completed
        ).length,

      eliminatedChallenges:
        participations.filter(
          (p) => p.eliminated
        ).length,

      pendingSubmissions:
        submissions.filter(
          (s) => s.approved === null
        ).length,

      byWeekday,
      challenges,
    };

    const result =
      await generateCoachMessage(facts);

    return res.status(200).json({
      ...result,
      // Returned so the UI can show what the message was based on.
      facts,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

/** Lets the UI hide the coach entirely when no key is configured. */
export const getCoachStatus = (
  _req: Request,
  res: Response
) => {
  return res.status(200).json({
    configured: isCoachConfigured(),
  });
};
