/**
 * Fraud detection.
 *
 * The rule tests below use REAL data written to the database and read
 * back through the real endpoint. The feature tests are pure functions
 * over hand-built input, so the expected values are known exactly.
 *
 * None of this measures how well fraud detection works on real users.
 * There is no labelled fraud history to measure against yet. What these
 * tests prove is narrower and still worth having: the signals fire when
 * the pattern they describe is present, and stay quiet when it is not.
 */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const {
  api,
  prisma,
  ensureServer,
  makeUser,
  makeChallenge,
  cleanup,
} = require("./helpers.ts");

const {
  extractFeatures,
  normaliseProof,
  similarity,
} = require("../src/services/fraud/features.ts");

const {
  evaluateRules,
} = require("../src/services/fraud/rules.ts");

before(ensureServer);
after(cleanup);

const at = (
  daysAgo: number,
  hour: number,
  minute = 0
) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// ---------------------------------------------------------------
// Pure feature extraction
// ---------------------------------------------------------------

test("proof urls are normalised so cosmetic differences do not hide a repeat", () => {
  assert.equal(
    normaliseProof(
      "https://WWW.Example.com/proof/"
    ),
    "example.com/proof"
  );

  assert.equal(
    normaliseProof(
      "http://example.com/proof"
    ),
    normaliseProof(
      "https://www.example.com/proof/"
    )
  );

  assert.equal(normaliseProof(null), "");
});

test("similarity is 1 for the same tokens and 0 for unrelated ones", () => {
  assert.equal(
    similarity(
      "strava.com/activities/123",
      "strava.com/activities/123"
    ),
    1
  );

  assert.equal(
    similarity(
      "alpha bravo",
      "charlie delta"
    ),
    0
  );

  const partial = similarity(
    "strava.com/activities/111",
    "strava.com/activities/222"
  );

  assert.ok(
    partial > 0.4 && partial < 1,
    `expected partial overlap, got ${partial}`
  );
});

test("an honest participant produces clean features and no rule hits", () => {
  const features = extractFeatures([
    {
      proofUrl: "https://a.test/day1",
      submittedAt: at(3, 8, 15),
      approved: true,
    },
    {
      proofUrl: "https://a.test/day2",
      submittedAt: at(2, 19, 40),
      approved: true,
    },
    {
      proofUrl: "https://a.test/day3",
      submittedAt: at(1, 12, 5),
      approved: true,
    },
  ]);

  assert.equal(
    features.submissionCount,
    3
  );
  assert.equal(
    features.duplicateRatio,
    0
  );
  assert.equal(
    features.rejectionRate,
    0
  );

  assert.deepEqual(
    evaluateRules(features),
    [],
    "nothing about this behaviour should be flagged"
  );
});

test("repeating the same proof is detected even when the url is written differently", () => {
  const features = extractFeatures([
    {
      proofUrl: "https://a.test/proof",
      submittedAt: at(2, 9),
      approved: null,
    },
    {
      proofUrl:
        "http://www.a.test/proof/",
      submittedAt: at(1, 9),
      approved: null,
    },
  ]);

  assert.ok(
    features.duplicateRatio > 0,
    "the second proof repeats the first"
  );

  const codes = evaluateRules(
    features
  ).map((r: any) => r.code);

  assert.ok(
    codes.includes("DUPLICATE_PROOF")
  );
});

test("two submissions seconds apart are flagged as rapid", () => {
  const features = extractFeatures([
    {
      proofUrl: "https://a.test/one",
      submittedAt: new Date(
        "2026-09-20T10:00:00"
      ),
      approved: null,
    },
    {
      proofUrl: "https://a.test/two",
      submittedAt: new Date(
        "2026-09-20T10:00:30"
      ),
      approved: null,
    },
  ]);

  assert.ok(
    features.minGapMinutes < 2
  );

  const codes = evaluateRules(
    features
  ).map((r: any) => r.code);

  assert.ok(
    codes.includes("RAPID_SUBMISSIONS")
  );
});

test("a single submission is never called rapid", () => {
  const features = extractFeatures([
    {
      proofUrl: "https://a.test/only",
      submittedAt: at(1, 10),
      approved: null,
    },
  ]);

  const codes = evaluateRules(
    features
  ).map((r: any) => r.code);

  assert.ok(
    !codes.includes(
      "RAPID_SUBMISSIONS"
    ),
    "with nothing to compare against there is no gap to judge"
  );
});

