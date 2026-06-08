import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import challengeRoutes from "./routes/challenge.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("uCommit Backend Running");
});

app.use("/auth", authRoutes);

app.use(
  "/challenges",
  challengeRoutes
);

export default app;