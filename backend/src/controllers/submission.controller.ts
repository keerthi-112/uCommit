import { Request, Response } from "express";
import prisma from "../prisma/client";

import {
  todayKey,
  dayKey,
  queryFloor,
  queryCeiling,
} from "../utils/time";

interface AuthRequest extends Request {
  userId?: string;
}

export const submitProof = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const challengeId = req.params.id as string;

    const { proofUrl } = req.body;

    const participant =
      await prisma.challengeParticipant.findFirst({
        where: {
          userId: req.userId,
          challengeId,
        },
      });

    if (!participant) {
      return res.status(400).json({
        message: "Join challenge first",
      });
    }

    if (participant.eliminated) {
      return res.status(400).json({
        message:
          "You have been eliminated from this challenge",
      });
    }

    const challenge =
      await prisma.challenge.findUnique({
        where: {
          id: challengeId,
        },
      });

    if (!challenge) {
      return res.status(404).json({
        message: "Challenge not found",
      });
    }

    if (challenge.completed) {
      return res.status(400).json({
        message:
          "This challenge has already been completed",
      });
    }

    if (
      challenge.startDate.getTime() >
      Date.now()
    ) {
      return res.status(400).json({
        message:
          "This challenge has not started yet",
      });
    }

    if (
      challenge.endDate.getTime() <=
      Date.now()
    ) {
      return res.status(400).json({
        message:
          "This challenge has already ended",
      });
    }

    if (
      typeof proofUrl !== "string" ||
      proofUrl.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "Proof is required to submit",
      });
    }

    // "Today" is the user's own calendar day, not the server's. The
    // close-out job uses the same rule, so a day accepted here is never
    // later counted as missed.
    const user =
      await prisma.user.findUnique({
        where: { id: req.userId },
        select: { timezone: true },
      });

    const timezone =
      user?.timezone ?? "UTC";

    const today = todayKey(timezone);

    // Narrow by timestamp, then decide membership by day key - a wide
    // window so no timezone can fall outside it.
    const nearby =
      await prisma.dailySubmission.findMany(
        {
          where: {
            userId: req.userId,
            challengeId,
            submittedAt: {
              gte: queryFloor(today),
              lte: queryCeiling(today),
            },
          },
          select: { submittedAt: true },
        }
      );

    const existingSubmission =
      nearby.find(
        (s) =>
          dayKey(
            s.submittedAt,
            timezone
          ) === today
      );

    if (existingSubmission) {
      return res.status(400).json({
        message:
          "Already submitted today",
      });
    }

    const submission =
      await prisma.dailySubmission.create({
        data: {
          userId: req.userId!,
          challengeId,
          proofUrl: proofUrl.trim(),
          approved: null,
        },
      });

    return res.status(201).json({
      message: "Proof submitted",
      submission,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
      error,
    });
  }
};

/**
 * A user's own submissions for one challenge.
 * Always scoped to req.userId, so it can never expose
 * another participant's proof history.
 */
export const getMySubmissions = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const challengeId = req.params
      .id as string;

    const submissions =
      await prisma.dailySubmission.findMany({
        where: {
          userId: req.userId,
          challengeId,
        },
        orderBy: {
          submittedAt: "desc",
        },
        select: {
          id: true,
          proofUrl: true,
          submittedAt: true,
          approved: true,
        },
      });

    const approvedCount =
      submissions.filter(
        (s) => s.approved === true
      ).length;

    const pendingCount =
      submissions.filter(
        (s) => s.approved === null
      ).length;

    return res.status(200).json({
      submissions,
      approvedCount,
      pendingCount,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getPendingSubmissions =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const submissions =
        await prisma.dailySubmission.findMany({
          where: {
            approved: null,
          },
          include: {
            // Explicit select: never leak passwordHash to the client.
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            challenge: true,
          },
          orderBy: {
            submittedAt: "desc",
          },
        });

      return res.status(200).json({
        submissions,
      });

    } catch (error) {
      console.log(error);

      return res.status(500).json({
        message: "Server Error",
      });
    }
  };

export const approveSubmission = async (
  req: Request,
  res: Response
) => {
  try {
    const submissionId =
      req.params.id as string;

    const existing =
      await prisma.dailySubmission.findUnique({
        where: {
          id: submissionId,
        },
      });

    if (!existing) {
      return res.status(404).json({
        message:
          "Submission not found",
      });
    }

    if (existing.approved !== null) {
      return res.status(400).json({
        message:
          "Submission already reviewed",
      });
    }

    const submission =
      await prisma.dailySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          approved: true,
        },
      });

    return res.status(200).json({
      message:
        "Submission approved",
      submission,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const rejectSubmission = async (
  req: Request,
  res: Response
) => {
  try {
    const submissionId =
      req.params.id as string;

    const existing =
      await prisma.dailySubmission.findUnique({
        where: {
          id: submissionId,
        },
      });

    if (!existing) {
      return res.status(404).json({
        message:
          "Submission not found",
      });
    }

    if (existing.approved !== null) {
      return res.status(400).json({
        message:
          "Submission already reviewed",
      });
    }

    const submission =
      await prisma.dailySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          approved: false,
        },
        include: {
          challenge: true,
          user: true,
        },
      });

    const participant =
      await prisma.challengeParticipant.findFirst({
        where: {
          userId:
            submission.userId,

          challengeId:
            submission.challengeId,
        },
      });

    if (!participant) {
      return res.status(404).json({
        message:
          "Participant not found",
      });
    }

    const penaltyAmount =
      (
        participant.currentStake *
        submission.challenge
          .penaltyPercentage
      ) / 100;

    const updatedParticipant =
      await prisma.challengeParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          misses:
            participant.misses + 1,

          currentStake:
            participant.currentStake -
            penaltyAmount,

          eliminated:
            participant.misses + 1 >
            submission.challenge
              .maxMisses,
        },
      });

    return res.status(200).json({
      message:
        "Submission rejected",

      participant:
        updatedParticipant,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};