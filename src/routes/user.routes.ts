import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import {
  listUsers,
  getUser,
  updateProfile,
  updateUserAdmin,
  toggleActive,
  deleteUser,
  createUser, 
} from "../controllers/user.controller";

const router = Router();

/** Multer */
const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Manage users
 */

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     description: Restricted by permission (user.read). Backend will scope results where applicable.
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Forbidden }
 */
router.get(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_READ] }),
  listUsers
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User }
 *       404: { description: Not found }
 */
router.get(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_READ] }),
  getUser
);

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user (admin)
 *     description: Requires user.create permission
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               middleName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role:
 *                 type: string
 *                 enum: [siteAdmin, nationalPastor, districtPastor, churchAdmin, pastor, volunteer]
 *               churchId: { type: string }
 *               districtId: { type: string }
 *               nationalChurchId: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad request }
 *       403: { description: Forbidden }
 */

router.post(
  "/",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_CREATE] }),
  createUser
);

/**
 * @openapi
 * /users/update-profile:
 *   put:
 *     summary: Update my profile
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               middleName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  "/update-profile",
  upload.single("avatar"),
  authenticate(),
  updateProfile
);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Admin update a user (role/scope or basic fields)
 *     description: Requires user.update
 *     tags: [Users]
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
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               middleName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               role: { type: string, enum: ["siteAdmin","nationalPastor","districtPastor","churchAdmin","pastor","volunteer"] }
 *               churchId: { type: string }
 *               districtId: { type: string }
 *               nationalChurchId: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *       403: { description: Forbidden }
 */
router.put(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_UPDATE] }),
  updateUserAdmin
);

/**
 * @openapi
 * /users/{id}/toggle-active:
 *   patch:
 *     summary: Toggle user active/inactive
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Toggled }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.patch(
  "/:id/toggle-active",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_TOGGLE_ACTIVE] }),
  toggleActive
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
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
router.delete(
  "/:id",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.USER_DELETE] }),
  deleteUser
);

export default router;
