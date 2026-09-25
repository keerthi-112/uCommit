import { Router } from "express";

import { getReviewQueue } from "../controllers/fraud.controller";

import { authMiddleware } from "../middleware/auth.middleware";

import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.get(
  "/review",
  authMiddleware,
  adminMiddleware,
  getReviewQueue
);

export default router;
