import { Request, Response } from "express";
import prisma from "../prisma/client";

export const completeChallenge = async (
  req: Request,
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

    if (challenge.completed) {
      return res.status(400).json({
        message:
          "Challenge already completed",
      });
    }

    const participants =
      await prisma.challengeParticipant.findMany({
        where: {
          challengeId,
        },
      });

    let totalPenalties = 0;

    for (const participant of participants) {
      totalPenalties +=
        challenge.entryFee -
        participant.currentStake;
    }

    const platformFee =
      totalPenalties * 0.1;

    const rewardPool =
      totalPenalties - platformFee;

    const gold =
      participants.filter(
        (p) =>
          !p.eliminated &&
          p.misses === 0
      );

    const silver =
      participants.filter(
        (p) =>
          !p.eliminated &&
          p.misses === 1
      );

    const bronze =
      participants.filter(
        (p) =>
          !p.eliminated &&
          p.misses === 2
      );

    let goldPool = rewardPool * 0.7;
    let silverPool = rewardPool * 0.2;
    let bronzePool = rewardPool * 0.1;

    if (gold.length === 0) {
      silverPool += goldPool;
      goldPool = 0;
    }

    if (silver.length === 0) {
      bronzePool += silverPool;
      silverPool = 0;
    }

    if (bronze.length === 0) {
      silverPool += bronzePool;
      bronzePool = 0;
    }

    const goldReward =
      gold.length > 0
        ? goldPool / gold.length
        : 0;

    const silverReward =
      silver.length > 0
        ? silverPool / silver.length
        : 0;

    const bronzeReward =
      bronze.length > 0
        ? bronzePool / bronze.length
        : 0;

    const creditParticipant = async (
      participant: any,
      rewardAmount: number,
      tier: string
    ) => {
      const wallet =
        await prisma.wallet.findUnique({
          where: {
            userId:
              participant.userId,
          },
        });

      if (!wallet) return;

      const stakeRefund =
        participant.currentStake;

      const totalPayout =
        stakeRefund +
        rewardAmount;

      await prisma.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance:
            wallet.balance +
            totalPayout,

          totalRewards:
            wallet.totalRewards +
            rewardAmount,
        },
      });

      await prisma.walletTransaction.create({
        data: {
          userId:
            participant.userId,

          amount:
            stakeRefund,

          type:
            "STAKE_REFUND",

          description:
            "Challenge stake refund",
        },
      });

      if (rewardAmount > 0) {
        await prisma.walletTransaction.create({
          data: {
            userId:
              participant.userId,

            amount:
              rewardAmount,

            type:
              "CHALLENGE_REWARD",

            description:
              `${tier} tier reward`,
          },
        });
      }

      await prisma.challengePayout.create({
        data: {
          challengeId,
          userId:
            participant.userId,

          stakeRefund,
          rewardAmount,

          amount:
            totalPayout,

          tier,
        },
      });
    };

    for (const participant of gold) {
      await creditParticipant(
        participant,
        goldReward,
        "GOLD"
      );
    }

    for (const participant of silver) {
      await creditParticipant(
        participant,
        silverReward,
        "SILVER"
      );
    }

    for (const participant of bronze) {
      await creditParticipant(
        participant,
        bronzeReward,
        "BRONZE"
      );
    }

    const platformWallet =
      await prisma.platformWallet.findFirst();

    if (platformWallet) {
      await prisma.platformWallet.update({
        where: {
          id: platformWallet.id,
        },
        data: {
          balance:
            platformWallet.balance +
            platformFee,

          totalRevenue:
            platformWallet.totalRevenue +
            platformFee,
        },
      });
    }

    await prisma.challenge.update({
      where: {
        id: challengeId,
      },
      data: {
        rewardPool,
        completed: true,
      },
    });

    return res.status(200).json({
      message:
        "Challenge completed successfully",

      totalPenalties,
      platformFee,
      rewardPool,

      goldUsers:
        gold.length,

      silverUsers:
        silver.length,

      bronzeUsers:
        bronze.length,

      goldReward,
      silverReward,
      bronzeReward,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message:
        "Server Error",
    });
  }
};

export const getRewardHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    const payouts =
      await prisma.challengePayout.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      payouts,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};