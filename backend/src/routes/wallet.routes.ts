import { Router } from "express";

import { depositMoney, getWallet }
from "../controllers/wallet.controller";

import { authMiddleware }
from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getWallet
);

router.post(
  "/deposit",
  authMiddleware,
  depositMoney
);

export default router;