import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

export const createChallenge = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      title,
      description,
      entryFee,
      penaltyPercentage,
      maxMisses,
      startDate,
      endDate,
    } = req.body;

    const challenge =
      await prisma.challenge.create({
        data: {
          title,
          description,
          entryFee,
          penaltyPercentage,
          maxMisses,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

    return res.status(201).json({
      challenge,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getChallenges = async (
  req: Request,
  res: Response
) => {
  try {
    const challenges =
      await prisma.challenge.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      challenges,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const joinChallenge = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const challengeId = req.params.id as string;

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

    const wallet =
      await prisma.wallet.findUnique({
        where: {
          userId: req.userId!,
        },
      });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    if (
      wallet.balance <
      challenge.entryFee
    ) {
      return res.status(400).json({
        message:
          "Insufficient wallet balance",
      });
    }

    const existingParticipant =
      await prisma.challengeParticipant.findFirst(
        {
          where: {
            userId: req.userId!,
            challengeId,
          },
        }
      );

    if (existingParticipant) {
      return res.status(400).json({
        message:
          "Already joined challenge",
      });
    }

    await prisma.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance:
          wallet.balance -
          challenge.entryFee,
      },
    });

    const participant =
      await prisma.challengeParticipant.create(
        {
          data: {
            userId: req.userId!,
            challengeId,

            currentStake:
              challenge.entryFee,
          },
        }
      );

    return res.status(201).json({
      message:
        "Joined challenge successfully",
      participant,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};