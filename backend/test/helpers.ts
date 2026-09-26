/**
 * Shared setup for the integration tests.
 *
 * These tests run against a REAL running server and a REAL database.
 * Start the server first (npm run dev), then run: npm test
 *
 * Every fixture created here is tracked and deleted again in cleanup(),
 * so the tests do not leave rows behind in your development database.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BASE =
  process.env.TEST_BASE_URL ||
  "http://localhost:5000";

const TEST_PASSWORD = "testpass123";

// Ids of everything this run created, so cleanup can remove exactly that.
const created: {
  userIds: string[];
  challengeIds: string[];
} = {
  userIds: [],
  challengeIds: [],
};

interface ApiResult {
  status: number;
  headers: Headers;
  body: any;
}

/** Calls the API over HTTP, the same way the browser does. */
async function api(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
      ...(token
        ? {
            Authorization:
              "Bearer " + token,
          }
        : {}),
    },
    ...(body
      ? { body: JSON.stringify(body) }
      : {}),
  });

  let parsed: any = null;

  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: parsed,
  };
}

/** Fails loudly and usefully if the server is not up. */
async function ensureServer() {
  try {
    await fetch(BASE + "/");
  } catch {
    throw new Error(
      `Cannot reach the backend at ${BASE}.\n` +
        `Start it first:  npm run dev`
    );
  }
}

interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Registers a real user through the API, optionally funding the wallet. */
async function makeUser(
  balance = 0
): Promise<TestUser> {
  const email =
    "test-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8) +
    "@ucommit.test";

  const res = await api(
    "POST",
    "/auth/register",
    {
      name: "Test User",
      email,
      password: TEST_PASSWORD,
    }
  );

  if (res.status !== 201) {
    throw new Error(
      "could not register test user: " +
        JSON.stringify(res.body)
    );
  }

  created.userIds.push(res.body.user.id);

  if (balance > 0) {
    await api(
      "POST",
      "/wallet/deposit",
      { amount: balance },
      res.body.token
    );
  }

  return {
    id: res.body.user.id,
    email,
    token: res.body.token,
  };
}

/** Creates a challenge. Defaults to one that is open and running today. */
async function makeChallenge(
  overrides: Record<string, any> = {}
) {
  const challenge =
    await prisma.challenge.create({
      data: {
        title:
          "[test] " +
          Math.random()
            .toString(36)
            .slice(2, 8),
        description:
          "Created by the test suite.",
        entryFee: 100,
        penaltyPercentage: 10,
        maxMisses: 2,
        startDate: new Date(
          Date.now() - 86400000
        ),
        endDate: new Date(
          Date.now() + 30 * 86400000
        ),
        ...overrides,
      },
    });

  created.challengeIds.push(
    challenge.id
  );

  return challenge;
}

/** Reads a wallet straight from the database, bypassing the API. */
async function walletOf(
  userId: string
) {
  return prisma.wallet.findUnique({
    where: { userId },
  });
}

/** Removes every row this test run created, children first. */
async function cleanup() {
  const { userIds, challengeIds } =
    created;

  const scope = {
    OR: [
      { userId: { in: userIds } },
      {
        challengeId: {
          in: challengeIds,
        },
      },
    ],
  };

  await prisma.dailySubmission.deleteMany(
    { where: scope }
  );

  // MissedDay points at the participant, so it has to go first.
  const participants =
    await prisma.challengeParticipant.findMany(
      {
        where: scope,
        select: { id: true },
      }
    );

  await prisma.missedDay.deleteMany({
    where: {
      participantId: {
        in: participants.map(
          (p: { id: string }) => p.id
        ),
      },
    },
  });

  await prisma.challengeParticipant.deleteMany(
    { where: scope }
  );

  await prisma.challengePayout.deleteMany(
    { where: scope }
  );

  await prisma.walletTransaction.deleteMany(
    { where: { userId: { in: userIds } } }
  );

  await prisma.wallet.deleteMany({
    where: { userId: { in: userIds } },
  });

  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });

  await prisma.challenge.deleteMany({
    where: { id: { in: challengeIds } },
  });

  await prisma.$disconnect();
}

module.exports = {
  api,
  prisma,
  BASE,
  TEST_PASSWORD,
  ensureServer,
  makeUser,
  makeChallenge,
  walletOf,
  cleanup,
};
