import { Router } from "express";
import { authMiddleware }
from "../middleware/auth.middleware";

import { getDashboard }
from "../controllers/dashboard.controller";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getDashboard
);

export default router;