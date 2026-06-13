import { Request, Response } from "express";
import prisma from "../prisma/client";

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

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const existingSubmission =
      await prisma.dailySubmission.findFirst({
        where: {
          userId: req.userId,
          challengeId,
          submittedAt: {
            gte: today,
          },
        },
      });

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
          proofUrl,
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
            user: true,
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