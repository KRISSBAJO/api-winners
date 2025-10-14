import { Router } from "express";
import multer from "multer";
import * as Ctrl from "../controllers/member.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PERMISSIONS } from "../config/permissions";
import {
  sendSelfRegInvite,
  verifySelfReg,
  selfRegisterShort,
  selfRegisterLong,
  searchMembers,
} from "../controllers/member.controller";

const upload = multer({ dest: "uploads/" });
const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Members
 *     description: Manage church members, uploads, invitations, and statistics
 */

/**
 * @openapi
 * /members:
 *   get:
 *     summary: Get all members
 *     tags: [Members]
 *     parameters:
 *       - in: query
 *         name: membershipStatus
 *         schema:
 *           type: string
 *           enum: [Active, Visitor, New Convert, Inactive]
 *         description: Filter members by status
 *     responses:
 *       200:
 *         description: List of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 *   post:
 *     summary: Create a new member manually
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Member'
 *           example:
 *             firstName: John
 *             lastName: Doe
 *             email: john@example.com
 *             phone: "+1 615 123 4567"
 *             churchId: 671f7890cba123001234ijkl
 *     responses:
 *       201:
 *         description: Member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 */
router
  .route("/")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.MEMBER_READ] }),
    Ctrl.getMembers
  )
  .post(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.MEMBER_CREATE] }),
    Ctrl.createMember
  );

/**
 * @openapi
 * /members/stats:
 *   get:
 *     summary: Get member statistics (active, visitors, converts)
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: Summary of member counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   example: 120
 *                 active:
 *                   type: number
 *                   example: 95
 *                 visitors:
 *                   type: number
 *                   example: 10
 *                 converts:
 *                   type: number
 *                   example: 15
 */
router.get(
  "/stats",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_STATS] }),
  Ctrl.getMemberStats
);

/**
 * @openapi
 * /members/leaders:
 *   get:
 *     summary: Get all members marked as leaders
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: List of leaders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 */
router.get(
  "/leaders",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_LEADERS] }),
  Ctrl.getLeaders
);

/**
 * @openapi
 * /members/church/{churchId}:
 *   get:
 *     summary: Get all members under a specific church
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: churchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Members in the specified church
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 */
router.get(
  "/church/:churchId",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_BY_CHURCH] }),
  Ctrl.getMembersByChurch
);

/**
 * @openapi
 * /members/birthdays/{month}:
 *   get:
 *     summary: Get members with birthdays in a given month
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           example: 6
 *     responses:
 *       200:
 *         description: Members born in the specified month
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 */
router.get(
  "/birthdays/:month",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_BIRTHDAYS] }),
  Ctrl.getBirthdaysInMonth
);

/**
 * @openapi
 * /members/anniversaries/{month}:
 *   get:
 *     summary: Get members with wedding anniversaries in a given month
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Members with anniversaries in the specified month
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 */
router.get(
  "/anniversaries/:month",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_ANNIVERSARIES] }),
  Ctrl.getAnniversariesInMonth
);

/**
 * @openapi
 * /members/upload:
 *   post:
 *     summary: Bulk upload members via Excel or CSV file
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, churchId]
 *             properties:
 *               churchId:
 *                 type: string
 *                 example: 671f7890cba123001234ijkl
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload results summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUploaded:
 *                   type: number
 *                   example: 120
 *                 failed:
 *                   type: number
 *                   example: 5
 */
router.post(
  "/upload",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_UPLOAD] }),
  upload.single("file"),
  Ctrl.uploadMembers
);

/**
 *  @openapi
 * /members/search:
 *  get:
 *   summary: Search members by name, email, or phone
 *    tags: [Members]
 *    parameters:
 *      - in: query
 *        name: q
 *      required: true
 *     schema:
 *       type: string
 *      example: John
 *   description: Search term to match against first name, last name, email, or phone
 *   responses:
 *      200:
 *          description: List of matching members
 *       content:
 *          application/json:
 * 
 * 
 */
router.get(
  "/search",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_READ] }),
  searchMembers
);

/**
 * @openapi
 * /members/template:
 *   get:
 *     summary: Download Excel template for member upload
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: Excel template download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get(
  "/template",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_TEMPLATE_DOWNLOAD] }),
  Ctrl.downloadTemplate
);

/**
 * @openapi
 * /members/invite:
 *   post:
 *     summary: Send an invitation link for self-registration
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, churchId]
 *             properties:
 *               email:
 *                 type: string
 *                 example: member@example.com
 *               churchId:
 *                 type: string
 *                 example: 671f7890cba123001234ijkl
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
router.post(
  "/invite",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_INVITE] }),
  Ctrl.sendInvite
);

/**
 * @openapi
 * /members/register/{token}:
 *   post:
 *     summary: Register a new member via invitation link
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Member'
 *     responses:
 *       201:
 *         description: Member registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 */
router.post("/register/:token", Ctrl.registerViaInvite);

router.post(
  "/self-register/invite",
  authenticate(),
  authorize({ anyPermission: [PERMISSIONS.MEMBER_INVITE] }),
  sendSelfRegInvite
);

/** Public helpers: verify + submit */
router.get("/self-register/verify", verifySelfReg);
router.post("/self-register/short", selfRegisterShort);
router.post("/self-register/long", selfRegisterLong);

/**
 * @openapi
 * /members/{id}:
 *   get:
 *     summary: Get member details by ID
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 *   put:
 *     summary: Update member details
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Member'
 *     responses:
 *       200:
 *         description: Member updated successfully
 *   delete:
 *     summary: Delete member
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: Member deleted successfully
 */
router
  .route("/:id")
  .get(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.MEMBER_READ] }),
    Ctrl.getMemberById
  )
  .put(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.MEMBER_UPDATE] }),
    Ctrl.updateMember
  )
  .delete(
    authenticate(),
    authorize({ anyPermission: [PERMISSIONS.MEMBER_DELETE] }),
    Ctrl.deleteMember
  );

export default router;
