import { Router } from "express";
import * as AdminCtrl from "../controllers/attendance.admin.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";

const router = Router();

/**
 * @openapi
 * tags:
 *  - name: Attendance (Admin)
 *    description: Organization-wide attendance analytics
 */

// High-level rollups for dashboards
router.get(
  "/summary",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_ADMIN_SUMMARY] }),
  AdminCtrl.summary
);

router.get(
  "/timeseries",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_ADMIN_TIMESERIES] }),
  AdminCtrl.timeseries
);

router.get(
  "/leaderboard",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_ADMIN_LEADERBOARD] }),
  AdminCtrl.leaderboard
);

export default router;
