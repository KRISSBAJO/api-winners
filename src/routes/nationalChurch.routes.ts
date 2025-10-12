import { Router } from "express";
import * as Controller from "../controllers/nationalChurch.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: NationalChurch
 *     description: Manage national churches and their organizational details
 */

/**
 * @openapi
 * /national:
 *   get:
 *     summary: Get all national churches
 *     tags: [NationalChurch]
 *     responses:
 *       200:
 *         description: List of all national churches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NationalChurch'
 *   post:
 *     summary: Create a new national church (Site Admin only)
 *     tags: [NationalChurch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalChurch'
 *     responses:
 *       201:
 *         description: National church created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalChurch'
 */
router
  .route("/")
  .get(Controller.list)
  .post(authenticate(), Controller.create);

/**
 * @openapi
 * /national/{id}:
 *   get:
 *     summary: Get one national church by ID
 *     tags: [NationalChurch]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the national church to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: National church details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalChurch'
 *   put:
 *     summary: Update an existing national church
 *     tags: [NationalChurch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the national church to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalChurch'
 *     responses:
 *       200:
 *         description: National church updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NationalChurch'
 *   delete:
 *     summary: Delete a national church
 *     tags: [NationalChurch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the national church to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: National church deleted successfully
 */
router
  .route("/:id")
  .get(Controller.get)
  .put(authenticate(), Controller.update)
  .delete(authenticate(), Controller.remove);

/**
 * @openapi
 * /national/{id}/districts:
 *   get:
 *     summary: List districts under a national church
 *     tags: [NationalChurch]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/:id/districts", authenticate(), Controller.districts);

/**
 * @openapi
 * /national/{id}/churches:
 *   get:
 *     summary: List churches under a national church (via districts)
 *     tags: [NationalChurch]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/:id/churches", authenticate(), Controller.churches);

/**
 * @openapi
 * /national/{id}/overview:
 *   get:
 *     summary: Overview of districts with embedded churches and totals
 *     description: Returns districts (with embedded churches) and aggregate totals for the national church.
 *     tags: [NationalChurch]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the national church
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Overview data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 districts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/District'
 *                 totals:
 *                   type: object
 *                   properties:
 *                     totalChurches:
 *                       type: number
 *                     totalMembers:
 *                       type: number
 */
router.get("/:id/overview", authenticate(), Controller.overview);

export default router;
