/**
 * Deterministic, explainable fraud signals.
 *
 * These are the backbone of the system. Unlike the model, every rule
 * here can be stated in one sentence to the person it is about, which
 * is what makes it fair to act on. They also work from the very first
 * submission, with no training data.
 *
 * The weights are chosen by judgement, not learned from data - there is
 * no labelled fraud history to learn them from. They are a starting
 * point to be tuned once real reviewed outcomes exist.
 */

import {
  ParticipantFeatures,
} from "./features";

export type RuleCode =
  | "DUPLICATE_PROOF"
  | "NEAR_DUPLICATE_PROOF"
  | "RAPID_SUBMISSIONS"
  | "UNIFORM_TIMING"
  | "HIGH_REJECTION_RATE";

export interface RuleHit {
  code: RuleCode;
  weight: number;
  /** Plain language, safe to show an admin next to the user's name. */
  explanation: string;
}

/** Rules that fired for this participant, strongest first. */
export function evaluateRules(
  f: ParticipantFeatures
): RuleHit[] {
  const hits: RuleHit[] = [];

  if (f.duplicateRatio > 0) {
    const percent = Math.round(
      f.duplicateRatio * 100
    );

    hits.push({
      code: "DUPLICATE_PROOF",
      weight: 0.6,
      explanation: `${percent}% of their proofs repeat evidence they already submitted.`,
    });
  }

  // Only meaningful when the proofs are not byte-identical, otherwise
  // DUPLICATE_PROOF already covers it.
  if (
    f.maxSimilarity >= 0.85 &&
    f.duplicateRatio === 0
  ) {
    hits.push({
      code: "NEAR_DUPLICATE_PROOF",
      weight: 0.4,
      explanation: `Two proofs are ${Math.round(
        f.maxSimilarity * 100
      )}% similar without being identical.`,
    });
  }

  if (
    f.submissionCount >= 2 &&
    f.minGapMinutes < 2
  ) {
    hits.push({
      code: "RAPID_SUBMISSIONS",
      weight: 0.35,
      explanation: `Two submissions arrived ${Math.round(
        f.minGapMinutes * 60
      )} seconds apart, which is faster than doing the activity.`,
    });
  }

  // A human varies. Submitting at almost exactly the same clock time
  // every day for a week or more is worth a look, though shift workers
  // and scheduled routines do this legitimately - hence the low weight.
  if (
    f.submissionCount >= 7 &&
    f.hourStdDev < 0.15
  ) {
    hits.push({
      code: "UNIFORM_TIMING",
      weight: 0.2,
      explanation: `All ${f.submissionCount} submissions land within minutes of the same time each day.`,
    });
  }

  if (
    f.reviewedCount >= 3 &&
    f.rejectionRate > 0.5
  ) {
    hits.push({
      code: "HIGH_REJECTION_RATE",
      weight: 0.45,
      explanation: `A reviewer has already rejected ${Math.round(
        f.rejectionRate * 100
      )}% of their reviewed proofs.`,
    });
  }

  return hits.sort(
    (a, b) => b.weight - a.weight
  );
}

/** Combined rule pressure, capped at 1. */
export function ruleScore(
  hits: RuleHit[]
): number {
  const total = hits.reduce(
    (sum, h) => sum + h.weight,
    0
  );

  return Math.min(total, 1);
}
