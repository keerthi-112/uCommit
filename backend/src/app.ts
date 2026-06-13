import submissionRoutes from "./routes/submission.routes";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import challengeRoutes from "./routes/challenge.routes";
import walletRoutes from "./routes/wallet.routes";
import rewardRoutes
from "./routes/reward.routes";

const app = express();
app.use(express.json());
app.use(
  "/challenges",
  submissionRoutes
);
app.use(cors());
app.use(express.json());

app.use(
  "/rewards",
  rewardRoutes
);

app.get("/", (req, res) => {
  res.send("uCommit Backend Running");
});

app.use("/auth", authRoutes);

app.use(
  "/challenges",
  challengeRoutes
);

app.use(
  "/wallet",
  walletRoutes
);

export default app;