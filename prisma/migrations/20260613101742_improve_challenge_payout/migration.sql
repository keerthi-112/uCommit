/*
  Warnings:

  - Added the required column `rewardAmount` to the `ChallengePayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stakeRefund` to the `ChallengePayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChallengePayout" ADD COLUMN     "rewardAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "stakeRefund" DOUBLE PRECISION NOT NULL;
