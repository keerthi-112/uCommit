import { Request, Response } from "express";

import { closeMissedDays } from "../services/challengeDayCloser";

/**
 * Closes out elapsed days that nobody submitted proof for.
 *
 * DRY RUN BY DEFAULT. This endpoint only moves money when the caller
 * sends { "apply": true }. Anything else - including a plain POST with
 * no body - reports what would happen and changes nothing.
 *
 * That default is deliberate: this is the one place in uCommit where
 * money leaves a stake without a person deciding it, so applying has
 * to be an explicit act.
 */
export const closeDays = async (
  req: Request,
  res: Response
) => {
  try {
    const apply =
      req.body?.apply === true;

    const challengeId =
      typeof req.body?.challengeId ===
      "string"
        ? req.body.challengeId
        : undefined;

    const result = await closeMissedDays(
      {
        dryRun: !apply,
        challengeId,
      }
    );

    return res.status(200).json({
      ...result,

      message: result.dryRun
        ? "Dry run. Nothing was changed. Send { \"apply\": true } to apply these penalties."
        : `Applied ${result.daysPenalised} missed days across ${result.participantsAffected} participants.`,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
