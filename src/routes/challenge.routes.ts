import { Router } from "express";

import {
  createChallenge,
  getChallenges,
  joinChallenge,
} from "../controllers/challenge.controller";

import { authMiddleware } from "../middleware/auth.middleware";

import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.get(
  "/",
  getChallenges
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