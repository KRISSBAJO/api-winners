import { Router } from "express";
import * as Ctrl from "../controllers/volunteerGroup.controller";
import { authenticate } from "../middleware/auth"; // ✅ enable auth

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: VolunteerGroups
 *     description: Manage volunteer/ministry groups within a church
 */

/**
 * @openapi
 * /volunteer-groups:
 *   get:
 *     summary: List all volunteer groups
 *     tags: [VolunteerGroups]
 *     responses:
 *       200:
 *         description: List of groups
 *   post:
 *     summary: Create a volunteer group
 *     tags: [VolunteerGroups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [churchId, name]
 *             properties:
 *               churchId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router
  .route("/")
  .get(authenticate(), Ctrl.list)
  .post(authenticate(), Ctrl.create);

/**
 * @openapi
 * /volunteer-groups/church/{churchId}:
 *   get:
 *     summary: List groups by church
 *     tags: [VolunteerGroups]
 *     parameters:
 *       - in: path
 *         name: churchId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Groups for the church
 */
router.get("/church/:churchId", authenticate(), Ctrl.listByChurch);

/**
 * @openapi
 * /volunteer-groups/{id}:
 *   get:
 *     summary: Get a group
 *     tags: [VolunteerGroups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *   put:
 *     summary: Update a group
 *     tags: [VolunteerGroups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VolunteerGroup'
 *   delete:
 *     summary: Delete a group
 *     tags: [VolunteerGroups]
 *     responses:
 *       200:
 *         description: Deleted
 */
router
  .route("/:id")
  .get(authenticate(), Ctrl.get)
  .put(authenticate(), Ctrl.update)
  .delete(authenticate(), Ctrl.remove);

/**
 * @openapi
 * /volunteer-groups/{id}/members:
 *   post:
 *     summary: Add a member to the group
 *     tags: [VolunteerGroups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId]
 *             properties:
 *               memberId: { type: string }
 *     responses:
 *       200:
 *         description: Updated group
 */
router.post("/:id/members", authenticate(), Ctrl.addMember);

/**
 * @openapi
 * /volunteer-groups/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from the group
 *     tags: [VolunteerGroups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated group
 */
router.delete("/:id/members/:memberId", authenticate(), Ctrl.removeMember);

/**
 * @openapi
 * /volunteer-groups/{id}/leader:
 *   post:
 *     summary: Assign a leader to the group
 *     tags: [VolunteerGroups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaderId]
 *             properties:
 *               leaderId: { type: string }
 *     responses:
 *       200:
 *         description: Updated group
 */
router.post("/:id/leader", authenticate(), Ctrl.assignLeader);

export default router;
