import { Router } from "express";
import * as Ctrl from "../controllers/attendance.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Attendance
 *     description: Track per-service attendance and generate summaries
 */

/**
 * @openapi
 * /attendance:
 *   get:
 *     summary: List attendance entries (paginated)
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         schema: { type: string }
 *       - in: query
 *         name: serviceType
 *         schema: { type: string, enum: [Sunday,Midweek,PrayerMeeting,Vigil,Conference,Special,Other] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [serviceDate,-serviceDate,createdAt,-createdAt], default: -serviceDate }
 *     responses:
 *       200:
 *         description: Paginated result
 */
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_READ] }),
  Ctrl.list
);

/**
 * @openapi
 * /attendance:
 *   post:
 *     summary: Create an attendance entry
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [churchId, serviceDate, serviceType]
 *             properties:
 *               churchId: { type: string }
 *               serviceDate: { type: string, format: date }
 *               serviceType: { type: string, enum: [Sunday,Midweek,PrayerMeeting,Vigil,Conference,Special,Other] }
 *               men: { type: number }
 *               women: { type: number }
 *               children: { type: number }
 *               firstTimers: { type: number }
 *               newConverts: { type: number }
 *               holyGhostBaptisms: { type: number }
 *               online: { type: number }
 *               ushers: { type: number }
 *               choir: { type: number }
 *               notes: { type: string }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_CREATE] }),
  Ctrl.create
);

/**
 * @openapi
 * /attendance/upsert:
 *   post:
 *     summary: Upsert by churchId + serviceDate + serviceType (merge/replace fields)
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [churchId, serviceDate, serviceType]
 *     responses:
 *       200:
 *         description: Upserted doc
 */
router.post(
  "/upsert",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_UPDATE, PERMISSIONS.ATTENDANCE_CREATE] }),
  Ctrl.upsert
);

/**
 * @openapi
 * /attendance/summary:
 *   get:
 *     summary: Summary totals (range) + by serviceType
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  "/summary",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_SUMMARY] }),
  Ctrl.summary
);

/**
 * @openapi
 * /attendance/timeseries:
 *   get:
 *     summary: Daily time series totals and categories
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: serviceType
 *         schema: { type: string, enum: [Sunday,Midweek,PrayerMeeting,Vigil,Conference,Special,Other] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 */
router.get(
  "/timeseries",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_TIMESERIES] }),
  Ctrl.timeseriesDaily
);

/**
 * @openapi
 * /attendance/weekly:
 *   get:
 *     summary: Weekly aggregates (ISO week)
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 */
router.get(
  "/weekly",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_WEEKLY] }),
  Ctrl.byWeek
);

/**
 * @openapi
 * /attendance/export:
 *   get:
 *     summary: Export CSV for a date range
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: serviceType
 *         schema: { type: string, enum: [Sunday,Midweek,PrayerMeeting,Vigil,Conference,Special,Other] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv: {}
 */
router.get(
  "/export",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_EXPORT] }),
  Ctrl.exportCSV
);

/**
 * @openapi
 * /attendance/{id}:
 *   get:
 *     summary: Get attendance by id
 *     tags: [Attendance]
 *   put:
 *     summary: Update attendance
 *     tags: [Attendance]
 *   delete:
 *     summary: Soft delete attendance
 *     tags: [Attendance]
 */
router
  .route("/:id")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_READ] }),
    Ctrl.get
  )
  .put(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_UPDATE] }),
    Ctrl.update
  )
  .delete(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ATTENDANCE_DELETE] }),
    Ctrl.remove
  );



export default router;
