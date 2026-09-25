/**
 * Validation for the Isolation Forest implementation.
 *
 * IMPORTANT: the data in this file is SYNTHETIC. It exists to prove the
 * algorithm is implemented correctly - that points we deliberately
 * placed far from the crowd really do score higher than the crowd.
 *
 * It says nothing about how well fraud detection works on real users.
 * That can only be measured once there are real submissions and real
 * reviewed outcomes to measure against. No accuracy figure from this
 * file should ever be quoted as production performance.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  IsolationForest,
} = require("../src/services/fraud/isolationForest.ts");

/** Deterministic generator so these tests never flake. */
function seededRandom(seed: number) {
  let s = seed;

  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** A tight cluster of ordinary points, plus obvious outliers. */
function makePopulation() {
  const rand = seededRandom(7);
  const normal: number[][] = [];

  for (let i = 0; i < 300; i++) {
    normal.push([
      10 + rand() * 2,
      5 + rand() * 2,
      100 + rand() * 20,
    ]);
  }

  const outliers = [
    [90, 80, 900],
    [0, 0, 0],
    [85, 1, 800],
  ];

  return { normal, outliers };
}

test("refuses to fit when there is too little data to mean anything", () => {
  const forest = new IsolationForest();

  assert.equal(
    forest.fit([[1], [2], [3]]),
    false,
    "a handful of rows cannot support an anomaly score"
  );

  assert.equal(
    forest.isTrained,
    false
  );

  assert.throws(
    () => forest.score([1]),
    /before a successful fit/,
    "scoring an unfitted forest must fail loudly, not return a number"
  );
});

test("scores planted outliers above every ordinary point", () => {
  const { normal, outliers } =
    makePopulation();

  const forest = new IsolationForest({
    seed: 1,
  });

  assert.equal(forest.fit(normal), true);

  const normalScores = normal.map(
    (p: number[]) => forest.score(p)
  );

  const worstNormal = Math.max(
    ...normalScores
  );

  for (const outlier of outliers) {
    const score = forest.score(outlier);

    assert.ok(
      score > worstNormal,
      `planted outlier ${JSON.stringify(
        outlier
      )} scored ${score.toFixed(
        3
      )}, which is not above the highest ordinary score ${worstNormal.toFixed(
        3
      )}`
    );
  }
});

test("ordinary points sit in the expected score range", () => {
  const { normal } = makePopulation();

  const forest = new IsolationForest({
    seed: 1,
  });

  forest.fit(normal);

  const scores = normal.map(
    (p: number[]) => forest.score(p)
  );

  const mean =
    scores.reduce(
      (a: number, b: number) => a + b,
      0
    ) / scores.length;

  // A uniform population should average near 0.5 - the point of the
  // normalisation. Drifting far from that means the path length maths
  // is wrong.
  assert.ok(
    mean > 0.3 && mean < 0.65,
    `mean score of ordinary points was ${mean.toFixed(
      3
    )}, expected roughly 0.5`
  );

  for (const s of scores) {
    assert.ok(
      s >= 0 && s <= 1,
      "scores must stay inside [0, 1]"
    );
  }
});

test("the same input always produces the same score", () => {
  const { normal, outliers } =
    makePopulation();

  const a = new IsolationForest({
    seed: 99,
  });

  const b = new IsolationForest({
    seed: 99,
  });

  a.fit(normal);
  b.fit(normal);

  // Reproducibility matters: an admin looking at a flagged user
  // tomorrow must see the same number they saw today.
  assert.equal(
    a.score(outliers[0]),
    b.score(outliers[0])
  );

  assert.equal(
    a.score(normal[0]),
    b.score(normal[0])
  );
});

test("a point identical to the crowd is not flagged", () => {
  const { normal } = makePopulation();

  const forest = new IsolationForest({
    seed: 3,
  });

  forest.fit(normal);

  // Dead centre of the cluster.
  const typical = [11, 6, 110];

  assert.ok(
    forest.score(typical) < 0.6,
    "a point in the middle of the population must not look anomalous"
  );
});
