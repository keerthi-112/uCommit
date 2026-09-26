import { Request, Response } from "express";
import prisma from "../prisma/client";

/**
 * Closing a challenge and paying everyone out.
 *
 * The money has to balance. Every rupee that came in as an entry fee
 * leaves again as exactly one of: a stake refund, a tier reward, or the
 * platform fee. Two leaks used to break that:
 *
 *   1. An eliminated participant's remaining stake went nowhere. It was
 *      not refunded to them and not added to the pool - it simply
 *      stopped being accounted for.
 *
 *   2. Tiers were matched on misses 0, 1 and 2 exactly. On a challenge
 *      allowing 3 misses, somebody sitting on 3 was neither eliminated
 *      nor in any tier, so they were refunded nothing at all.
 *
 * How it works now:
 *
 *   - Anyone not eliminated is a finisher and always gets their
 *     remaining stake back, whatever their miss count.
 *   - Finishers are tiered by misses: 0 gold, 1 silver, 2 or more
 *     bronze. Every finisher lands in exactly one tier.
 *   - Eliminated participants forfeit what is left of their stake into
 *     the pool. That is the accountability model working as documented:
 *     money moves from the people who stopped showing up to the people
 *     who did not.
 *   - The pool is penalties already taken plus those forfeited stakes.
 *     The platform takes 10% of it; the rest is split 70/20/10 across
 *     the tiers, with an empty tier's share flowing to the next.
 *
 * The whole payout runs in one transaction, so a failure part way
 * through cannot leave some people paid and others not.
 */

const PLATFORM_FEE_RATE = 0.1;

