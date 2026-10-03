import path from "path";
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

const api = express.Router();

// Backstop for every route. The auth endpoints add stricter limits of
// their own in auth.routes.ts.
api.use(generalLimiter);

api.get("/", (req, res) => {
  res.send("uCommit Backend Running");
});

api.use("/auth", authRoutes);

// Both routers are mounted on /challenges. submissionRoutes stays first
// so its specific paths (/pending, /submissions/:id/...) are matched
// before challengeRoutes' parameterised ones.
api.use("/challenges", submissionRoutes);
api.use("/challenges", challengeRoutes);

api.use("/wallet", walletRoutes);

api.use("/rewards", rewardRoutes);

api.use("/dashboard", dashboardRoutes);

api.use("/fraud", fraudRoutes);

api.use("/admin", dayCloseRoutes);

api.use("/ai", coachRoutes);

/**
 * FRONTEND_DIST, when set, is the built web app (frontend/dist). The
 * API then lives under /api and every other path serves the app, so
 * one service hosts both on one origin. React Router owns paths like
 * /challenges/:id, which would otherwise collide with the API's.
 *
 * Unset, as in local development and the tests, the API stays at the
 * root.
 */
const frontendDist = process.env.FRONTEND_DIST;

if (frontendDist) {
  const root = path.resolve(frontendDist);

  app.use("/api", api);
  app.use(express.static(root));

  // Deep links and refreshes are routes, not files on disk.
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(root, "index.html"));
  });
} else {
  app.use(api);
}

export default app;
