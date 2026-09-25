/**
 * Wallet, dashboard and community figures.
 *
 * These pages used to show invented numbers. The point of these tests
 * is that every figure now traces back to a row, and that one user's
 * figures never include another user's activity.
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

// ---------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------

test("a deposit credits the wallet and leaves a ledger entry", async () => {
  const user = await makeUser(0);

  const res = await api(
    "POST",
    "/wallet/deposit",
    { amount: 250 },
    user.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    res.body.wallet.balance,
    250
  );
  assert.equal(
    res.body.wallet.totalDeposit,
    250
  );

  const wallet = await api(
    "GET",
    "/wallet",
    null,
    user.token
  );

  assert.equal(wallet.status, 200);

  const deposits =
    wallet.body.transactions.filter(
      (t: any) => t.type === "DEPOSIT"
    );

  assert.equal(
    deposits.length,
    1,
    "a deposit must be recorded, not just applied"
  );

  assert.equal(deposits[0].amount, 250);
});

test("a negative deposit cannot drain the balance", async () => {
  const user = await makeUser(300);

  for (const amount of [
    -100,
    0,
    "abc",
    null,
  ]) {
    const res = await api(
      "POST",
      "/wallet/deposit",
      { amount },
      user.token
    );

    assert.equal(
      res.status,
      400,
      `amount ${JSON.stringify(
        amount
      )} should be refused`
    );
  }

  const wallet = await api(
    "GET",
    "/wallet",
    null,
    user.token
  );

  assert.equal(
    wallet.body.wallet.balance,
    300,
    "the balance must be untouched"
  );
});

test("an absurd deposit is refused", async () => {
  const user = await makeUser(0);

  const res = await api(
    "POST",
    "/wallet/deposit",
    { amount: 99999999 },
    user.token
  );

  assert.equal(res.status, 400);
});

test("the wallet reports money currently at stake", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge({
    entryFee: 120,
  });

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  const res = await api(
    "GET",
    "/wallet",
    null,
    user.token
  );

  assert.equal(res.body.atStake, 120);
  assert.equal(
    res.body.wallet.balance,
    380
  );

  const stakes =
    res.body.transactions.filter(
      (t: any) =>
        t.type === "CHALLENGE_STAKE"
    );

  assert.equal(stakes.length, 1);
  assert.equal(stakes[0].amount, -120);
});

test("a wallet only ever shows its owner's transactions", async () => {
  const a = await makeUser(400);
  const b = await makeUser(0);

  const res = await api(
    "GET",
    "/wallet",
    null,
    b.token
  );

  assert.equal(
    res.body.wallet.balance,
    0
  );

  assert.equal(
    res.body.transactions.length,
    0,
    "user b deposited nothing and must see nothing"
  );

  assert.equal(res.body.atStake, 0);
});

test("the wallet requires authentication", async () => {
  assert.equal(
    (await api("GET", "/wallet")).status,
    401
  );
});

// ---------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------

/** A participant with approved submissions on the given days ago. */
async function withHistory(
  approvedDaysAgo: number[],
  joinedDaysAgo = 10
) {
  const user = await makeUser(500);

  const challenge = await makeChallenge({
    startDate: daysAgo(joinedDaysAgo, 0),
    endDate: daysAgo(-20, 0),
  });

  await prisma.challengeParticipant.create(
    {
      data: {
        userId: user.id,
        challengeId: challenge.id,
        currentStake: 100,
        joinedAt: daysAgo(
          joinedDaysAgo,
          0
        ),
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

test("a brand new user gets zeros and a null consistency, not invented numbers", async () => {
  const user = await makeUser(0);

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(res.status, 200);

  const s = res.body.stats;

  assert.equal(s.currentStreak, 0);
  assert.equal(s.longestStreak, 0);
  assert.equal(s.approvedDays, 0);
  assert.equal(s.activeChallenges, 0);

  assert.equal(
    s.consistency,
    null,
    "nothing has been expected yet, so there is no percentage to report"
  );

  assert.deepEqual(
    res.body.activity,
    []
  );
});

test("the current streak counts consecutive approved days up to today", async () => {
  const { user } = await withHistory([
    2, 1, 0,
  ]);

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(
    res.body.stats.currentStreak,
    3
  );

  assert.equal(
    res.body.stats.approvedDays,
    3
  );
});

test("a broken streak is not counted as current", async () => {
  // Active 6 and 5 days ago, then nothing since.
  const { user } = await withHistory([
    6, 5,
  ]);

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(
    res.body.stats.currentStreak,
    0,
    "an old run must not show as a live streak"
  );

  assert.equal(
    res.body.stats.longestStreak,
    2,
    "but it is still their longest run"
  );
});

test("unreviewed proof does not count towards streaks or activity", async () => {
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

  await prisma.dailySubmission.createMany(
    {
      data: [
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl: "https://a.test/p",
          submittedAt: daysAgo(1),
          approved: null,
        },
        {
          userId: user.id,
          challengeId: challenge.id,
          proofUrl: "https://a.test/r",
          submittedAt: daysAgo(2),
          approved: false,
        },
      ],
    }
  );

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(
    res.body.stats.approvedDays,
    0
  );
  assert.equal(
    res.body.stats.currentStreak,
    0
  );
  assert.equal(
    res.body.stats.pendingSubmissions,
    1
  );
  assert.equal(
    res.body.activity.length,
    0,
    "the heatmap must only show verified activity"
  );
});

test("the activity feed reports one entry per day with a real count", async () => {
  const { user } = await withHistory([
    3, 2,
  ]);

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(
    res.body.activity.length,
    2
  );

  for (const day of res.body.activity) {
    assert.match(
      day.date,
      /^\d{4}-\d{2}-\d{2}$/
    );
    assert.ok(day.count >= 1);
  }
});

test("one user's dashboard never includes another user's activity", async () => {
  await withHistory([3, 2, 1]);

  const stranger = await makeUser(0);

  const res = await api(
    "GET",
    "/dashboard",
    null,
    stranger.token
  );

  assert.equal(
    res.body.stats.approvedDays,
    0
  );
  assert.deepEqual(
    res.body.activity,
    []
  );
});

// ---------------------------------------------------------------
// Community and leaderboard
// ---------------------------------------------------------------

test("community stats are aggregate counts and need a login", async () => {
  assert.equal(
    (
      await api(
        "GET",
        "/challenges/community"
      )
    ).status,
    401
  );

  const user = await makeUser(0);

  const res = await api(
    "GET",
    "/challenges/community",
    null,
    user.token
  );

  assert.equal(res.status, 200);
  assert.ok(res.body.totalMembers >= 1);

  const c = res.body.cohort;

  assert.equal(
    c.onTrack +
      c.missedOnce +
      c.missedTwice +
      c.eliminated,
    c.total,
    "the buckets must be exclusive and add up"
  );

  assert.ok(
    !JSON.stringify(res.body).includes(
      "@"
    ),
    "aggregate stats must not carry personal data"
  );
});

test("the leaderboard ranks by days shown up, not by money left", async () => {
  const challenge = await makeChallenge();

  // Diligent has more approved days but a smaller stake.
  const diligent = await makeUser(500);
  const untested = await makeUser(500);

  for (const u of [diligent, untested]) {
    await api(
      "POST",
      `/challenges/${challenge.id}/join`,
      null,
      u.token
    );
  }

  await prisma.challengeParticipant.updateMany(
    {
      where: {
        userId: diligent.id,
        challengeId: challenge.id,
      },
      data: { currentStake: 60, misses: 1 },
    }
  );

  await prisma.dailySubmission.createMany(
    {
      data: [3, 2, 1].map((n) => ({
        userId: diligent.id,
        challengeId: challenge.id,
        proofUrl: "https://a.test/" + n,
        submittedAt: daysAgo(n),
        approved: true,
      })),
    }
  );

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/leaderboard`,
    null,
    diligent.token
  );

  assert.equal(res.status, 200);

  assert.equal(
    res.body.leaderboard[0].user.id,
    diligent.id,
    "showing up 3 days should beat an untouched stake"
  );

  assert.equal(
    res.body.leaderboard[0].approvedDays,
    3
  );
});

test("eliminated participants rank below everyone still standing", async () => {
  const challenge = await makeChallenge();

  const out = await makeUser(500);
  const inPlay = await makeUser(500);

  for (const u of [out, inPlay]) {
    await api(
      "POST",
      `/challenges/${challenge.id}/join`,
      null,
      u.token
    );
  }

  await prisma.challengeParticipant.updateMany(
    {
      where: {
        userId: out.id,
        challengeId: challenge.id,
      },
      data: { eliminated: true },
    }
  );

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/leaderboard`,
    null,
    inPlay.token
  );

  const last =
    res.body.leaderboard[
      res.body.leaderboard.length - 1
    ];

  assert.equal(last.user.id, out.id);
});
