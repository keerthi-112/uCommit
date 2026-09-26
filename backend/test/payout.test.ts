/**
 * Challenge payout.
 *
 * The property that matters most here is conservation: every rupee
 * collected as an entry fee must leave again as exactly one of a stake
 * refund, a tier reward, or the platform fee. Two leaks used to break
 * that, and both are pinned below.
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

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** An admin token, for the admin-only completion endpoint. */
async function makeAdmin() {
  const user = await makeUser(0);

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

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

/**
 * A finished challenge with participants in whatever states the test
 * needs. Stakes and misses are set directly so each case is exact.
 */
async function finishedChallenge(
  people: {
    misses: number;
    currentStake: number;
    eliminated?: boolean;
  }[],
  overrides: any = {}
) {
  const challenge = await makeChallenge({
    entryFee: 100,
    penaltyPercentage: 10,
    maxMisses: 2,
    startDate: daysAgo(30),
    endDate: daysAgo(1),
    ...overrides,
  });

  const users = [];

  for (const spec of people) {
    const user = await makeUser(0);

    await prisma.challengeParticipant.create(
      {
        data: {
          userId: user.id,
          challengeId: challenge.id,
          currentStake:
            spec.currentStake,
          misses: spec.misses,
          eliminated: Boolean(
            spec.eliminated
          ),
          joinedAt: daysAgo(30),
        },
      }
    );

    users.push(user);
  }

  return { challenge, users };
}

const balanceOf = async (
  userId: string
) => {
  const w =
    await prisma.wallet.findUnique({
      where: { userId },
    });

  return w ? w.balance : 0;
};

test("an eliminated participant's stake is not lost", async () => {
  // One finisher on a full stake, one eliminated with 72.90 left.
  const { challenge, users } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
      {
        misses: 3,
        currentStake: 72.9,
        eliminated: true,
      },
    ]);

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(res.status, 200);

  assert.equal(
    res.body.forfeitedStakes,
    72.9,
    "the eliminated stake must be accounted for, not dropped"
  );

  assert.equal(
    res.body.accounting.balanced,
    true,
    `collected ${res.body.accounting.collected} but distributed ${res.body.accounting.distributed}`
  );

  assert.equal(
    res.body.accounting.collected,
    200
  );

  assert.equal(
    res.body.accounting.distributed,
    200
  );
});

test("a finisher past the old tier range is still refunded", async () => {
  // maxMisses 3, so 3 misses is NOT elimination. Tiers used to match
  // 0, 1 and 2 exactly, leaving this person with nothing.
  const { challenge, users } =
    await finishedChallenge(
      [
        {
          misses: 3,
          currentStake: 72.9,
        },
      ],
      { maxMisses: 3 }
    );

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.bronzeUsers, 1);

  const balance = await balanceOf(
    users[0].id
  );

  assert.ok(
    balance >= 72.9,
    `expected at least their 72.90 stake back, got ${balance}`
  );

  assert.equal(
    res.body.accounting.balanced,
    true
  );
});

test("money is conserved across a mixed field", async () => {
  const { challenge, users } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
      { misses: 0, currentStake: 100 },
      { misses: 1, currentStake: 90 },
      { misses: 2, currentStake: 81 },
      {
        misses: 3,
        currentStake: 72.9,
        eliminated: true,
      },
      {
        misses: 4,
        currentStake: 65.61,
        eliminated: true,
      },
    ]);

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(res.status, 200);

  assert.equal(
    res.body.accounting.collected,
    600
  );

  assert.equal(
    res.body.accounting.balanced,
    true,
    `distributed ${res.body.accounting.distributed} of ${res.body.accounting.collected}`
  );

  // Sum the wallets independently of what the response claimed.
  let walletTotal = 0;

  for (const u of users) {
    walletTotal += await balanceOf(
      u.id
    );
  }

  const payouts =
    await prisma.challengePayout.findMany(
      {
        where: {
          challengeId: challenge.id,
        },
      }
    );

  assert.equal(
    payouts.length,
    6,
    "every participant gets a payout record, including the eliminated"
  );

  const recorded = payouts.reduce(
    (s: number, p: any) => s + p.amount,
    0
  );

  assert.ok(
    Math.abs(walletTotal - recorded) <
      0.05,
    `wallets hold ${walletTotal} but payouts recorded ${recorded}`
  );
});

test("eliminated participants are recorded but paid nothing", async () => {
  const { challenge, users } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
      {
        misses: 3,
        currentStake: 50,
        eliminated: true,
      },
    ]);

  const admin = await makeAdmin();

  await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(
    await balanceOf(users[1].id),
    0,
    "an eliminated participant receives nothing"
  );

  const record =
    await prisma.challengePayout.findFirst(
      {
        where: {
          challengeId: challenge.id,
          userId: users[1].id,
        },
      }
    );

  assert.ok(record);
  assert.equal(record.tier, "ELIMINATED");
  assert.equal(record.amount, 0);
});

test("a challenge that has not ended cannot be completed", async () => {
  const { challenge } =
    await finishedChallenge(
      [
        { misses: 0, currentStake: 100 },
      ],
      {
        startDate: daysAgo(5),
        endDate: daysAgo(-10),
      }
    );

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /not ended/i
  );
});

test("a challenge cannot be completed twice", async () => {
  const { challenge } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
    ]);

  const admin = await makeAdmin();

  const first = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  const second = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(first.status, 200);
  assert.equal(second.status, 400);
  assert.match(
    second.body.message,
    /already completed/i
  );
});

test("completing a challenge is admin only", async () => {
  const { challenge } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
    ]);

  const user = await makeUser(0);

  assert.equal(
    (
      await api(
        "POST",
        `/rewards/${challenge.id}/complete`
      )
    ).status,
    401
  );

  assert.equal(
    (
      await api(
        "POST",
        `/rewards/${challenge.id}/complete`,
        null,
        user.token
      )
    ).status,
    403
  );
});

test("the platform fee is kept even with no platform wallet yet", async () => {
  await prisma.platformWallet.deleteMany(
    {}
  );

  const { challenge } =
    await finishedChallenge([
      { misses: 0, currentStake: 100 },
      { misses: 1, currentStake: 90 },
    ]);

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    `/rewards/${challenge.id}/complete`,
    null,
    admin.token
  );

  assert.equal(res.status, 200);

  const wallet =
    await prisma.platformWallet.findFirst();

  assert.ok(
    wallet,
    "the wallet should be created rather than the fee discarded"
  );

  assert.ok(wallet.balance > 0);
  assert.equal(
    res.body.accounting.balanced,
    true
  );
});
