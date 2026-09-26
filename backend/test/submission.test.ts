/**
 * Daily proof submission: the core accountability action.
 * These tests cover who may submit, when, and who may read the result.
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

/** Registers a funded user and joins them to a fresh challenge. */
async function joinedUser(
  challengeOverrides:
    | Record<string, any>
    | undefined = undefined
) {
  const user = await makeUser(500);

  const challenge = await makeChallenge(
    challengeOverrides
  );

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  return { user, challenge };
}

test("a proof can be submitted and comes back as awaiting review", async () => {
  const { user, challenge } =
    await joinedUser();

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    {
      proofUrl:
        "https://example.com/proof.png",
    },
    user.token
  );

  assert.equal(res.status, 201);

  const listed = await api(
    "GET",
    `/challenges/${challenge.id}/submissions`,
    null,
    user.token
  );

  assert.equal(listed.status, 200);
  assert.equal(
    listed.body.submissions.length,
    1
  );
  assert.equal(
    listed.body.submissions[0].approved,
    null,
    "a new submission is unreviewed"
  );
  assert.equal(
    listed.body.pendingCount,
    1
  );
  assert.equal(
    listed.body.approvedCount,
    0
  );
});

test("the proof url is trimmed before it is stored", async () => {
  const { user, challenge } =
    await joinedUser();

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    {
      proofUrl:
        "   https://example.com/x.png   ",
    },
    user.token
  );

  assert.equal(
    res.body.submission.proofUrl,
    "https://example.com/x.png"
  );
});

test("an empty proof is refused", async () => {
  const { user, challenge } =
    await joinedUser();

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "    " },
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /required/i
  );
});

test("only one proof per day is accepted", async () => {
  const { user, challenge } =
    await joinedUser();

  const first = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/1" },
    user.token
  );

  const second = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/2" },
    user.token
  );

  assert.equal(first.status, 201);
  assert.equal(second.status, 400);
  assert.match(
    second.body.message,
    /already submitted/i
  );

  const count =
    await prisma.dailySubmission.count({
      where: {
        userId: user.id,
        challengeId: challenge.id,
      },
    });

  assert.equal(count, 1);
});

test("someone who never joined cannot submit", async () => {
  const outsider = await makeUser(500);
  const challenge = await makeChallenge();

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/x" },
    outsider.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /join challenge first/i
  );
});

test("an eliminated participant cannot submit", async () => {
  const { user, challenge } =
    await joinedUser();

  await prisma.challengeParticipant.updateMany(
    {
      where: {
        userId: user.id,
        challengeId: challenge.id,
      },
      data: { eliminated: true },
    }
  );

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/x" },
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /eliminated/i
  );
});

test("a challenge that has ended accepts no more proof", async () => {
  const user = await makeUser(500);

  // Join while it is open, then move the window into the past.
  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      startDate: new Date(
        Date.now() - 40 * 86400000
      ),
      endDate: new Date(
        Date.now() - 5 * 86400000
      ),
    },
  });

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/x" },
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(res.body.message, /ended/i);
});

test("a challenge that has not started accepts no proof yet", async () => {
  const user = await makeUser(500);

  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      startDate: new Date(
        Date.now() + 5 * 86400000
      ),
    },
  });

  const res = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/x" },
    user.token
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /not started/i
  );
});

test("one user cannot read another user's submissions", async () => {
  const { user, challenge } =
    await joinedUser();

  await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    {
      proofUrl:
        "https://private.test/secret",
    },
    user.token
  );

  const nosy = await makeUser(0);

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/submissions`,
    null,
    nosy.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    res.body.submissions.length,
    0,
    "submissions are private to their owner"
  );

  assert.ok(
    !JSON.stringify(res.body).includes(
      "secret"
    ),
    "another user's proof must not leak"
  );
});

test("submitting and reading submissions both require authentication", async () => {
  const challenge = await makeChallenge();

  assert.equal(
    (
      await api(
        "POST",
        `/challenges/${challenge.id}/submit`,
        { proofUrl: "https://a.test/x" }
      )
    ).status,
    401
  );

  assert.equal(
    (
      await api(
        "GET",
        `/challenges/${challenge.id}/submissions`
      )
    ).status,
    401
  );
});
