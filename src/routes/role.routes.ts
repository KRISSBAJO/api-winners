// src/routes/role.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import * as Ctrl from "../controllers/role.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Roles
 *     description: Manage roles and permissions (RBAC)
 *
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "66f10b0b9a2f4a7d9731b111" }
 *         key: { type: string, example: "churchAdmin", description: "Unique role key" }
 *         name: { type: string, example: "Church Admin" }
 *         permissions:
 *           type: array
 *           items: { type: string, example: "event.create" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     CreateRoleInput:
 *       type: object
 *       required: [key, name]
 *       properties:
 *         key: { type: string, example: "districtPastor" }
 *         name: { type: string, example: "District Pastor" }
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["event.create","event.update","user.read"]
 *
 *     UpdateRoleInput:
 *       type: object
 *       properties:
 *         name: { type: string, example: "District Pastor" }
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["event.create","event.update","user.read"]
 *
 *     UpdateRolePermissionsInput:
 *       type: object
 *       required: [permissions]
 *       properties:
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["event.create","event.update"]
 *
 *     PatchRolePermissionsInput:
 *       type: object
 *       required: [permissions]
 *       properties:
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["comment.delete.any","group.update"]
 */

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: List roles
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Role' }
 *   post:
 *     summary: Create role
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateRoleInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 */
router
  .route("/")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ROLE_READ] }),
    Ctrl.listRoles
  )
  .post(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ROLE_CREATE] }),
    Ctrl.createRole
  );

/**
 * @openapi
 * /roles/permissions:
 *   get:
 *     summary: List all available permission keys
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Permission keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string, example: "event.create" }
 */
router.get(
  "/permissions",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ROLE_READ] }),
  Ctrl.listPermissionKeys
);

/**
 * @openapi
 * /roles/matrix/sync:
 *   post:
 *     summary: Seed/sync roles from ROLE_MATRIX (admin tool)
 *     description: Creates or updates roles so they match the configured ROLE_MATRIX.
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Sync result
 */
router.post(
  "/matrix/sync",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ROLE_UPDATE, PERMISSIONS.ROLE_CREATE] }),
  Ctrl.syncFromMatrix
);

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Role
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       404: { description: Not found }
 *   put:
 *     summary: Update role (name and/or permissions)
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateRoleInput' }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete role
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router
  .route("/:id")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ROLE_READ] }),
    Ctrl.getRoleById
  )
  .put(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ROLE_UPDATE] }),
    Ctrl.updateRole
  )
  .delete(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.ROLE_DELETE] }),
    Ctrl.deleteRole
  );

/**
 * @openapi
 * /roles/{id}/permissions:
 *   patch:
 *     summary: Replace a role’s permissions
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateRolePermissionsInput' }
 *     responses:
 *       200: { description: Updated }
 */
router.patch(
  "/:id/permissions",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ROLE_UPDATE] }),
  Ctrl.replacePermissions
);

/**
 * @openapi
 * /roles/{id}/permissions/add:
 *   post:
 *     summary: Add permissions to a role
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PatchRolePermissionsInput' }
 *     responses:
 *       200: { description: Updated }
 */
router.post(
  "/:id/permissions/add",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ROLE_UPDATE] }),
  Ctrl.addPermissions
);

/**
 * @openapi
 * /roles/{id}/permissions/remove:
 *   post:
 *     summary: Remove permissions from a role
 *     tags: [Roles]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PatchRolePermissionsInput' }
 *     responses:
 *       200: { description: Updated }
 */
router.post(
  "/:id/permissions/remove",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.ROLE_UPDATE] }),
  Ctrl.removePermissions
);

export default router;
