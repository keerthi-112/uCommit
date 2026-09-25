/**
 * Isolation Forest - unsupervised anomaly detection.
 *
 * Why this algorithm: we have no labelled examples of fraud, so nothing
 * can be trained to recognise it. Isolation Forest needs no labels. It
 * works on a simple idea - an anomaly is easier to separate from the
 * rest of the data than a normal point is.
 *
 * Each tree repeatedly picks a random feature and a random split value.
 * Points that get isolated after only a few splits sit far away from
 * everyone else, so they score high. Points that need many splits are
 * buried in the crowd, so they score low.
 *
 * The score is in [0, 1]:
 *   ~0.5 and below  - ordinary, indistinguishable from the rest
 *   towards 1.0     - unusual compared with this population
 *
 * A high score means "this does not look like the others", which is NOT
 * the same as "this person cheated". It is a signal for a human to look
 * at, never a verdict. See scoring.ts for how it is combined with the
 * explainable rules.
 *
 * Implemented here rather than pulled from scikit-learn so the project
 * stays a single TypeScript service with no Python runtime to deploy.
 */

/** Deterministic PRNG, so the same data always produces the same score. */
function mulberry32(seed: number) {
  let a = seed >>> 0;

  return function () {
    a = (a + 0x6d2b79f5) >>> 0;

    let t = Math.imul(
      a ^ (a >>> 15),
      1 | a
    );

    t =
      (t +
        Math.imul(
          t ^ (t >>> 7),
          61 | t
        )) ^
      t;

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

type Tree =
  | {
      kind: "leaf";
      size: number;
    }
  | {
      kind: "split";
      feature: number;
      value: number;
      left: Tree;
      right: Tree;
    };

/**
 * Average path length of an unsuccessful search in a binary search tree.
 * Used to normalise depth so scores are comparable across sample sizes.
 */
function averagePathLength(n: number) {
  if (n <= 1) return 0;

  if (n === 2) return 1;

  const EULER = 0.5772156649;

  return (
    2 * (Math.log(n - 1) + EULER) -
    (2 * (n - 1)) / n
  );
}

export interface IsolationForestOptions {
  trees?: number;
  sampleSize?: number;
  seed?: number;
}

export class IsolationForest {
  private trees: Tree[] = [];
  private sampleSize = 0;
  private trained = false;

  private readonly numTrees: number;
  private readonly requestedSample: number;
  private readonly seed: number;

  constructor(
    options: IsolationForestOptions = {}
  ) {
    this.numTrees = options.trees ?? 100;

    this.requestedSample =
      options.sampleSize ?? 256;

    this.seed = options.seed ?? 42;
  }

  /**
   * Builds the forest. Returns false when there is too little data for
   * the result to mean anything - the caller must then fall back to the
   * deterministic rules rather than pretend it has a score.
   */
  fit(data: number[][]): boolean {
    if (data.length < 8) {
      this.trained = false;
      return false;
    }

    const random = mulberry32(this.seed);

    this.sampleSize = Math.min(
      this.requestedSample,
      data.length
    );

    const maxDepth = Math.ceil(
      Math.log2(
        Math.max(this.sampleSize, 2)
      )
    );

    this.trees = [];

    for (
      let i = 0;
      i < this.numTrees;
      i++
    ) {
      const sample: number[][] = [];

      for (
        let j = 0;
        j < this.sampleSize;
        j++
      ) {
        sample.push(
          data[
            Math.floor(
              random() * data.length
            )
          ]
        );
      }

      this.trees.push(
        this.buildTree(
          sample,
          0,
          maxDepth,
          random
        )
      );
    }

    this.trained = true;

    return true;
  }

  private buildTree(
    data: number[][],
    depth: number,
    maxDepth: number,
    random: () => number
  ): Tree {
    if (
      depth >= maxDepth ||
      data.length <= 1
    ) {
      return {
        kind: "leaf",
        size: data.length,
      };
    }

    const featureCount = data[0].length;

    // Only split on features that actually vary in this subset,
    // otherwise the split separates nothing.
    const usable: number[] = [];

    for (
      let f = 0;
      f < featureCount;
      f++
    ) {
      let min = Infinity;
      let max = -Infinity;

      for (const row of data) {
        if (row[f] < min) min = row[f];
        if (row[f] > max) max = row[f];
      }

      if (max > min) usable.push(f);
    }

    if (usable.length === 0) {
      return {
        kind: "leaf",
        size: data.length,
      };
    }

    const feature =
      usable[
        Math.floor(
          random() * usable.length
        )
      ];

    let min = Infinity;
    let max = -Infinity;

    for (const row of data) {
      if (row[feature] < min)
        min = row[feature];

      if (row[feature] > max)
        max = row[feature];
    }

    const value =
      min + random() * (max - min);

    const left: number[][] = [];
    const right: number[][] = [];

    for (const row of data) {
      if (row[feature] < value)
        left.push(row);
      else right.push(row);
    }

    return {
      kind: "split",
      feature,
      value,
      left: this.buildTree(
        left,
        depth + 1,
        maxDepth,
        random
      ),
      right: this.buildTree(
        right,
        depth + 1,
        maxDepth,
        random
      ),
    };
  }

  /** Depth at which this point got isolated in one tree. */
  private pathLength(
    point: number[],
    tree: Tree,
    depth: number
  ): number {
    if (tree.kind === "leaf") {
      // Points never fully isolated carry the expected remaining depth.
      return (
        depth +
        averagePathLength(tree.size)
      );
    }

    return point[tree.feature] <
      tree.value
      ? this.pathLength(
          point,
          tree.left,
          depth + 1
        )
      : this.pathLength(
          point,
          tree.right,
          depth + 1
        );
  }

  /** Anomaly score in [0, 1]. Higher means more unusual. */
  score(point: number[]): number {
    if (!this.trained) {
      throw new Error(
        "IsolationForest.score called before a successful fit()"
      );
    }

    let total = 0;

    for (const tree of this.trees) {
      total += this.pathLength(
        point,
        tree,
        0
      );
    }

    const meanDepth =
      total / this.trees.length;

    const normaliser = averagePathLength(
      this.sampleSize
    );

    if (normaliser === 0) return 0;

    return Math.pow(
      2,
      -meanDepth / normaliser
    );
  }

  get isTrained() {
    return this.trained;
  }
}
