/**
 * Day boundaries across timezones.
 *
 * Day logic used to run on the server's local clock, so a user abroad
 * had their day start and end at the wrong moment - and the submission
 * check and the close-out job each worked it out separately.
 *
 * The test that matters most is the last one: a day the server accepted
 * a submission for must never be a day the close-out job later charges
 * for. Those two disagreeing means taking money from somebody who did
 * show up.
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
  dayKey,
  todayKey,
  daysBetween,
  dayKeysBetween,
  previousDayKey,
  nextDayKey,
  isValidTimezone,
} = require("../src/utils/time.ts");

const {
  closeMissedDays,
} = require("../src/services/challengeDayCloser.ts");

before(ensureServer);
after(cleanup);

// ---------------------------------------------------------------
// The helpers themselves
// ---------------------------------------------------------------

test("the same instant falls on different days in different zones", () => {
  // 17:30 UTC is already the next day in Auckland, still the same in LA.
  const instant = new Date(
    "2026-09-25T17:30:00Z"
  );

  assert.equal(
    dayKey(instant, "UTC"),
    "2026-09-25"
  );

  assert.equal(
    dayKey(instant, "Asia/Kolkata"),
    "2026-09-25",
    "UTC+5:30 - 23:00 the same day"
  );

  assert.equal(
    dayKey(instant, "Pacific/Auckland"),
    "2026-09-26",
    "UTC+12 - already tomorrow"
  );

  assert.equal(
    dayKey(instant, "America/Los_Angeles"),
    "2026-09-25",
    "UTC-7 - still mid morning"
  );
});

test("a zone just past midnight reads as the next day", () => {
  // 20:00 UTC is 01:30 in Kolkata on the 26th.
  const instant = new Date(
    "2026-09-25T20:00:00Z"
  );

  assert.equal(
    dayKey(instant, "UTC"),
    "2026-09-25"
  );

  assert.equal(
    dayKey(instant, "Asia/Kolkata"),
    "2026-09-26"
  );
});

test("an unknown timezone falls back to UTC instead of throwing", () => {
  const instant = new Date(
    "2026-09-25T10:00:00Z"
  );

  assert.equal(
    dayKey(instant, "Not/AZone"),
    "2026-09-25"
  );

  assert.equal(
    isValidTimezone("Not/AZone"),
    false
  );

  assert.equal(
    isValidTimezone("Asia/Kolkata"),
    true
  );

  assert.equal(
    isValidTimezone(""),
    false
  );

  assert.equal(
    isValidTimezone(undefined),
    false
  );
});

test("day arithmetic works across a month boundary", () => {
  assert.equal(
    nextDayKey("2026-09-30"),
    "2026-10-01"
  );

  assert.equal(
    previousDayKey("2026-10-01"),
    "2026-09-30"
  );

  assert.equal(
    daysBetween(
      "2026-09-28",
      "2026-10-02"
    ),
    4
  );

  assert.deepEqual(
    dayKeysBetween(
      "2026-09-29",
      "2026-10-02"
    ),
    [
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ]
  );
});

test("day arithmetic survives a daylight saving change", () => {
  // London loses an hour on 2026-03-29. Anchoring at midday UTC means
  // that never skips or repeats a day.
  const keys = dayKeysBetween(
    "2026-03-27",
    "2026-03-31"
  );

  assert.deepEqual(keys, [
    "2026-03-27",
    "2026-03-28",
    "2026-03-29",
    "2026-03-30",
  ]);

  assert.equal(
    daysBetween(
      "2026-03-27",
      "2026-03-31"
    ),
    4
  );
});

test("a leap day is a real day", () => {
  assert.equal(
    nextDayKey("2028-02-28"),
    "2028-02-29"
  );

  assert.equal(
    nextDayKey("2028-02-29"),
    "2028-03-01"
  );
});

// ---------------------------------------------------------------
// End to end
// ---------------------------------------------------------------

test("a new account stores the timezone the browser reported", async () => {
  const email =
    "tz-" + Date.now() + "@ucommit.test";

  const res = await api(
    "POST",
    "/auth/register",
    {
      name: "Zone Test",
      email,
      password: "testpass123",
      timezone: "Pacific/Auckland",
    }
  );

  assert.equal(res.status, 201);

  const me = await api(
    "GET",
    "/auth/me",
    null,
    res.body.token
  );

  assert.equal(
    me.body.user.timezone,
    "Pacific/Auckland"
  );

  const user =
    await prisma.user.findUnique({
      where: { email },
    });

  await prisma.walletTransaction.deleteMany(
    { where: { userId: user.id } }
  );
  await prisma.wallet.deleteMany({
    where: { userId: user.id },
  });
  await prisma.user.delete({
    where: { id: user.id },
  });
});

test("a nonsense timezone at signup is stored as UTC, not rejected", async () => {
  const user = await makeUser(0);

  // makeUser sends none at all.
  const me = await api(
    "GET",
    "/auth/me",
    null,
    user.token
  );

  assert.equal(
    me.body.user.timezone,
    "UTC"
  );
});

test("the timezone endpoint accepts a real zone and refuses junk", async () => {
  const user = await makeUser(0);

  assert.equal(
    (
      await api(
        "PUT",
        "/auth/timezone",
        { timezone: "Europe/Berlin" },
        user.token
      )
    ).status,
    200
  );

  const me = await api(
    "GET",
    "/auth/me",
    null,
    user.token
  );

  assert.equal(
    me.body.user.timezone,
    "Europe/Berlin"
  );

  assert.equal(
    (
      await api(
        "PUT",
        "/auth/timezone",
        { timezone: "Mars/Olympus" },
        user.token
      )
    ).status,
    400
  );

  assert.equal(
    (
      await api(
        "PUT",
        "/auth/timezone",
        { timezone: "Europe/Berlin" }
      )
    ).status,
    401,
    "must be authenticated"
  );
});

test("submission and the close-out job agree on what today is", async () => {
  // The property that protects people's money. A submission accepted
  // as "today" must never be a day the closer later charges for.
  const user = await makeUser(500);

  // A zone far from the server's, so a disagreement would show.
  await prisma.user.update({
    where: { id: user.id },
    data: { timezone: "Pacific/Auckland" },
  });

  const challenge = await makeChallenge({
    entryFee: 100,
    penaltyPercentage: 10,
    maxMisses: 5,
  });

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

  const submitted = await api(
    "POST",
    `/challenges/${challenge.id}/submit`,
    { proofUrl: "https://a.test/tz" },
    user.token
  );

  assert.equal(
    submitted.status,
    201,
    "the submission should be accepted"
  );

  const result = await closeMissedDays({
    challengeId: challenge.id,
  });

  const mine = result.outcomes.find(
    (o: any) => o.userId === user.id
  );

  const chargedToday = mine
    ? mine.missedDays.some(
        (d: any) =>
          d.date ===
          todayKey("Pacific/Auckland")
      )
    : false;

  assert.equal(
    chargedToday,
    false,
    "the day they submitted on must never be charged as missed"
  );

  assert.equal(
    mine ? mine.timezone : "Pacific/Auckland",
    "Pacific/Auckland",
    "the closer should judge them in their own zone"
  );
});

test("a second submission on the same local day is still refused", async () => {
  const user = await makeUser(500);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      timezone: "America/Los_Angeles",
    },
  });

  const challenge = await makeChallenge();

  await api(
    "POST",
    `/challenges/${challenge.id}/join`,
    null,
    user.token
  );

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
  assert.equal(
    second.status,
    400,
    "one proof per local day"
  );
  assert.match(
    second.body.message,
    /already submitted/i
  );
});

test("the dashboard reports the user's timezone and counts days in it", async () => {
  const user = await makeUser(500);

  await prisma.user.update({
    where: { id: user.id },
    data: { timezone: "Asia/Tokyo" },
  });

  const res = await api(
    "GET",
    "/dashboard",
    null,
    user.token
  );

  assert.equal(res.status, 200);
  assert.equal(
    res.body.timezone,
    "Asia/Tokyo"
  );

  for (const day of res.body.activity) {
    assert.match(
      day.date,
      /^\d{4}-\d{2}-\d{2}$/
    );
  }
});
