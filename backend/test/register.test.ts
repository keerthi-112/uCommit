/**
 * Registration is the front door. Everything here is about refusing
 * bad input with a message a person can act on, rather than a 500.
 */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const {
  api,
  prisma,
  ensureServer,
  cleanup,
} = require("./helpers.ts");

before(ensureServer);
after(cleanup);

/** Registers directly, bypassing the helper, to test raw input. */
async function register(body: any) {
  return api(
    "POST",
    "/auth/register",
    body
  );
}

const freshEmail = () =>
  "reg-" +
  Date.now() +
  "-" +
  Math.random()
    .toString(36)
    .slice(2, 8) +
  "@ucommit.test";

/** Remembers a created account so cleanup can remove it. */
async function track(email: string) {
  const user =
    await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

  if (!user) return;

  await prisma.walletTransaction.deleteMany(
    { where: { userId: user.id } }
  );

  await prisma.wallet.deleteMany({
    where: { userId: user.id },
  });

  await prisma.user.delete({
    where: { id: user.id },
  });
}

test("a valid signup returns a token and creates a wallet", async () => {
  const email = freshEmail();

  const res = await register({
    name: "  Priya Nair  ",
    email,
    password: "goodpassword1",
  });

  assert.equal(res.status, 201);
  assert.ok(
    res.body.token,
    "the user should be signed in immediately"
  );

  assert.equal(
    res.body.user.name,
    "Priya Nair",
    "surrounding whitespace should be trimmed"
  );

  const me = await api(
    "GET",
    "/auth/me",
    null,
    res.body.token
  );

  assert.equal(me.status, 200);
  assert.equal(
    me.body.user.wallet.balance,
    0,
    "every new account gets a wallet"
  );

  await track(email);
});

test("a missing password is refused with a message, not a crash", async () => {
  const res = await register({
    name: "No Password",
    email: freshEmail(),
  });

  assert.equal(
    res.status,
    400,
    "this used to reach bcrypt and return a 500"
  );

  assert.match(
    res.body.message,
    /8 characters/
  );
});

test("a short password is refused", async () => {
  const res = await register({
    name: "Short",
    email: freshEmail(),
    password: "abc123",
  });

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /8 characters/
  );
});

test("a malformed email is refused", async () => {
  for (const email of [
    "not-an-email",
    "missing@domain",
    "@nothing.com",
    "",
  ]) {
    const res = await register({
      name: "Bad Email",
      email,
      password: "goodpassword1",
    });

    assert.equal(
      res.status,
      400,
      `"${email}" should not be accepted`
    );
  }
});

test("a blank name is refused", async () => {
  const res = await register({
    name: "   ",
    email: freshEmail(),
    password: "goodpassword1",
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /name/i);
});

test("the same address cannot register twice, whatever the casing", async () => {
  const email = freshEmail();

  const first = await register({
    name: "First",
    email,
    password: "goodpassword1",
  });

  assert.equal(first.status, 201);

  const second = await register({
    name: "Impostor",
    email: email.toUpperCase(),
    password: "goodpassword1",
  });

  assert.equal(
    second.status,
    400,
    "casing must not create a second account"
  );

  assert.match(
    second.body.message,
    /already registered/i
  );

  await track(email);
});

test("sign in works regardless of how the email is typed", async () => {
  const email = freshEmail();

  await register({
    name: "Case Test",
    email,
    password: "goodpassword1",
  });

  const res = await api(
    "POST",
    "/auth/login",
    {
      email: "  " + email.toUpperCase(),
      password: "goodpassword1",
    }
  );

  assert.equal(
    res.status,
    200,
    "a capitalised email should still sign in"
  );

  assert.ok(res.body.token);

  await track(email);
});

test("signing in without credentials is refused", async () => {
  const res = await api(
    "POST",
    "/auth/login",
    { email: "" }
  );

  assert.equal(res.status, 400);
  assert.match(
    res.body.message,
    /required/i
  );
});
