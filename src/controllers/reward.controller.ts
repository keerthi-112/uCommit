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

await prisma.challenge.update({
  where: {
    id: challengeId,
  },
  data: {
    rewardPool,
    completed: true,
  },
});

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

return res.status(200).json({
  message:
    "Challenge completed successfully",

  totalPenalties,
  platformFee,
  rewardPool,
});

} catch (error) {
console.log(error);

return res.status(500).json({
  message: "Server Error",
});

}
};