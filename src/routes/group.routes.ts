// src/routes/group.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/group.controller";
import multer from "multer";

const router = Router();

/** Multer */
const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/groups/public:
 *   get:
 *     summary: Public group directory (privacy-safe)
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search term across name/subtitle/description/tags/publicArea
 *       - in: query
 *         name: type
 *         schema: { $ref: '#/components/schemas/GroupType' }
 *       - in: query
 *         name: churchId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated public groups
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedGroupsPublic'
 */
router.get("/public", Ctrl.listPublic);

router.get("/occurrences/next", Ctrl.nextOccurrenceBatch);

/**
 * @openapi
 * /api/groups:
 *   get:
 *     summary: List groups (scoped)
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { $ref: '#/components/schemas/GroupType' }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated groups
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedGroups'
 */
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_READ] }),
  Ctrl.listGroups
);

router.get("/:id/occurrences/next", Ctrl.nextOccurrence);

/**
 * @openapi
 * /api/groups/{id}:
 *   get:
 *     summary: Get a group by id
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Group document
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_READ] }),
  Ctrl.getGroup
);

/**
 * @openapi
 * /api/groups:
 *   post:
 *     summary: Create a group
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GroupCreate' }
 *     responses:
 *       200:
 *         description: Created group
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 */
router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_CREATE] }),
  upload.single("coverUrl"),
  Ctrl.createGroup
);

/**
 * @openapi
 * /api/groups/{id}:
 *   put:
 *     summary: Update a group
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GroupUpdate' }
 *     responses:
 *       200:
 *         description: Updated group
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 *       404:
 *         description: Not found
 */
router.put(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_UPDATE] }),
  upload.single("coverUrl"),
  Ctrl.updateGroup
);

/**
 * @openapi
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete a group
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_DELETE] }),
  Ctrl.deleteGroup
);

/**
 * @openapi
 * /api/groups/{id}/occurrences:
 *   get:
 *     summary: List occurrences for a group
 *     tags: [Occurrences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Occurrences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Occurrence' }
 */
router.get(
  "/:id/occurrences",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.OCCURRENCE_READ] }),
  Ctrl.listOccurrences
);

/**
 * @openapi
 * /api/groups/{id}/occurrences:
 *   post:
 *     summary: Create a group occurrence
 *     tags: [Occurrences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OccurrenceCreate' }
 *     responses:
 *       200:
 *         description: Created occurrence
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Occurrence' }
 */
router.post(
  "/:id/occurrences",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.OCCURRENCE_CREATE] }),
  Ctrl.createOccurrence
);

/**
 * @openapi
 * /api/groups/occurrences/{occurrenceId}:
 *   put:
 *     summary: Update an occurrence
 *     tags: [Occurrences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: occurrenceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OccurrenceUpdate' }
 *     responses:
 *       200:
 *         description: Updated occurrence
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Occurrence' }
 */
router.put(
  "/occurrences/:occurrenceId",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.OCCURRENCE_UPDATE] }),
  Ctrl.updateOccurrence
);

/**
 * @openapi
 * /api/groups/occurrences/{occurrenceId}:
 *   delete:
 *     summary: Delete an occurrence
 *     tags: [Occurrences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: occurrenceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/occurrences/:occurrenceId",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.OCCURRENCE_DELETE] }),
  Ctrl.deleteOccurrence
);

/**
 * @openapi
 * /api/groups/{id}/requests:
 *   post:
 *     summary: Public - submit a join request
 *     tags: [Group Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRequestCreate'
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Created join request (pending)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/GroupJoinRequest' }
 */
router.post(
  "/:id/requests",
  Ctrl.requestJoin
);

/**
 * @openapi
 * /api/groups/{id}/requests:
 *   get:
 *     summary: List join requests for a group (scoped)
 *     tags: [Group Requests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/GroupJoinRequest' }
 */
router.get(
  "/:id/requests",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_REQUEST_READ] }),
  Ctrl.listRequests
);

/**
 * @openapi
 * /api/groups/requests/{requestId}/handle:
 *   post:
 *     summary: Handle a join request (approve/reject)
 *     tags: [Group Requests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *     responses:
 *       200:
 *         description: Updated join request
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/GroupJoinRequest' }
 */
router.post(
  "/requests/:requestId/handle",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_REQUEST_HANDLE] }),
  Ctrl.handleRequest
);

/**
 * @openapi
 * /api/groups/requests/{requestId}/reject:
 *   post:
 *     summary: Reject a join request (explicit route)
 *     tags: [Group Requests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rejected join request
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/GroupJoinRequest' }
 */
router.post(
  "/requests/:requestId/reject",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.GROUP_REQUEST_HANDLE] }),
  Ctrl.rejectRequest
);

// If you add approve route, mirror this block with Ctrl.approveRequest

export default router;
