/**
 * The AI coach.
 *
 * These tests do NOT call Claude - they would cost money and would not
 * be deterministic. What they check is everything around the model:
 * that the figures handed to it are correct and are the user's own,
 * that nothing private is included, and that the endpoint behaves
 * sanely when no API key is configured.
 *
 * The quality of the generated text is not asserted here. That needs a
 * proper eval against real responses, which is a separate exercise.
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

before(ensureServer);
after(cleanup);

const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function withHistory(
  approvedDaysAgo: number[]
) {
  const user = await makeUser(500);

  const challenge = await makeChallenge({
    startDate: daysAgo(10, 0),
    endDate: daysAgo(-20, 0),
  });

  await prisma.challengeParticipant.create(
    {
      data: {
        userId: user.id,
        challengeId: challenge.id,
        currentStake: 100,
        joinedAt: daysAgo(10, 0),
      },
    }
  );

  if (approvedDaysAgo.length > 0) {
    await prisma.dailySubmission.createMany(
      {
        data: approvedDaysAgo.map(
          (n) => ({
            userId: user.id,
            challengeId: challenge.id,
            proofUrl:
              "https://a.test/" + n,
            submittedAt: daysAgo(n),
            approved: true,
          })
        ),
      }
    );
  }

  return { user, challenge };
}

test("the coach endpoints require a login", async () => {
  assert.equal(
    (await api("GET", "/ai/coach"))
      .status,
    401
  );

  assert.equal(
    (await api("GET", "/ai/status"))
      .status,
    401
  );
});

test("status reports whether a key is configured", async () => {
  const user = await makeUser(0);

  const res = await api(
    "GET",
    "/ai/status",
    null,
    user.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    typeof res.body.configured,
    "boolean"
  );
});

test("with no key the coach says so instead of failing", async () => {
  const user = await makeUser(0);

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    user.token
  );

  // 200 either way: the coach must never break the page that shows it.
  assert.equal(res.status, 200);

  assert.ok(
    ["ok", "not_configured", "unavailable"].includes(
      res.body.status
    ),
    `unexpected status ${res.body.status}`
  );

  assert.ok(
    typeof res.body.message === "string" &&
      res.body.message.length > 0
  );
});

test("the facts sent to the model are computed correctly", async () => {
  // Approved 3, 2 and 1 days ago: a 3 day streak ending yesterday.
  const { user } = await withHistory([
    3, 2, 1,
  ]);

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    user.token
  );

  const f = res.body.facts;

  assert.equal(f.approvedDays, 3);
  assert.equal(f.currentStreak, 3);
  assert.equal(f.longestStreak, 3);
  assert.equal(f.activeChallenges, 1);
  assert.equal(
    f.eliminatedChallenges,
    0
  );

  assert.equal(
    f.challenges.length,
    1
  );
  assert.equal(
    f.challenges[0].approvedDays,
    3
  );

  // Weekday counts must add up to the approved days.
  const weekdayTotal = Object.values(
    f.byWeekday
  ).reduce(
    (a: any, b: any) => a + b,
    0
  );

  assert.equal(weekdayTotal, 3);
});

test("a brand new user reports null consistency, not a made up zero", async () => {
  const user = await makeUser(0);

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    user.token
  );

  assert.equal(
    res.body.facts.consistency,
    null
  );

  assert.equal(
    res.body.facts.approvedDays,
    0
  );
});

test("the coach never receives another user's activity", async () => {
  await withHistory([3, 2, 1]);

  const stranger = await makeUser(0);

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    stranger.token
  );

  const f = res.body.facts;

  assert.equal(f.approvedDays, 0);
  assert.equal(f.currentStreak, 0);
  assert.equal(f.challenges.length, 0);
});

test("no private identifiers are put in the model payload", async () => {
  const { user } = await withHistory([
    2, 1,
  ]);

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    user.token
  );

  const payload = JSON.stringify(
    res.body.facts
  );

  assert.ok(
    !payload.includes(user.email),
    "the email address must not be sent to the model"
  );

  assert.ok(
    !payload.includes(user.id),
    "the user id must not be sent to the model"
  );

  assert.ok(
    !payload.includes("a.test"),
    "proof urls must not be sent to the model"
  );

  // The name is the user's own and makes the message personal.
  assert.equal(
    res.body.facts.name,
    "Test User"
  );
});

test("unreviewed proof is reported as pending, not as activity", async () => {
  const user = await makeUser(500);

  const challenge = await makeChallenge({
    startDate: daysAgo(5, 0),
    endDate: daysAgo(-20, 0),
  });

  await prisma.challengeParticipant.create(
    {
      data: {
        userId: user.id,
        challengeId: challenge.id,
        currentStake: 100,
        joinedAt: daysAgo(5, 0),
      },
    }
  );

  await prisma.dailySubmission.create({
    data: {
      userId: user.id,
      challengeId: challenge.id,
      proofUrl: "https://a.test/x",
      submittedAt: daysAgo(1),
      approved: null,
    },
  });

  const res = await api(
    "GET",
    "/ai/coach",
    null,
    user.token
  );

  assert.equal(
    res.body.facts.approvedDays,
    0
  );

  assert.equal(
    res.body.facts.pendingSubmissions,
    1
  );
});
