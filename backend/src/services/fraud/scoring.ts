/**
 * Builds the review queue: who an admin should look at, and why.
 *
 * Two independent signals are combined.
 *
 *   1. Rules      - explainable, work immediately, stated in words.
 *   2. Anomaly    - Isolation Forest, catches patterns nobody wrote a
 *                   rule for, but can only say "unlike the others".
 *
 * Rules carry most of the weight, because a flag an admin cannot explain
 * is a flag they cannot act on fairly. The model only ever adds to
 * suspicion; it can never be the sole reason something is flagged.
 *
 * NOTHING HERE PENALISES ANYONE. It produces a ranked list for a human
 * to review. Stakes, misses and elimination are untouched by this file.
 */

import prisma from "../../prisma/client";

import {
  extractFeatures,
  toVector,
  ParticipantFeatures,
  SubmissionInput,
} from "./features";

import {
  evaluateRules,
  ruleScore,
  RuleHit,
} from "./rules";

import { IsolationForest } from "./isolationForest";

/** Below this many participants the forest cannot say anything useful. */
const MIN_POPULATION = 8;

export type RiskBand =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface RiskAssessment {
  userId: string;
  userName: string;
  challengeId: string;
  challengeTitle: string;

  riskScore: number;
  band: RiskBand;

  /** Named, human readable reasons. Empty means nothing was detected. */
  reasons: RuleHit[];

  /** null when the population was too small to model. */
  anomalyScore: number | null;

  features: ParticipantFeatures;
}

function bandFor(score: number): RiskBand {
  if (score >= 0.6) return "HIGH";
  if (score >= 0.3) return "MEDIUM";
  return "LOW";
}

/**
 * Scores every participant, optionally limited to one challenge.
 * Returns them ranked, riskiest first.
 */
export async function assessParticipants(
  challengeId?: string
): Promise<{
  assessments: RiskAssessment[];
  modelUsed: boolean;
  population: number;
  note: string;
}> {
  const participants =
    await prisma.challengeParticipant.findMany(
      {
        where: challengeId
          ? { challengeId }
          : {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          challenge: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }
    );

  if (participants.length === 0) {
    return {
      assessments: [],
      modelUsed: false,
      population: 0,
      note: "No participants to assess.",
    };
  }

  // One query for every relevant submission, rather than one per person.
  const submissions =
    await prisma.dailySubmission.findMany(
      {
        where: challengeId
          ? { challengeId }
          : {},
        select: {
          userId: true,
          challengeId: true,
          proofUrl: true,
          submittedAt: true,
          approved: true,
        },
      }
    );

  const byParticipant = new Map<
    string,
    SubmissionInput[]
  >();

  for (const s of submissions) {
    const key =
      s.userId + ":" + s.challengeId;

    const list =
      byParticipant.get(key) ?? [];

    list.push({
      proofUrl: s.proofUrl,
      submittedAt: s.submittedAt,
      approved: s.approved,
    });

    byParticipant.set(key, list);
  }

  const rows = participants.map((p) => {
    const features = extractFeatures(
      byParticipant.get(
        p.userId + ":" + p.challengeId
      ) ?? []
    );

    return { participant: p, features };
  });

  // Fit the forest on the whole population, then score each member
  // against it. A participant is only "unusual" relative to peers.
  const forest = new IsolationForest({
    seed: 42,
  });

  const modelUsed =
    rows.length >= MIN_POPULATION &&
    forest.fit(
      rows.map((r) => toVector(r.features))
    );

  const assessments: RiskAssessment[] =
    rows.map(
      ({ participant, features }) => {
        const reasons =
          evaluateRules(features);

        const rules = ruleScore(reasons);

        const anomalyScore = modelUsed
          ? forest.score(
              toVector(features)
            )
          : null;

        // Only above-average anomaly contributes, so an ordinary
        // participant is never pushed up by the model alone.
        const anomalyContribution =
          anomalyScore === null
            ? 0
            : Math.max(
                0,
                (anomalyScore - 0.5) * 2
              );

        // A participant with no rule hits is capped well below HIGH:
        // the model can raise a question, never make an accusation.
        const riskScore = Math.min(
          1,
          rules * 0.7 +
            anomalyContribution * 0.3
        );

        return {
          userId: participant.user.id,
          userName:
            participant.user.name,
          challengeId:
            participant.challenge.id,
          challengeTitle:
            participant.challenge.title,

          riskScore: Number(
            riskScore.toFixed(3)
          ),

          band: bandFor(riskScore),

          reasons,

          anomalyScore:
            anomalyScore === null
              ? null
              : Number(
                  anomalyScore.toFixed(3)
                ),

          features,
        };
      }
    );

  assessments.sort(
    (a, b) => b.riskScore - a.riskScore
  );

  return {
    assessments,
    modelUsed,
    population: rows.length,
    note: modelUsed
      ? "Rules and anomaly model both applied."
      : `Only ${rows.length} participants in scope; the anomaly model needs at least ${MIN_POPULATION} to be meaningful, so these scores come from the explainable rules alone.`,
  };
}
