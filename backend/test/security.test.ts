/**
 * Regression tests for data that must never leave the server,
 * and for endpoints that must not be readable anonymously.
 */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const {
  api,
  ensureServer,
  makeUser,
  makeChallenge,
  cleanup,
} = require("./helpers.ts");

before(ensureServer);
after(cleanup);

test("register never returns the password hash", async () => {
  const user = await makeUser(0);

  const res = await api(
    "POST",
    "/auth/login",
    {
      email: user.email,
      password: "testpass123",
    }
  );

  assert.equal(res.status, 200);
  assert.ok(
    !JSON.stringify(res.body).includes(
      "passwordHash"
    )
  );
});

test("/auth/me never returns the password hash", async () => {
  const user = await makeUser(120);

  const res = await api(
    "GET",
    "/auth/me",
    null,
    user.token
  );

  assert.equal(res.status, 200);

  assert.ok(
    !JSON.stringify(res.body).includes(
      "passwordHash"
    ),
    "the hash must never reach the client"
  );

  // It should still return what the UI needs.
  assert.equal(
    res.body.user.email,
    user.email
  );
  assert.equal(
    res.body.user.wallet.balance,
    120
  );
});

test("/auth/me requires a token", async () => {
  assert.equal(
    (await api("GET", "/auth/me")).status,
    401
  );

  assert.equal(
    (
      await api(
        "GET",
        "/auth/me",
        null,
        "not-a-real-token"
      )
    ).status,
    401
  );
});

test("the leaderboard is not readable anonymously", async () => {
  const challenge = await makeChallenge();

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/leaderboard`
  );

  assert.equal(res.status, 401);
});

test("the leaderboard does not expose participant emails", async () => {
  const user = await makeUser(500);
  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/leaderboard`,
    null,
    user.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    res.body.leaderboard.length,
    1
  );

  assert.ok(
    !JSON.stringify(res.body).includes(
      user.email
    ),
    "emails are personal data and must not be listed"
  );

  // The name is what a leaderboard legitimately needs.
  assert.equal(
    res.body.leaderboard[0].user.name,
    "Test User"
  );
});

test("admin-only endpoints reject a normal user", async () => {
  const user = await makeUser(0);

  const created = await api(
    "POST",
    "/challenges",
    {
      title: "Should never exist",
      entryFee: 10,
      penaltyPercentage: 10,
      maxMisses: 2,
      startDate: new Date().toISOString(),
      endDate: new Date(
        Date.now() + 86400000
      ).toISOString(),
    },
    user.token
  );

  assert.equal(created.status, 403);

  assert.equal(
    (
      await api(
        "GET",
        "/challenges/pending",
        null,
        user.token
      )
    ).status,
    403
  );
});

test("submission routes send CORS headers", async () => {
  // Regression test: these routes were once mounted above cors(),
  // so the browser silently blocked every response.
  const user = await makeUser(0);
  const challenge = await makeChallenge();

  const res = await api(
    "GET",
    `/challenges/${challenge.id}/submissions`,
    null,
    user.token
  );

  assert.equal(
    res.headers.get(
      "access-control-allow-origin"
    ),
    "*",
    "without this header the browser drops the response"
  );
});

test("a user's dashboard only contains their own data", async () => {
  const a = await makeUser(500);
  const b = await makeUser(500);

  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    a.token
  );

  const res = await api(
    "GET",
    "/dashboard",
    null,
    b.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    res.body.challenges.length,
    0,
    "user b joined nothing and must see nothing"
  );
});