test("a high rejection rate is only raised once enough proofs were reviewed", () => {
  const twoRejected = extractFeatures([
    {
      proofUrl: "https://a.test/1",
      submittedAt: at(2, 9),
      approved: false,
    },
    {
      proofUrl: "https://a.test/2",
      submittedAt: at(1, 9),
      approved: false,
    },
  ]);

  assert.ok(
    !evaluateRules(twoRejected)
      .map((r: any) => r.code)
      .includes("HIGH_REJECTION_RATE"),
    "two reviews is too small a sample to judge"
  );

  const fourReviewed = extractFeatures([
    {
      proofUrl: "https://a.test/1",
      submittedAt: at(4, 9),
      approved: false,
    },
    {
      proofUrl: "https://a.test/2",
      submittedAt: at(3, 9),
      approved: false,
    },
    {
      proofUrl: "https://a.test/3",
      submittedAt: at(2, 9),
      approved: false,
    },
    {
      proofUrl: "https://a.test/4",
      submittedAt: at(1, 9),
      approved: true,
    },
  ]);

  assert.ok(
    evaluateRules(fourReviewed)
      .map((r: any) => r.code)
      .includes("HIGH_REJECTION_RATE")
  );
});

// ---------------------------------------------------------------
// The endpoint, end to end against real rows
// ---------------------------------------------------------------

test("the review queue is admin only", async () => {
  const user = await makeUser(0);

  assert.equal(
    (await api("GET", "/fraud/review"))
      .status,
    401,
    "anonymous access must be refused"
  );

  assert.equal(
    (
      await api(
        "GET",
        "/fraud/review",
        null,
        user.token
      )
    ).status,
    403,
    "a normal user must not see other people's risk scores"
  );
});

test("a participant who repeats proof is surfaced with a readable reason", async () => {
  // Real data: join, then submit the same evidence twice on
  // different days, written straight to the table so the dates differ.
  const user = await makeUser(500);
  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  await prisma.dailySubmission.createMany(
    {
      data: [
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl:
            "https://cheat.test/same",
          submittedAt: at(2, 9),
          approved: null,
        },
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl:
            "https://www.cheat.test/same/",
          submittedAt: at(1, 9),
          approved: null,
        },
      ],
    }
  );

  const admin = await makeAdmin();

  const res = await api(
    "GET",
    `/fraud/review?challengeId=${challenge.id}`,
    null,
    admin.token
  );

  assert.equal(res.status, 200);

  const mine = res.body.assessments.find(
    (a: any) => a.userId === user.id
  );

  assert.ok(
    mine,
    "the participant should appear in the queue"
  );

  assert.notEqual(
    mine.band,
    "LOW",
    "repeating evidence should raise the band"
  );

  const codes = mine.reasons.map(
    (r: any) => r.code
  );

  assert.ok(
    codes.includes("DUPLICATE_PROOF")
  );

  assert.match(
    mine.reasons[0].explanation,
    /proofs repeat evidence/,
    "the reason must be readable, not just a code"
  );

  assert.ok(
    res.body.disclaimer.includes(
      "not conclusions"
    )
  );
});

test("an honest participant is not flagged", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  await prisma.dailySubmission.createMany(
    {
      data: [
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl:
            "https://honest.test/monday",
          submittedAt: at(3, 7, 20),
          approved: true,
        },
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl:
            "https://honest.test/tuesday",
          submittedAt: at(2, 18, 45),
          approved: true,
        },
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl:
            "https://honest.test/wednesday",
          submittedAt: at(1, 13, 10),
          approved: true,
        },
      ],
    }
  );

  const admin = await makeAdmin();

  const res = await api(
    "GET",
    `/fraud/review?challengeId=${challenge.id}`,
    null,
    admin.token
  );

  const mine = res.body.assessments.find(
    (a: any) => a.userId === user.id
  );

  assert.equal(
    mine.band,
    "LOW",
    "ordinary behaviour must not be flagged"
  );

  assert.deepEqual(mine.reasons, []);
});

test("a small population is reported as rules-only rather than silently modelled", async () => {
  const challenge = await makeChallenge();
  const user = await makeUser(500);

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  const admin = await makeAdmin();

  const res = await api(
    "GET",
    `/fraud/review?challengeId=${challenge.id}`,
    null,
    admin.token
  );

  assert.equal(
    res.body.modelUsed,
    false,
    "one participant cannot support an anomaly model"
  );

  assert.match(
    res.body.note,
    /explainable rules alone/
  );

  assert.equal(
    res.body.assessments[0]
      .anomalyScore,
    null,
    "no score should be invented when the model did not run"
  );
});

/** Creates an admin. Registers through the API, then grants the role. */
async function makeAdmin() {
  const user = await makeUser(0);

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  // The role lives in the token, so sign in again to pick it up.
  const login = await api(
    "POST",
    "/auth/login",
    {
      email: user.email,
      password: "testpass123",
    }
  );

  return {
    ...user,
    token: login.body.token,
  };
}
