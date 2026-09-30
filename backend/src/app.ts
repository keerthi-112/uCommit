import express from "express";
import cors from "cors";

import {
  generalLimiter,
} from "./middleware/rateLimit.middleware";

import authRoutes from "./routes/auth.routes";
import challengeRoutes from "./routes/challenge.routes";
import submissionRoutes from "./routes/submission.routes";
import walletRoutes from "./routes/wallet.routes";
import rewardRoutes from "./routes/reward.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import fraudRoutes from "./routes/fraud.routes";
import dayCloseRoutes from "./routes/dayClose.routes";
import coachRoutes from "./routes/coach.routes";

const app = express();

/**
 * Behind a load balancer every request arrives from the proxy's address.
 * Without this the rate limiter would count the whole internet as one
 * client and lock everybody out together. Only enabled when deployed
 * behind a proxy, because trusting the header when there is no proxy
 * lets a client spoof its own IP and slip the limiter.
 */
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

/**
 * Which sites may call this API from a browser.
 *
 * ALLOWED_ORIGINS is a comma separated list, e.g.
 *   https://ucommit.vercel.app,https://ucommit.com
 *
 * Left unset, any origin is accepted - fine for local development,
 * wrong once this is on the internet, so production should always set
 * it. Requests without an Origin header (curl, health checks, server to
 * server) are unaffected either way.
 */
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Global middleware must run before any route, otherwise responses from
// routes mounted earlier are sent without CORS headers and the browser
// blocks them.
app.use(
  cors(
    allowedOrigins.length === 0
      ? {}
      : {
          origin: (origin, callback) => {
            // Refuse by withholding the header rather than by throwing.
            // Throwing surfaces as a 500, so every bot probing the API
            // would look like a server fault in the logs. Without the
            // header the browser blocks the response either way.
            callback(
              null,
              !origin ||
                allowedOrigins.includes(origin)
            );
          },
        }
  )
);

app.use(express.json());

// Backstop for every route. The auth endpoints add stricter limits of
// their own in auth.routes.ts.
app.use(generalLimiter);

app.get("/", (req, res) => {
  res.send("uCommit Backend Running");
});

app.use("/auth", authRoutes);

// Both routers are mounted on /challenges. submissionRoutes stays first
// so its specific paths (/pending, /submissions/:id/...) are matched
// before challengeRoutes' parameterised ones.
app.use("/challenges", submissionRoutes);
app.use("/challenges", challengeRoutes);

app.use("/wallet", walletRoutes);

app.use("/rewards", rewardRoutes);

app.use("/dashboard", dashboardRoutes);

app.use("/fraud", fraudRoutes);

app.use("/admin", dayCloseRoutes);

app.use("/ai", coachRoutes);

export default app;
