import { Router } from "express";

import {
  submitProof,
  approveSubmission,
  rejectSubmission,
  getPendingSubmissions,
} from "../controllers/submission.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

router.post(
  "/:id/submit",
  authMiddleware,
  submitProof
);
router.post(
  "/submissions/:id/approve",
  authMiddleware,
  adminMiddleware,
  approveSubmission
);

router.post(
  "/submissions/:id/reject",
  authMiddleware,
  adminMiddleware,
  rejectSubmission
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

router.get(
  "/pending",
  authMiddleware,
  adminMiddleware,
  getPendingSubmissions
);

export default router;