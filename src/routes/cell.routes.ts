// src/routes/cell.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/cell.controller";

const router = Router();

/* Cells */
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_READ] }),
  Ctrl.listCells
);
router.get(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_READ] }),
  Ctrl.getCell
);
router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_CREATE] }),
  Ctrl.createCell
);
router.put(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.updateCell
);
router.delete(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_DELETE] }),
  Ctrl.deleteCell
);
/* Members management */
router.post(
  "/:id/members",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.addMembers
);
router.delete(
  "/:id/members/:memberId",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_UPDATE] }),
  Ctrl.removeMember
);

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
  "/meetings/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_MEETING_UPDATE] }),
  Ctrl.updateMeeting
);
router.delete(
  "/meetings/:id",
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
router.get(
  "/analytics",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.CELL_ANALYTICS] }),
  Ctrl.analytics
);

export default router;
