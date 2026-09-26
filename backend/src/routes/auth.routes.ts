import { Router } from "express";

import {
  register,
  login,
  me,
  updateTimezone,
} from "../controllers/auth.controller";

import { authMiddleware } from "../middleware/auth.middleware";

import {
  loginLimiter,
  registerLimiter,
} from "../middleware/rateLimit.middleware";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  register
);

router.post(
  "/login",
  loginLimiter,
  login
);

router.get(
  "/me",
  authMiddleware,
  me
);

router.put(
  "/timezone",
  authMiddleware,
  updateTimezone
);

export default router;