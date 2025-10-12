import { Router } from "express";
import * as Controller from "../controllers/church.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Church
 *     description: Manage local churches and their hierarchical relationships
 */

/**
 * @openapi
 * /churches:
 *   get:
 *     summary: List all churches
 *     tags: [Church]
 *     responses:
 *       200:
 *         description: List of all churches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Church'
 *   post:
 *     summary: Create a new church (Site Admin or District Pastor)
 *     tags: [Church]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Church'
 *     responses:
 *       201:
 *         description: Church created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Church'
 */
router
  .route("/")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_READ] }),
    Controller.list
  )
  .post(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_CREATE] }),
    Controller.create
  );

/**
 * @openapi
 * /churches/{id}:
 *   get:
 *     summary: Get detailed information about a specific church
 *     tags: [Church]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the church to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Church details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Church'
 *   put:
 *     summary: Update a church’s details
 *     tags: [Church]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the church to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Church'
 *     responses:
 *       200:
 *         description: Church updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Church'
 *   delete:
 *     summary: Delete a church by ID
 *     tags: [Church]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the church to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Church deleted successfully
 */
router
  .route("/:id")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_READ] }),
    Controller.get
  )
  .put(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_UPDATE] }),
    Controller.update
  )
  .delete(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_DELETE] }),
    Controller.remove
  );

/**
 * @openapi
 * /churches/district/{districtId}:
 *   get:
 *     summary: Get all churches within a specific district
 *     tags: [Church]
 *     parameters:
 *       - name: districtId
 *         in: path
 *         required: true
 *         description: The ID of the district
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Churches under the specified district
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Church'
 */
router
  .route("/district/:districtId")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_READ] }),
    Controller.getByDistrict
  );

/**
 * @openapi
 * /churches/national/{nationalChurchId}:
 *   get:
 *     summary: Get all churches belonging to a specific national church
 *     tags: [Church]
 *     parameters:
 *       - name: nationalChurchId
 *         in: path
 *         required: true
 *         description: The ID of the national church
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Churches under the specified national church
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Church'
 */
router
  .route("/national/:nationalChurchId")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.CHURCH_READ] }),
    Controller.getByNationalChurch
  );

export default router;
