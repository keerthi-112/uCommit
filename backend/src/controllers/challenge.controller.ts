import { Request, Response } from "express";
import prisma from "../prisma/client";

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