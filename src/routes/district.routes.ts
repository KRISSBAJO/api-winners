import { Router } from "express";
import * as Controller from "../controllers/district.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: District
 *     description: Manage districts under national churches
 */

/**
 * @openapi
 * /districts:
 *   get:
 *     summary: List all districts
 *     tags: [District]
 *     responses:
 *       200:
 *         description: List of all districts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/District'
 *   post:
 *     summary: Create a new district (Site Admin only)
 *     tags: [District]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/District'
 *     responses:
 *       201:
 *         description: District created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/District'
 */
router
  .route("/")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_READ] }),
    Controller.list
  )
  .post(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_CREATE] }),
    Controller.create
  );

/**
 * @openapi
 * /districts/{id}:
 *   get:
 *     summary: Get a district by ID
 *     tags: [District]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the district to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: District retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/District'
 *   put:
 *     summary: Update a district
 *     tags: [District]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the district to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/District'
 *     responses:
 *       200:
 *         description: District updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/District'
 *   delete:
 *     summary: Delete a district
 *     tags: [District]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the district to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: District deleted successfully
 */
router
  .route("/:id")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_READ] }),
    Controller.get
  )
  .put(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_UPDATE] }),
    Controller.update
  )
  .delete(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_DELETE] }),
    Controller.remove
  );

/**
 * @openapi
 * /districts/national/{nationalChurchId}:
 *   get:
 *     summary: Get districts by national church
 *     tags: [District]
 *     parameters:
 *       - name: nationalChurchId
 *         in: path
 *         required: true
 *         description: ID of the national church
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Districts under the given national church
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/District'
 */
router
  .route("/national/:nationalChurchId")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.DISTRICT_READ] }),
    Controller.getByNationalChurch
  );

export default router;
