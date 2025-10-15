// src/routes/cell.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/cell.controller";

const router = Router();

/* ===== Collection ===== */
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_READ] }),
  Ctrl.listCells
);

router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_CREATE] }),
  Ctrl.createCell
);

/* ===== Static prefixes FIRST (avoid being captured by '/:id') ===== */

/* Meetings */
router.get(
  "/meetings",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_READ] }),
  Ctrl.listMeetings
);
router.post(
  "/meetings",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_MEETING_CREATE] }),
  Ctrl.scheduleMeeting
);
router.put(
  "/meetings/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_MEETING_UPDATE] }),
  Ctrl.updateMeeting
);
router.delete(
  "/meetings/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_MEETING_DELETE] }),
  Ctrl.deleteMeeting
);

/* Reports */
router.get(
  "/reports",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_REPORT_READ] }),
  Ctrl.listReports
);
router.post(
  "/reports",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_REPORT_SUBMIT] }),
  Ctrl.submitReport
);

router.put(
  "/reports/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_REPORT_UPDATE] }),
  Ctrl.updateReport
);

router.delete(
  "/reports/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_REPORT_DELETE] }),
  Ctrl.deleteReport
);

/* Analytics */
router.get(
  "/analytics",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_ANALYTICS] }),
  Ctrl.analytics
);

/* ===== Item-scoped routes (constrain to ObjectId) ===== */

/* Members management */
router.post(
  "/:id([0-9a-fA-F]{24})/members",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.addMembers
);
router.delete(
  "/:id([0-9a-fA-F]{24})/members/:memberId([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.removeMember
);

/* Single item — KEEP LAST */
router.get(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_READ] }),
  Ctrl.getCell
);
router.put(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.updateCell
);
router.delete(
  "/:id([0-9a-fA-F]{24})",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_DELETE] }),
  Ctrl.deleteCell
);

export default router;
