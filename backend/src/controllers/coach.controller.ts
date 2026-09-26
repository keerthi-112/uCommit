import { Request, Response } from "express";
import prisma from "../prisma/client";

import {
  dayKey,
  todayKey,
  daysBetween,
  previousDayKey,
} from "../utils/time";

import {
  generateCoachMessage,
  isCoachConfigured,
  CoachFacts,
} from "../services/ai/coach";

interface AuthRequest extends Request {
  userId?: string;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Weekday name for a day key, without reintroducing server local time. */
function weekdayOf(key: string): string {
  return WEEKDAYS[
    new Date(
      key + "T12:00:00Z"
    ).getUTCDay()
  ];
}

/**
 * Builds the coach's view of one user and asks for a reflection.
 *
 * Every number handed to the model is computed here, from that user's
 * own rows, in that user's own timezone. The model is asked to describe
 * them, never to derive them.
 */
export const getCoachMessage = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;

    const [
      user,
      participations,
      submissions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          timezone: true,
        },
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
        orderBy: { submittedAt: "asc" },
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const timezone =
      user.timezone ?? "UTC";

    const today = todayKey(timezone);

    // ---- Approved days ------------------------------------------
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

      const key = dayKey(
        s.submittedAt,
        timezone
      );

      approvedKeys.add(key);
      byWeekday[weekdayOf(key)] += 1;
    }

    const activeDays = [
      ...approvedKeys,
    ].sort();

    // ---- Streaks -------------------------------------------------
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

    // ---- Per challenge -------------------------------------------
    let expectedDays = 0;

    const challenges =
      participations.map((p) => {
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

        const elapsed = Math.max(
          0,
          daysBetween(from, until)
        );

        expectedDays += elapsed;

        return {
          title: p.challenge.title,
          misses: p.misses,
          maxMisses:
            p.challenge.maxMisses,
          daysElapsed: elapsed,
          totalDays: Math.max(
            1,
            daysBetween(
              challengeStart,
              challengeEnd
            )
          ),
          approvedDays:
            submissions.filter(
              (s) =>
                s.challengeId ===
                  p.challengeId &&
                s.approved === true
            ).length,
        };
      });

    const approvedDays =
      activeDays.length;

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
