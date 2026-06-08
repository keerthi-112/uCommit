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
          challengeId: challengeId,
        },
      });

    if (!participant) {
      return res.status(400).json({
        message: "Join challenge first",
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