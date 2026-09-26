import { Router } from "express";

import {
  completeChallenge,
  getRewardHistory,
} from "../controllers/reward.controller";

import { authMiddleware }
from "../middleware/auth.middleware";

import { adminMiddleware }
from "../middleware/admin.middleware";

const router = Router();

router.post(
  "/:id/complete",
  authMiddleware,
  adminMiddleware,
  completeChallenge
);

router.get(
  "/history",
  authMiddleware,
  getRewardHistory
);

export default router;