export const completeChallenge = async (
  req: Request,
  res: Response
) => {
  try {
    const challengeId = req.params
      .id as string;

    const challenge =
      await prisma.challenge.findUnique({
        where: { id: challengeId },
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

    if (
      challenge.endDate.getTime() >
      Date.now()
    ) {
      return res.status(400).json({
        message:
          "This challenge has not ended yet",
      });
    }

    const participants =
      await prisma.challengeParticipant.findMany(
        {
          where: { challengeId },
        }
      );

    if (participants.length === 0) {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { completed: true },
      });

      return res.status(200).json({
        message:
          "Challenge completed. Nobody had joined.",
        participants: 0,
      });
    }

    // ---- The pool ------------------------------------------------
    const penaltiesTaken =
      participants.reduce(
        (sum, p) =>
          sum +
          (challenge.entryFee -
            p.currentStake),
        0
      );

    const eliminated =
      participants.filter(
        (p) => p.eliminated
      );

    const finishers =
      participants.filter(
        (p) => !p.eliminated
      );

    const forfeited = eliminated.reduce(
      (sum, p) => sum + p.currentStake,
      0
    );

    const distributable =
      penaltiesTaken + forfeited;

    const platformFee =
      distributable * PLATFORM_FEE_RATE;

    const rewardPool =
      distributable - platformFee;

    // ---- Tiers ---------------------------------------------------
    // 2 or more misses, so every finisher belongs somewhere.
    const gold = finishers.filter(
      (p) => p.misses === 0
    );

    const silver = finishers.filter(
      (p) => p.misses === 1
    );

    const bronze = finishers.filter(
      (p) => p.misses >= 2
    );

    let goldPool = rewardPool * 0.7;
    let silverPool = rewardPool * 0.2;
    let bronzePool = rewardPool * 0.1;

    // An empty tier's share flows down, then up, so nothing is stranded.
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

    if (silver.length === 0) {
      goldPool += silverPool;
      silverPool = 0;
    }

    // If nobody finished at all, the pool has nowhere to go but the
    // platform - recorded explicitly rather than quietly dropped.
    const unclaimed =
      finishers.length === 0
        ? rewardPool
        : 0;

    const rewardFor = (
      tier: "GOLD" | "SILVER" | "BRONZE"
    ) => {
      if (tier === "GOLD")
        return gold.length > 0
          ? goldPool / gold.length
          : 0;

      if (tier === "SILVER")
        return silver.length > 0
          ? silverPool / silver.length
          : 0;

      return bronze.length > 0
        ? bronzePool / bronze.length
        : 0;
    };

    const round = (n: number) =>
      Math.round(n * 100) / 100;

    // ---- Write it all, or none of it -----------------------------
    const summary = await prisma.$transaction(
      async (tx) => {
        let paidOut = 0;

        const payTier = async (
          rows: typeof participants,
          tier:
            | "GOLD"
            | "SILVER"
            | "BRONZE"
        ) => {
          const reward = rewardFor(tier);

          for (const participant of rows) {
            const stakeRefund = round(
              participant.currentStake
            );

            const rewardAmount =
              round(reward);

            const total =
              stakeRefund + rewardAmount;

            paidOut += total;

            await tx.wallet.updateMany({
              where: {
                userId:
                  participant.userId,
              },
              data: {
                balance: {
                  increment: total,
                },
                totalRewards: {
                  increment: rewardAmount,
                },
              },
            });

            await tx.walletTransaction.create(
              {
                data: {
                  userId:
                    participant.userId,
                  amount: stakeRefund,
                  type: "STAKE_REFUND",
                  description: `Stake returned from ${challenge.title}`,
                },
              }
            );

            if (rewardAmount > 0) {
              await tx.walletTransaction.create(
                {
                  data: {
                    userId:
                      participant.userId,
                    amount: rewardAmount,
                    type: "CHALLENGE_REWARD",
                    description: `${tier} tier reward from ${challenge.title}`,
                  },
                }
              );
            }

            await tx.challengePayout.create(
              {
                data: {
                  challengeId,
                  userId:
                    participant.userId,
                  stakeRefund,
                  rewardAmount,
                  amount: total,
                  tier,
                },
              }
            );
          }
        };

        await payTier(gold, "GOLD");
        await payTier(silver, "SILVER");
        await payTier(bronze, "BRONZE");

        // Eliminated participants receive nothing, but the outcome is
        // recorded so the payout history is complete.
        for (const participant of eliminated) {
          await tx.challengePayout.create(
            {
              data: {
                challengeId,
                userId:
                  participant.userId,
                stakeRefund: 0,
                rewardAmount: 0,
                amount: 0,
                tier: "ELIMINATED",
              },
            }
          );
        }

        const platformTotal = round(
          platformFee + unclaimed
        );

        // Create the platform wallet if it is missing, rather than
        // silently discarding the fee as before.
        const platformWallet =
          await tx.platformWallet.findFirst();

        if (platformWallet) {
          await tx.platformWallet.update({
            where: {
              id: platformWallet.id,
            },
            data: {
              balance: {
                increment: platformTotal,
              },
              totalRevenue: {
                increment: platformTotal,
              },
            },
          });
        } else {
          await tx.platformWallet.create({
            data: {
              balance: platformTotal,
              totalRevenue: platformTotal,
            },
          });
        }

        await tx.challenge.update({
          where: { id: challengeId },
          data: {
            rewardPool: round(rewardPool),
            completed: true,
          },
        });

        return {
          paidOut: round(paidOut),
          platformTotal,
        };
      }
    );

    const collected = round(
      challenge.entryFee *
        participants.length
    );

    const distributed = round(
      summary.paidOut +
        summary.platformTotal
    );

    return res.status(200).json({
      message:
        "Challenge completed successfully",

      participants: participants.length,
      finishers: finishers.length,
      eliminated: eliminated.length,

      penaltiesTaken: round(
        penaltiesTaken
      ),
      forfeitedStakes: round(forfeited),
      platformFee: summary.platformTotal,
      rewardPool: round(rewardPool),

      goldUsers: gold.length,
      silverUsers: silver.length,
      bronzeUsers: bronze.length,

      goldReward: round(
        rewardFor("GOLD")
      ),
      silverReward: round(
        rewardFor("SILVER")
      ),
      bronzeReward: round(
        rewardFor("BRONZE")
      ),

      // Everything in must equal everything out.
      accounting: {
        collected,
        distributed,
        balanced:
          Math.abs(
            collected - distributed
          ) < 0.05,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
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
      await prisma.challengePayout.findMany(
        {
          where: { userId },
          orderBy: { createdAt: "desc" },
        }
      );

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
