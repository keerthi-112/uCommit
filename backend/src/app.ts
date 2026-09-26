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

// Global middleware must run before any route, otherwise responses from
// routes mounted earlier are sent without CORS headers and the browser
// blocks them.
app.use(cors());
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
