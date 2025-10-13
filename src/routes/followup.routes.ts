// src/routes/followup.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/followup.controller";

const router = Router();

// All endpoints require auth; permissions vary by action.

// List + stats
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_READ] }),
  Ctrl.listCases
);
router.get(
  "/stats",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_READ] }),
  Ctrl.stats
);

// CRUD case
router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_CREATE] }),
  Ctrl.openCase
);
router.get(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_READ] }),
  Ctrl.getCase
);
router.put(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.updateCase
);
router.post(
  "/:id/archive",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.archiveCase
);

// Status/assignment helpers
router.post(
  "/:id/assign",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_ASSIGN] }),
  Ctrl.assignCase
);
router.post(
  "/:id/pause",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.pauseCase
);
router.post(
  "/:id/resume",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.resumeCase
);
router.post(
  "/:id/resolve",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.resolveCase
);

// Tags
router.post(
  "/:id/tags/add",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.addTag
);
router.post(
  "/:id/tags/remove",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.removeTag
);

// Consent
router.post(
  "/:id/consent",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.updateConsent
);

// Cadence
router.post(
  "/:id/cadence",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.setCadence
);
router.post(
  "/:id/cadence/advance",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.advanceCadence
);

// Attempts
router.get(
  "/:id/attempts",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_READ] }),
  Ctrl.listAttempts
);
router.post(
  "/:id/attempts",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.FOLLOWUP_UPDATE] }),
  Ctrl.logAttempt
);

export default router;
