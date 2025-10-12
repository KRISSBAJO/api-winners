import { Router } from "express";
import multer from "multer";
import * as Ctrl from "../controllers/event.controller";
import { authenticate } from "../middleware/auth";

const upload = multer({ dest: "uploads/" });
const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Manage church events, public listings, likes, and comments
 */

/**
 * @openapi
 * /events/public:
 *   get:
 *     summary: Public list of events (visibility=public)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Service,BibleStudy,Conference,Outreach,Meeting] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: tags
 *         description: Comma-separated tags (e.g. "youth,men")
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [startDate,-startDate,createdAt,-createdAt], default: startDate }
 *     responses:
 *       200:
 *         description: Paginated list
 */
router.get("/public", Ctrl.listPublic);

/**
 * @openapi
 * /events/{id}/public:
 *   get:
 *     summary: Public event details (visibility=public)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event
 *       404:
 *         description: Not found
 */
router.get("/:id/public", Ctrl.getPublic);

/**
 * @openapi
 * /events:
 *   get:
 *     summary: List events (authorized)
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: churchId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: visibility
 *         schema: { type: string, enum: [public,private,unlisted] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [startDate,-startDate,createdAt,-createdAt], default: startDate }
 *     responses:
 *       200:
 *         description: Paginated list
 *   post:
 *     summary: Create event
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [churchId, title, type, startDate]
 *             properties:
 *               churchId: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               type: { type: string, enum: [Service,BibleStudy,Conference,Outreach,Meeting] }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               location: { type: string }
 *               visibility: { type: string, enum: [public,private,unlisted] }
 *               tags:
 *                 type: string
 *                 example: "youth,men"
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 */
router
  .route("/")
  .get(authenticate(), Ctrl.list)
  .post(
    authenticate(),
    upload.single("cover"),
    // (optional) quick CSV → array normalization; controller also tolerates JSON string
    (req, _res, next) => {
      if (typeof req.body.tags === "string") {
        req.body.tags = req.body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      next();
    },
    Ctrl.create
  );

/**
 * @openapi
 * /events/{id}:
 *   get:
 *     summary: Get event by ID (authorized)
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               type: { type: string }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               location: { type: string }
 *               visibility: { type: string }
 *               tags: { type: string, example: "youth,men" }
 *               cover: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Soft delete event
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Deleted
 */
router
  .route("/:id")
  .get(authenticate(), Ctrl.get)
  .put(
    authenticate(),
    upload.single("cover"),
    (req, _res, next) => {
      if (typeof req.body.tags === "string") {
        req.body.tags = req.body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      next();
    },
    Ctrl.update
  )
  .delete(authenticate(), Ctrl.remove);

/**
 * @openapi
 * /events/{id}/like:
 *   post:
 *     summary: Like event
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/:id/like", authenticate(), Ctrl.like);

/**
 * @openapi
 * /events/{id}/unlike:
 *   post:
 *     summary: Unlike event
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/:id/unlike", authenticate(), Ctrl.unlike);

/**
 * @openapi
 * /events/{id}/comments:
 *   post:
 *     summary: Add comment
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/:id/comments", authenticate(), Ctrl.addComment);

/**
 * @openapi
 * /events/{id}/comments/{commentId}:
 *   put:
 *     summary: Update own comment
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 *   delete:
 *     summary: Delete own comment
 *     tags: [Events]
 *     security: [ { bearerAuth: [] } ]
 */
router
  .route("/:id/comments/:commentId")
  .put(authenticate(), Ctrl.updateComment)
  .delete(authenticate(), Ctrl.deleteComment);

export default router;
