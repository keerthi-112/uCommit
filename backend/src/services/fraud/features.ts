/**
 * Turns one participant's submission history into numbers.
 *
 * Everything here is a pure function of the submissions passed in, so it
 * can be tested without a database and produces the same answer every
 * time. Nothing in this file decides anything about a user - it only
 * measures.
 */

export interface SubmissionInput {
  proofUrl: string | null;
  submittedAt: Date;
  approved: boolean | null;
}

export interface ParticipantFeatures {
  /** How many proofs this participant has submitted. */
  submissionCount: number;

  /** Share of proofs that repeat a proof they already submitted. */
  duplicateRatio: number;

  /** Closest match between any two different proofs, 0..1. */
  maxSimilarity: number;

  /** Spread of submission times across the day, in hours. */
  hourStdDev: number;

  /** Shortest gap between two consecutive submissions, in minutes. */
  minGapMinutes: number;

  /** Typical gap between submissions, in hours. */
  medianGapHours: number;

  /** Share submitted between midnight and 5am local server time. */
  lateNightRatio: number;

  /** Share of reviewed proofs that an admin rejected. */
  rejectionRate: number;

  /** How many proofs have actually been reviewed. */
  reviewedCount: number;
}

/**
 * Strips the parts of a URL that change without the content changing,
 * so the same evidence posted twice is recognised as the same evidence.
 */
export function normaliseProof(
  raw: string | null
): string {
  if (!raw) return "";

  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/**
 * Words in a proof, used to compare two proofs that are not identical.
 *
 * Single characters are kept deliberately. Two proofs often differ only
 * by a short suffix - .../walk-a and .../walk-b are different evidence,
 * and dropping those characters made them look identical.
 */
function tokenise(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 0);
}

/**
 * Jaccard similarity: shared words divided by total distinct words.
 * 1 means identical token sets, 0 means nothing in common.
 */
export function similarity(
  a: string,
  b: string
): number {
  const left = new Set(tokenise(a));
  const right = new Set(tokenise(b));

  if (
    left.size === 0 ||
    right.size === 0
  ) {
    return 0;
  }

  let shared = 0;

  for (const token of left) {
    if (right.has(token)) shared++;
  }

  const union =
    left.size + right.size - shared;

  return union === 0
    ? 0
    : shared / union;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const mid = Math.floor(
    sorted.length / 2
  );

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function standardDeviation(
  values: number[]
): number {
  if (values.length < 2) return 0;

  const mean =
    values.reduce((a, b) => a + b, 0) /
    values.length;

  const variance =
    values.reduce(
      (sum, v) =>
        sum + (v - mean) * (v - mean),
      0
    ) / values.length;

  return Math.sqrt(variance);
}

export function extractFeatures(
  submissions: SubmissionInput[]
): ParticipantFeatures {
  const ordered = [...submissions].sort(
    (a, b) =>
      a.submittedAt.getTime() -
      b.submittedAt.getTime()
  );

  const count = ordered.length;

  const proofs = ordered.map((s) =>
    normaliseProof(s.proofUrl)
  );

  // How many proofs repeat something submitted earlier.
  const seen = new Set<string>();
  let duplicates = 0;

  for (const proof of proofs) {
    if (!proof) continue;

    if (seen.has(proof)) duplicates++;
    else seen.add(proof);
  }

  // Closest match between any two distinct submissions.
  let maxSimilarity = 0;

  for (let i = 0; i < proofs.length; i++) {
    for (
      let j = i + 1;
      j < proofs.length;
      j++
    ) {
      if (!proofs[i] || !proofs[j])
        continue;

      const s = similarity(
        proofs[i],
        proofs[j]
      );

      if (s > maxSimilarity)
        maxSimilarity = s;
    }
  }

  const hours = ordered.map(
    (s) =>
      s.submittedAt.getHours() +
      s.submittedAt.getMinutes() / 60
  );

  const gapsMinutes: number[] = [];

  for (let i = 1; i < ordered.length; i++) {
    gapsMinutes.push(
      (ordered[i].submittedAt.getTime() -
        ordered[i - 1].submittedAt.getTime()) /
        60000
    );
  }

  const lateNight = ordered.filter(
    (s) => s.submittedAt.getHours() < 5
  ).length;

  const reviewed = ordered.filter(
    (s) => s.approved !== null
  );

  const rejected = reviewed.filter(
    (s) => s.approved === false
  );

  return {
    submissionCount: count,

    duplicateRatio:
      count === 0
        ? 0
        : duplicates / count,

    maxSimilarity,

    hourStdDev: standardDeviation(hours),

    minGapMinutes:
      gapsMinutes.length === 0
        ? // No second submission yet: use a large value so a single
          // submission never looks like a rapid-fire burst.
          Number.MAX_SAFE_INTEGER
        : Math.min(...gapsMinutes),

    medianGapHours:
      median(gapsMinutes) / 60,

    lateNightRatio:
      count === 0 ? 0 : lateNight / count,

    rejectionRate:
      reviewed.length === 0
        ? 0
        : rejected.length /
          reviewed.length,

    reviewedCount: reviewed.length,
  };
}

/**
 * The feature vector handed to the Isolation Forest.
 *
 * Order is fixed - the model compares participants against each other
 * position by position, so it must never change between fit and score.
 * Unbounded values are capped so one extreme participant cannot stretch
 * the split ranges and hide everyone else.
 */
export function toVector(
  f: ParticipantFeatures
): number[] {
  return [
    Math.min(f.submissionCount, 365),
    f.duplicateRatio,
    f.maxSimilarity,
    f.hourStdDev,
    Math.min(f.minGapMinutes, 1440),
    Math.min(f.medianGapHours, 168),
    f.lateNightRatio,
    f.rejectionRate,
  ];
}

export const FEATURE_NAMES = [
  "submissionCount",
  "duplicateRatio",
  "maxSimilarity",
  "hourStdDev",
  "minGapMinutes",
  "medianGapHours",
  "lateNightRatio",
  "rejectionRate",
];
