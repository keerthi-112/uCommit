import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Thrown inside the join transaction to abort it with a specific
 * HTTP status. Throwing rolls the whole transaction back, so the
 * wallet is never debited unless the participant row is created too.
 */
class JoinError extends Error {
  status: number;

  constructor(
    status: number,
    message: string
  ) {
    super(message);
    this.status = status;
  }
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
        include: {
          _count: {
            select: {
              participants: true,
            },
          },
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
  const challengeId = req.params
    .id as string;

  const userId = req.userId!;

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const challenge =
            await tx.challenge.findUnique(
              {
                where: {
                  id: challengeId,
                },
              }
            );

          if (!challenge) {
            throw new JoinError(
              404,
              "Challenge not found"
            );
          }

          if (challenge.completed) {
            throw new JoinError(
              400,
              "This challenge has already been completed"
            );
          }

          if (!challenge.isActive) {
            throw new JoinError(
              400,
              "This challenge is no longer open to join"
            );
          }

          if (
            challenge.endDate.getTime() <=
            Date.now()
          ) {
            throw new JoinError(
              400,
              "This challenge has already ended"
            );
          }

          const existingParticipant =
            await tx.challengeParticipant.findUnique(
              {
                where: {
                  userId_challengeId: {
                    userId,
                    challengeId,
                  },
                },
              }
            );

          if (existingParticipant) {
            throw new JoinError(
              409,
              "You have already joined this challenge"
            );
          }

          const wallet =
            await tx.wallet.findUnique({
              where: {
                userId,
              },
            });

          if (!wallet) {
            throw new JoinError(
              404,
              "Wallet not found"
            );
          }

          if (
            wallet.balance <
            challenge.entryFee
          ) {
            throw new JoinError(
              400,
              "Insufficient wallet balance"
            );
          }

          // Conditional debit: the balance check lives in the WHERE
          // clause, so two concurrent joins can never both push the
          // balance negative. count === 0 means another request spent
          // the money between our read and this write.
          const debited =
            await tx.wallet.updateMany({
              where: {
                id: wallet.id,
                balance: {
                  gte: challenge.entryFee,
                },
              },
              data: {
                balance: {
                  decrement:
                    challenge.entryFee,
                },
              },
            });

          if (debited.count === 0) {
            throw new JoinError(
              400,
              "Insufficient wallet balance"
            );
          }

          const participant =
            await tx.challengeParticipant.create(
              {
                data: {
                  userId,
                  challengeId,

                  currentStake:
                    challenge.entryFee,
                },
              }
            );

          // Audit trail for money leaving the wallet.
          // Debits are recorded as negative amounts.
          await tx.walletTransaction.create(
            {
              data: {
                userId,

                amount:
                  -challenge.entryFee,

                type: "CHALLENGE_STAKE",

                description:
                  "Stake for challenge: " +
                  challenge.title,
              },
            }
          );

          const updatedWallet =
            await tx.wallet.findUnique({
              where: {
                id: wallet.id,
              },
            });

          return {
            participant,
            wallet: updatedWallet,
          };
        }
      );

    return res.status(201).json({
      message:
        "Joined challenge successfully",

      participant: result.participant,

      wallet: result.wallet,
    });
  } catch (error) {
    if (error instanceof JoinError) {
      return res
        .status(error.status)
        .json({
          message: error.message,
        });
    }

    // Unique constraint on (userId, challengeId): a concurrent request
    // won the race. The transaction rolled back, so no money was taken.
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message:
          "You have already joined this challenge",
      });
    }

    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getMyChallenges = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const participants =
      await prisma.challengeParticipant.findMany({
        where: {
          userId: req.userId,
        },
        include: {
          challenge: true,
        },
      });

    return res.status(200).json({
      challenges: participants,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getLeaderboard = async (
  req: Request,
  res: Response
) => {
  try {
    const challengeId = req.params
      .id as string;

    const leaderboard =
      await prisma.challengeParticipant.findMany({
        where: {
          challengeId,
        },
        orderBy: {
          currentStake: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return res.status(200).json({
      leaderboard,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getChallengeStats = async (
  req: Request,
  res: Response
) => {
  try {
    const challengeId = req.params
      .id as string;

    const participants =
      await prisma.challengeParticipant.findMany({
        where: {
          challengeId,
        },
      });

    const challenge =
      await prisma.challenge.findUnique({
        where: {
          id: challengeId,
        },
      });

    const totalParticipants =
      participants.length;

    const activeParticipants =
      participants.filter(
        (p) => !p.eliminated
      ).length;

    const eliminatedParticipants =
      participants.filter(
        (p) => p.eliminated
      ).length;

    const rewardPool =
      participants.reduce(
        (sum, p) => sum + p.currentStake,
        0
      );

    return res.status(200).json({
      challengeTitle: challenge?.title,
      totalParticipants,
      activeParticipants,
      eliminatedParticipants,
      rewardPool,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
