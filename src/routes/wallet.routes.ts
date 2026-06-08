import { Router } from "express";

import { depositMoney }
from "../controllers/wallet.controller";

import { authMiddleware }
from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/deposit",
  authMiddleware,
  depositMoney
);

export default router;