/**
 * Closing out missed days.
 *
 * This is the only place money leaves a stake without a person
 * deciding it, so these tests care most about the ways that could go
 * wrong: charging twice, charging for today, charging before someone
 * joined, or charging a day they actually showed up for.
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
  closeMissedDays,
} = require("../src/services/challengeDayCloser.ts");

before(ensureServer);
after(cleanup);

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/** A participant who joined `joinedDaysAgo` ago, with given submissions. */
async function setup(
  joinedDaysAgo: number,
  submissionDaysAgo: number[],
  challengeOverrides: any = {}
) {
  const user = await makeUser(500);

  const challenge = await makeChallenge({
    startDate: daysAgo(
      joinedDaysAgo,
      0
    ),
    endDate: daysAgo(-20, 0),
    entryFee: 100,
    penaltyPercentage: 10,
    maxMisses: 2,
    ...challengeOverrides,
  });

  const participant =
    await prisma.challengeParticipant.create(
      {
        data: {
          userId: user.id,
          challengeId: challenge.id,
          currentStake:
            challenge.entryFee,
          joinedAt: daysAgo(
            joinedDaysAgo,
            0
          ),
        },
      }
    );

  if (submissionDaysAgo.length > 0) {
    await prisma.dailySubmission.createMany(
      {
        data: submissionDaysAgo.map(
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

  return { user, challenge, participant };
}

const reload = (id: string) =>
  prisma.challengeParticipant.findUnique({
    where: { id },
  });

test("a dry run reports the penalty but changes nothing", async () => {
  // Joined 3 days ago, submitted nothing: days -3, -2 and -1 elapsed.
  const { challenge, participant } =
    await setup(3, []);

  const result = await closeMissedDays({
    challengeId: challenge.id,
  });

  assert.equal(result.dryRun, true);
  assert.equal(
    result.participantsAffected,
    1
  );
  assert.equal(
    result.daysPenalised,
    3
  );

  const after = await reload(
    participant.id
  );

  assert.equal(
    after.currentStake,
    100,
    "a dry run must not touch the stake"
  );
  assert.equal(after.misses, 0);
  assert.equal(
    after.eliminated,
    false
  );

  assert.equal(
    await prisma.missedDay.count({
      where: {
        participantId: participant.id,
      },
    }),
    0,
    "a dry run must not write audit rows"
  );
});

test("applying charges each missed day, compounding on what is left", async () => {
  const { challenge, participant } =
    await setup(3, []);

  const result = await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  assert.equal(
    result.daysPenalised,
    3
  );

  const after = await reload(
    participant.id
  );

  // 100 -> 90 -> 81 -> 72.90, at 10% of the remaining stake each time.
  assert.equal(
    Number(
      after.currentStake.toFixed(2)
    ),
    72.9
  );

  assert.equal(after.misses, 3);

  assert.equal(
    after.eliminated,
    true,
    "3 misses exceeds maxMisses of 2"
  );

  assert.equal(
    await prisma.missedDay.count({
      where: {
        participantId: participant.id,
      },
    }),
    3
  );
});

test("running twice does not charge twice", async () => {
  const { challenge, participant } =
    await setup(2, []);

  await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  const afterFirst = await reload(
    participant.id
  );

  const second = await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  const afterSecond = await reload(
    participant.id
  );

  assert.equal(
    second.daysPenalised,
    0,
    "the second run should find nothing left to do"
  );

  assert.equal(
    afterSecond.currentStake,
    afterFirst.currentStake,
    "the stake must be identical after a repeat run"
  );

  assert.equal(
    afterSecond.misses,
    afterFirst.misses
  );
});

test("today is never counted, because it is not over", async () => {
  // Joined today, nothing submitted yet.
  const { challenge, participant } =
    await setup(0, []);

  const result = await closeMissedDays({
    challengeId: challenge.id,
  });

  assert.equal(
    result.daysPenalised,
    0,
    "the current day must not be judged"
  );

  const after = await reload(
    participant.id
  );

  assert.equal(after.misses, 0);
});

test("days before the participant joined are not counted", async () => {
  const user = await makeUser(500);

  // Challenge opened 10 days ago, they joined 2 days ago.
  const challenge = await makeChallenge({
    startDate: daysAgo(10, 0),
    endDate: daysAgo(-20, 0),
    entryFee: 100,
    penaltyPercentage: 10,
    maxMisses: 5,
  });

  const participant =
    await prisma.challengeParticipant.create(
      {
        data: {
          userId: user.id,
          challengeId: challenge.id,
          currentStake: 100,
          joinedAt: daysAgo(2, 0),
        },
      }
    );

  const result = await closeMissedDays({
    challengeId: challenge.id,
  });

  const mine = result.outcomes.find(
    (o: any) =>
      o.participantId === participant.id
  );

  assert.equal(
    mine.missedDays.length,
    2,
    "only the 2 days since joining, not the 10 since it opened"
  );
});

test("a day with a submission is not a missed day", async () => {
  // Joined 3 days ago, submitted on two of the three elapsed days.
  const { challenge, participant } =
    await setup(3, [3, 2]);

  const result = await closeMissedDays({
    challengeId: challenge.id,
  });

  const mine = result.outcomes.find(
    (o: any) =>
      o.participantId === participant.id
  );

  assert.equal(
    mine.missedDays.length,
    1,
    "only the day they skipped should count"
  );

  assert.equal(
    startOfDay(
      new Date(
        mine.missedDays[0].date
      )
    ).getTime(),
    startOfDay(daysAgo(1)).getTime(),
    "and it should be the right day"
  );
});

test("a participant who submits every day is untouched", async () => {
  const { challenge, participant } =
    await setup(3, [3, 2, 1]);

  const result = await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  assert.equal(
    result.participantsAffected,
    0
  );

  const after = await reload(
    participant.id
  );

  assert.equal(after.currentStake, 100);
  assert.equal(after.misses, 0);
});

test("penalties stop once the participant is eliminated", async () => {
  // 6 elapsed days, nothing submitted, eliminated after 2 misses.
  const { challenge, participant } =
    await setup(6, [], {
      maxMisses: 2,
    });

  await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  const after = await reload(
    participant.id
  );

  assert.equal(
    after.eliminated,
    true
  );

  assert.equal(
    after.misses,
    3,
    "elimination happens on the miss that exceeds the limit, then charging stops"
  );

  // 100 -> 90 -> 81 -> 72.90, and no further days charged.
  assert.equal(
    Number(
      after.currentStake.toFixed(2)
    ),
    72.9,
    "an eliminated participant must not keep being charged"
  );

  assert.equal(
    await prisma.missedDay.count({
      where: {
        participantId: participant.id,
      },
    }),
    3
  );
});

test("an already eliminated participant is skipped entirely", async () => {
  const { challenge, participant } =
    await setup(4, []);

  await prisma.challengeParticipant.update(
    {
      where: { id: participant.id },
      data: { eliminated: true },
    }
  );

  const result = await closeMissedDays({
    dryRun: false,
    challengeId: challenge.id,
  });

  assert.equal(
    result.participantsAffected,
    0
  );

  const after = await reload(
    participant.id
  );

  assert.equal(after.currentStake, 100);
});

test("the endpoint is admin only and dry runs unless told otherwise", async () => {
  const user = await makeUser(0);

  assert.equal(
    (
      await api(
        "POST",
        "/admin/close-days"
      )
    ).status,
    401
  );

  assert.equal(
    (
      await api(
        "POST",
        "/admin/close-days",
        {},
        user.token
      )
    ).status,
    403
  );

  const { challenge, participant } =
    await setup(2, []);

  const admin = await makeAdmin();

  const res = await api(
    "POST",
    "/admin/close-days",
    { challengeId: challenge.id },
    admin.token
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.dryRun, true);
  assert.match(
    res.body.message,
    /Dry run/
  );

  const after = await reload(
    participant.id
  );

  assert.equal(
    after.currentStake,
    100,
    "a POST with no apply flag must not move money"
  );
});

/** Creates an admin. Registers through the API, then grants the role. */
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
