# Deploying uCommit

Three things have to go live: a **PostgreSQL database**, the **API**, and
the **web app**. They can be on different hosts.

Everything below assumes the monorepo layout (`backend/` and `frontend/`
at the root).

---

## Before you start — read this

**The wallet is not real money.** There is no payment provider. Balances
are added by an endpoint that just increments a number. If you put this
in front of other people, say so plainly, or someone will think they
have deposited something.

**Remove the test data first.** The development database has accounts
created during building — `review-admin@example.com`, `proof-demo@…`,
and several `[TEST]` / `[demo]` challenges. Don't carry them into
production. A fresh production database starts empty, which is what you
want.

**Generate a real `JWT_SECRET`.** Anyone who knows it can mint a token
for any account, including an admin. Never reuse the development one.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 1. The database

Any managed PostgreSQL works. Neon, Supabase and Railway all have free
tiers that suit this.

Create one, then copy its connection string. It looks like:

```
postgresql://user:password@host:5432/dbname?sslmode=require
```

That value becomes `DATABASE_URL`.

---

## 2. The API

Render and Railway both deploy a Node service straight from GitHub. Point
the service at the repo and set:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |

### Environment variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | from step 1 | |
| `JWT_SECRET` | the random value you generated | never the dev one |
| `NODE_ENV` | `production` | turns the rate limiter on fully |
| `TRUST_PROXY` | `true` | **required.** Without it the rate limiter treats every visitor as one IP and locks them all out together |
| `ALLOWED_ORIGINS` | your web app URL | e.g. `https://ucommit.vercel.app`. Leave unset and **any site on the internet can call your API with a logged-in user's browser** |
| `PORT` | usually set by the host | read, don't hardcode |
| `ENABLE_DAY_CLOSE` | `false` to start | see step 5 |
| `ANTHROPIC_API_KEY` | optional | without it the AI coach hides itself |

### Run the migrations

Once, against the production database:

```bash
cd backend
DATABASE_URL="<your production url>" npm run migrate:deploy
```

Use `migrate:deploy`, never `migrate dev` — `dev` can prompt to reset the
database, which on production means deleting everything.

---

## 3. The web app

Vercel, Netlify and Cloudflare Pages all work. Set:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

### The one variable that matters

```
VITE_API_URL=https://your-api-host.onrender.com
```

**Vite bakes this into the bundle at build time, not at run time.** Set
it before the build, or the deployed site will call `localhost:5000` and
every page will show its error state. Changing it later means
rebuilding.

### Single-page app routing

Routes like `/challenges/abc123` are handled by React Router, not by
files on disk. The host has to serve `index.html` for any unmatched path
or a refresh on a deep link returns 404.

- **Vercel** — add `frontend/vercel.json`:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Netlify** — add `frontend/public/_redirects`:
  ```
  /*  /index.html  200
  ```

---

## 4. Close the loop

Once both are up, go back to the API and set `ALLOWED_ORIGINS` to the
real web app URL, then redeploy it. Until you do, the browser will block
every request.

Check it works:

```bash
curl https://your-api-host.onrender.com/
# -> uCommit Backend Running
```

Then open the web app and register an account.

---

## 5. Make yourself an admin

Roles are only set in the database; there is no UI for it. After
registering through the app:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Sign out and back in — the role is carried in the token, so an existing
session keeps the old one.

Admins get the **Review** tab: pending proof, approve and reject, and the
fraud queue.

---

## 6. Turning on automatic penalties

`ENABLE_DAY_CLOSE=false` by default, deliberately. When true, the server
charges people for missed days **with nobody pressing a button**. Turn it
on only when you are ready for that.

Try it by hand first. As an admin:

```bash
# Dry run - reports what it would charge, changes nothing
curl -X POST https://your-api/admin/close-days \
  -H "Authorization: Bearer <your token>" \
  -H "Content-Type: application/json" -d '{}'
```

When the output looks right, set `ENABLE_DAY_CLOSE=true` and
`DAY_CLOSE_INTERVAL_HOURS=6`. The job is idempotent, so running it more
than once a day cannot double-charge anyone.

---

## Checklist

- [ ] Managed PostgreSQL created, `DATABASE_URL` copied
- [ ] Fresh `JWT_SECRET` generated
- [ ] API deployed with `TRUST_PROXY=true` and `NODE_ENV=production`
- [ ] `npm run migrate:deploy` run against production
- [ ] Web app built with `VITE_API_URL` set
- [ ] SPA rewrite rule added
- [ ] `ALLOWED_ORIGINS` set to the web app URL, API redeployed
- [ ] Registered, then promoted yourself to ADMIN
- [ ] Created a real challenge through the Review side
- [ ] Decided about `ENABLE_DAY_CLOSE`

---

## What still isn't ready for real users

- **No payments.** Wallet money is fake.
- **Proof isn't verified.** A link is taken at face value until a human
  looks at it.
- **No password reset.** A locked-out user needs a database edit.
- **No email.** Nothing notifies anyone of anything.
- **Fraud detection is unmeasured.** It flags for review; it has never
  been scored against confirmed cases.
