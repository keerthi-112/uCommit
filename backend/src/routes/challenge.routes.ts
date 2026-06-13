import { Router } from "express";

import {
  createChallenge,
  getChallenges,
  joinChallenge,
  getMyChallenges,
  getLeaderboard,
  getChallengeStats,
} from "../controllers/challenge.controller";

import { authMiddleware } from "../middleware/auth.middleware";

import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.get(
  "/",
  getChallenges
);
router.get(
  "/my",
  authMiddleware,
  getMyChallenges
);

router.get(
  "/:id/leaderboard",
  getLeaderboard
);

router.get(
  "/:id/stats",
  getChallengeStats
);

router.post(
  "/:id/join",
  authMiddleware,
  joinChallenge
);

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createChallenge
);


export default router;