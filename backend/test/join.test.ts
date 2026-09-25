/**
 * Joining a challenge moves real money, so these tests guard the
 * invariant that matters most: a wallet is debited if and only if a
 * participant row is created, exactly once.
 */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const {
  api,
  prisma,
  ensureServer,
  makeUser,
  makeChallenge,
  walletOf,
  cleanup,
} = require("./helpers.ts");

before(ensureServer);
after(cleanup);

test("rejects a join when the wallet cannot cover the entry fee", async () => {
  const user = await makeUser(50);
  const challenge = await makeChallenge(
    { entryFee: 100 }
  );

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /insufficient/i
  );

  const wallet = await walletOf(user.id);
  assert.equal(
    wallet.balance,
    50,
    "balance must be untouched"
  );

  const count =
    await prisma.challengeParticipant.count(
      {
        where: {
          userId: user.id,
          challengeId: challenge.id,
        },
      }
    );

  assert.equal(count, 0);
});

test("a successful join debits the stake once and records the transaction", async () => {
  const user = await makeUser(250);
  const challenge = await makeChallenge(
    { entryFee: 100 }
  );

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  assert.equal(res.status, 201);

  const wallet = await walletOf(user.id);
  assert.equal(wallet.balance, 150);

  const participant =
    await prisma.challengeParticipant.findFirst(
      {
        where: {
          userId: user.id,
          challengeId: challenge.id,
        },
      }
    );

  assert.ok(participant);
  assert.equal(
    participant.currentStake,
    100
  );
  assert.equal(participant.misses, 0);
  assert.equal(
    participant.eliminated,
    false
  );

  const txns =
    await prisma.walletTransaction.findMany(
      {
        where: {
          userId: user.id,
          type: "CHALLENGE_STAKE",
        },
      }
    );

  assert.equal(
    txns.length,
    1,
    "the stake must leave an audit trail"
  );
  assert.equal(
    txns[0].amount,
    -100,
    "debits are recorded as negative"
  );
});

test("joining the same challenge twice is refused and does not double charge", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge(
    { entryFee: 100 }
  );

  const first = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  const second = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  assert.equal(first.status, 201);
  assert.equal(second.status, 409);

  const wallet = await walletOf(user.id);
  assert.equal(
    wallet.balance,
    400,
    "only one stake may be taken"
  );
});

test("two simultaneous joins cannot both succeed", async () => {
  // This is the double-click case. Before the join became
  // transactional both requests debited the wallet.
  const user = await makeUser(500);
  const challenge = await makeChallenge(
    { entryFee: 100 }
  );

  const [a, b] = await Promise.all([
    api(
      "POST",
      `/challenges/${challenge.id}/join`,
      null,
      user.token
    ),
    api(
      "POST",
      `/challenges/${challenge.id}/join`,
      null,
      user.token
    ),
  ]);

  const statuses = [
    a.status,
    b.status,
  ].sort();

  assert.deepEqual(
    statuses,
    [201, 409],
    "exactly one request may win"
  );

  const wallet = await walletOf(user.id);
  assert.equal(
    wallet.balance,
    400,
    "the wallet must be debited exactly once"
  );

  const participants =
    await prisma.challengeParticipant.count(
      {
        where: {
          userId: user.id,
          challengeId: challenge.id,
        },
      }
    );

  assert.equal(participants, 1);

  const txns =
    await prisma.walletTransaction.count({
      where: {
        userId: user.id,
        type: "CHALLENGE_STAKE",
      },
    });

  assert.equal(
    txns,
    1,
    "one debit means one ledger entry"
  );
});

test("a challenge that already ended cannot be joined", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge({
    startDate: new Date(
      Date.now() - 40 * 86400000
    ),
    endDate: new Date(
      Date.now() - 10 * 86400000
    ),
  });

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /ended/i
  );

  const wallet = await walletOf(user.id);
  assert.equal(wallet.balance, 500);
});

test("a completed challenge cannot be joined", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge({
    completed: true,
  });

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  assert.equal(res.status, 400);

  const wallet = await walletOf(user.id);
  assert.equal(wallet.balance, 500);
});

test("joining requires authentication", async () => {
  const challenge = await makeChallenge();

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/join`
  );

  assert.equal(res.status, 401);
});
