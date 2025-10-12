import { Router } from "express";
import {
  register,
  login,
  me,
  requestPasswordReset,
  resetPassword,
  listUsers,
  refresh,
  performPasswordReset,
  changeMyPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: User authentication and account management
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and assigns the provided role (siteAdmin, churchAdmin, pastor, or volunteer)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *           example:
 *             firstName: John
 *             lastName: Doe
 *             email: john.doe@example.com
 *             password: StrongPass123
 *             role: pastor
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *       401:
 *         description: Unauthorized
 */
router.post("/register", authenticate(), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns JWT tokens (access & refresh)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     description: Returns details of the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized (no valid token)
 */

// for /refesh-token, see auth.controller.ts

/** @openapi
 * /auth/refresh:
 *  post:
  *    summary: Refresh access token
 */

router.post("/refresh", refresh);
router.get("/me", authenticate(), me);

/**
 * @openapi
 * /auth/request-password-reset:
 *   post:
 *     summary: Request password reset link
 *     description: Sends a reset link to the user's registered email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent
 *       404:
 *         description: User not found
 */
router.post("/request-password-reset", requestPasswordReset);
router.post("/perform-password-reset", performPasswordReset);
router.post("/change-my-password", authenticate(), changeMyPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     description: Allows a user to reset their password using a valid token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 example: NewStrongPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPassword);

/**
 * @openapi
 * /auth/users:
 *   get:
 *     summary: List all users
 *     description: Returns all registered users (restricted to Admin/SiteAdmin)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get("/users", authenticate(), listUsers);

export default router;
