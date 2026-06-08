import { Router } from "express";
import { createChallenge } from "../controllers/challenge.controller";

const router = Router();

router.post(
  "/",
  createChallenge
);

export default router;