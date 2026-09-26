import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

/** Guards against typos turning into six figure deposits. */
const MAX_DEPOSIT = 100000;

/**
 * The signed in user's wallet, their money currently at stake, and
 * their transaction history. Always scoped to req.userId.
 */
export const getWallet = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;

    const wallet =
      await prisma.wallet.findUnique({
        where: { userId },
      });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    const transactions =
      await prisma.walletTransaction.findMany(
        {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            amount: true,
            type: true,
            description: true,
            createdAt: true,
          },
        }
      );

    // Money committed to challenges that are still running.
    const active =
      await prisma.challengeParticipant.findMany(
        {
          where: {
            userId,
            eliminated: false,
            challenge: {
              completed: false,
            },
          },
          select: { currentStake: true },
        }
      );

    const atStake = active.reduce(
      (sum, p) => sum + p.currentStake,
      0
    );

    return res.status(200).json({
      wallet,
      atStake,
      transactions,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const depositMoney = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const amount = Number(
      req.body?.amount
    );

    // Previously unvalidated: a negative amount drained the balance.
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message:
          "Enter an amount greater than zero",
      });
    }

    if (amount > MAX_DEPOSIT) {
      return res.status(400).json({
        message: `You can add at most ${MAX_DEPOSIT} at a time`,
      });
    }

    // Round to paise so floating point noise cannot creep into balances.
    const value =
      Math.round(amount * 100) / 100;

    const wallet =
      await prisma.wallet.findUnique({
        where: { userId: req.userId },
      });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    // The credit and its ledger entry must both land, or neither.
    const updatedWallet =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: {
                  increment: value,
                },
                totalDeposit: {
                  increment: value,
                },
              },
            });

          await tx.walletTransaction.create(
            {
              data: {
                userId: req.userId!,
                amount: value,
                type: "DEPOSIT",
                description:
                  "Added to wallet",
              },
            }
          );

          return updated;
        }
      );

    return res.status(200).json({
      message: "Money added successfully",
      wallet: updatedWallet,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
