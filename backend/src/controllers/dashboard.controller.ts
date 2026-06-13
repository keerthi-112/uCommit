import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

export const getDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;

    const wallet =
      await prisma.wallet.findUnique({
        where: { userId },
      });

    const challenges =
      await prisma.challengeParticipant.findMany({
        where: { userId },
        include: {
          challenge: true,
        },
      });

    const rewards =
      await prisma.challengePayout.findMany({
        where: { userId },
      });

    return res.status(200).json({
      wallet,
      challenges,
      rewards,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};