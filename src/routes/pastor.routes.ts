import { Router } from "express";
import * as Ctrl from "../controllers/pastor.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Pastors
 *     description: Manage pastors, titles, assignments and history
 */

/**
 * @openapi
 * /pastors:
 *   get:
 *     summary: List pastors (scope-aware)
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [national,district,church] }
 *       - in: query
 *         name: nationalChurchId
 *         schema: { type: string }
 *       - in: query
 *         name: districtId
 *         schema: { type: string }
 *       - in: query
 *         name: churchId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 50 }
 *     responses:
 *       200: { description: Paginated list }
 *   post:
 *     summary: Create pastor (scope-aware)
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName,lastName,level]
 *     responses:
 *       201: { description: Created }
 */
router.route("/")
  .get(authenticate(), Ctrl.list)
  .post(authenticate(), Ctrl.create);

/**
 * @openapi
 * /pastors/{id}:
 *   get:
 *     summary: Get a pastor (scope-aware)
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 *   put:
 *     summary: Update basic fields (use /assign for moves/promotions)
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 *   delete:
 *     summary: Soft delete pastor
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 */
router.route("/:id")
  .get(authenticate(), Ctrl.get)
  .put(authenticate(), Ctrl.update)
  .delete(authenticate(), Ctrl.remove);

/**
 * @openapi
 * /pastors/{id}/assignments:
 *   get:
 *     summary: List assignment history for a pastor
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 *   post:
 *     summary: Create a new assignment (transfer/promotion)
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 */
router.route("/:id/assignments")
  .get(authenticate(), Ctrl.getAssignments)
  .post(authenticate(), Ctrl.assign);

/**
 * @openapi
 * /pastors/{id}/assignments/{assignmentId}/end:
 *   patch:
 *     summary: End/close an assignment
 *     tags: [Pastors]
 *     security: [ { bearerAuth: [] } ]
 */
router.patch("/:id/assignments/:assignmentId/end", authenticate(), Ctrl.endAssignment);

export default router;
