import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/demo.controller";

const router = Router();

// Public submission (rate-limited)
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
router.post("/public", publicLimiter, Ctrl.publicCreate);

// Admin (private)
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ADMIN] }),
  Ctrl.adminList
);
router.get(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ADMIN] }),
  Ctrl.adminGet
);
router.put(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ADMIN] }),
  Ctrl.adminUpdate
);
router.delete(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ADMIN] }),
  Ctrl.adminDelete
);

export default router;
