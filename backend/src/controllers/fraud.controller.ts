import { Request, Response } from "express";

import { assessParticipants } from "../services/fraud/scoring";

/**
 * The review queue. Admin only - it reports on other people's
 * behaviour, so it must never be reachable by a normal user.
 *
 * This endpoint reports. It does not act: no stake is touched, no miss
 * recorded and nobody is eliminated as a result of a score here.
 */
export const getReviewQueue = async (
  req: Request,
  res: Response
) => {
  try {
    const challengeId = req.query
      .challengeId as string | undefined;

    const minBand = (
      (req.query.band as string) || ""
    ).toUpperCase();

    const result =
      await assessParticipants(
        challengeId
      );

    let assessments =
      result.assessments;

    if (
      minBand === "HIGH" ||
      minBand === "MEDIUM"
    ) {
      assessments = assessments.filter(
        (a) =>
          minBand === "HIGH"
            ? a.band === "HIGH"
            : a.band === "HIGH" ||
              a.band === "MEDIUM"
      );
    }

    return res.status(200).json({
      population: result.population,
      modelUsed: result.modelUsed,
      note: result.note,

      disclaimer:
        "These are review signals, not conclusions. A score here is not evidence of wrongdoing and no penalty is applied automatically.",

      flagged: assessments.filter(
        (a) => a.band !== "LOW"
      ).length,

      assessments,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
