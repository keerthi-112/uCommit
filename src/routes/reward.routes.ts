import { Router } from "express";

import { completeChallenge }
from "../controllers/reward.controller";

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

export default router;