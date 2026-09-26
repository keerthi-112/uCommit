import { Router } from "express";

import { closeDays } from "../controllers/dayClose.controller";

import { authMiddleware } from "../middleware/auth.middleware";

import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.post(
  "/close-days",
  authMiddleware,
  adminMiddleware,
  closeDays
);

export default router;
