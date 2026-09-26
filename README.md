# uCommit

An accountability platform where people commit money to a goal, submit
proof every day, and are held to it.

Traditional habit trackers let you tick a box or skip a day with no
consequence. uCommit adds a stake, daily evidence, human review, and a
community you are measured against.

---

## How it works

1. You add money to your wallet and join a challenge, committing its
   entry fee as your stake.
2. Every day you submit proof that you did the thing.
3. A reviewer approves or rejects each proof. A rejection costs a
   percentage of your remaining stake and counts as a miss.
4. A day you submit nothing at all is closed out the same way.
5. Exceed the challenge's allowed misses and you are eliminated.
6. When the challenge ends, stakes are returned and the penalty pool is
   shared out between the people who showed up, by tier.

Days are the user's own calendar days, in their own timezone. Machine
learning flags participation worth a second look, and an optional AI
coach explains your own numbers back to you.

---

## Stack

| Layer | |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Node, Express 5, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT, bcrypt |
| ML | Isolation Forest (implemented in TypeScript, no Python service) |
| AI | Anthropic SDK (optional) |

---

## Running it locally

You need Node 22+ and a running PostgreSQL instance.

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev      # creates the schema
npm run dev                 # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The backend must be running first. Without it every page shows its
error state.

---

## Configuration

All configuration is by environment variable. See `backend/.env.example`
and `frontend/.env.example` for the full list with comments.

The two that decide behaviour rather than connectivity:

- **`ENABLE_DAY_CLOSE`** - when `true`, the server automatically
  penalises elapsed days that had no submission. This moves real money
  with nobody pressing a button, so it is **off by default**. Admins can
  always run it by hand via `POST /admin/close-days`, which dry runs
  unless sent `{ "apply": true }`.
- **`ANTHROPIC_API_KEY`** - enables the AI coach. Without it the coach
  endpoints report that they are not configured, the panel does not
  render, and nothing else is affected.

`frontend/.env.example` holds `VITE_API_URL`. Vite inlines it at **build
time**, so it must be set before `npm run build` or the production
bundle will point at `localhost`.

---

## Tests

```bash
cd backend
npm run dev      # in one terminal - the tests run against a real server
npm test         # in another
npm run typecheck
```

83 integration tests covering the money path, submissions, privacy
boundaries, fraud signals, missed-day close-out and registration. They
run against a real database and delete every row they create.

---

## Project layout

```
backend/
  prisma/schema.prisma        data model and migrations
  src/controllers/            request handlers
  src/services/
    challengeDayCloser.ts     missed day penalties
    fraud/                    features, rules, Isolation Forest, scoring
    ai/coach.ts               the AI coach
  src/jobs/dayCloseJob.ts     optional scheduled close-out
  test/                       integration tests
frontend/
  src/theme.ts                design tokens - colour, spacing, type scale
  src/components/ui/          Card, Button, Input, Badge, StatTile
  src/pages/                  one file per screen
  src/components/             layout, nav, route guards, coach panel
  src/services/api.ts         axios client with the JWT interceptor
```

---

## Fraud detection

There is no labelled history of confirmed cheating to train a classifier
on, so detection combines two signals:

- **Explainable rules** - repeated evidence (after normalising the URL),
  near-duplicate proof, submissions seconds apart, uniform daily timing,
  and a high rate of already-rejected proof. Each states its reason in a
  sentence.
- **Isolation Forest** - unsupervised anomaly detection over per-user
  behavioural features, for patterns nobody wrote a rule for. It refuses
  to run below eight participants rather than return a meaningless
  score.

Rules carry most of the weight, because a flag nobody can explain is a
flag nobody can act on fairly. The model can raise a participant's score
but can never flag them on its own.

**Nothing here penalises anyone.** `GET /fraud/review` is admin-only and
produces a ranked list for a human. Stakes, misses and elimination are
untouched by it.

Its accuracy on real users is unmeasured, and will stay that way until
there are reviewed outcomes to measure against. The tests prove the
algorithm is implemented correctly, not that detection works in
production.

---

## The AI coach

Optional, off unless `ANTHROPIC_API_KEY` is set.

The model never computes anything. Streaks, consistency, misses and
money are calculated by tested code; Claude receives the finished
numbers and only puts them into words. It is sent the minimum necessary
data - one user's own aggregate figures, with no email, no user id, no
proof URLs and no other participant's activity.

---

## Status

Working: registration, authentication, challenge discovery and joining,
wallet and deposits, daily proof submission, admin review, missed-day
close-out, fraud detection, dashboard analytics, leaderboards.

Not built yet:

- No payment provider. Wallet balances are test money.
- Proof is a URL. There is no upload or image verification.
- Eliminated participants' remaining stake is not redistributed at
  payout.
- Proof is only reviewed by a human; there is no automatic checking of
  what a link actually contains.
