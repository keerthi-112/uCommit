import { Router } from "express";

import { submitProof } from "../controllers/submission.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/:id/submit",
  authMiddleware,
  submitProof
);

export default router;