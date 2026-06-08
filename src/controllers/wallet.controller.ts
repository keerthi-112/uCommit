import { Request, Response } from "express";
import prisma from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

export const depositMoney = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const amount = Number(req.body.amount);

    const wallet =
      await prisma.wallet.findUnique({
        where: {
          userId: req.userId,
        },
      });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found",
      });
    }

    const updatedWallet =
      await prisma.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: wallet.balance + amount,
          totalDeposit:
            wallet.totalDeposit + amount,
        },
      });

    return res.status(200).json({
      message:
        "Money added successfully",
      wallet: updatedWallet,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};