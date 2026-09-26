-- CreateTable
CREATE TABLE "MissedDay" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "penaltyAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissedDay_participantId_date_key" ON "MissedDay"("participantId", "date");

-- AddForeignKey
ALTER TABLE "MissedDay" ADD CONSTRAINT "MissedDay_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ChallengeParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
