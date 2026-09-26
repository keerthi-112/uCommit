import { Router } from "express";

import {
  getCoachMessage,
  getCoachStatus,
} from "../controllers/coach.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/status",
  authMiddleware,
  getCoachStatus
);

router.get(
  "/coach",
  authMiddleware,
  getCoachMessage
);

export default router;
