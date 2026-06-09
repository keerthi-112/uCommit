import { Router } from "express";

import {
  submitProof,
  approveSubmission,
  rejectSubmission,
} from "../controllers/submission.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.post(
  "/:id/submit",
  authMiddleware,
  submitProof
);

router.patch(
  "/submissions/:id/approve",
  authMiddleware,
  adminMiddleware,
  approveSubmission
);

router.patch(
  "/submissions/:id/reject",
  authMiddleware,
  adminMiddleware,
  rejectSubmission
);

export default router;