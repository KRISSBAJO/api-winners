import { Router } from "express";
import authRoutes from "./auth.routes";
import activityRoutes from "./activity.routes";
import nationalRoutes from "./nationalChurch.routes";
import districtRoutes from "./district.routes";
import churchRoutes from "./church.routes";
import memberRoutes from "./member.routes";
import userRoutes from "./user.routes";
import volunteerGroupRoutes from "./volunteerGroup.routes";
import eventRoutes from "./event.routes";
import attendanceRoutes from "./attendance.routes";
import attendanceAdminRoutes from "./attendance.admin.routes";
import roleRoutes from "./role.routes";
import notificationRoutes from "./notification.routes";
import pastorRoutes from "./pastor.routes";
import followUpRoute from "./followup.routes";
import cellRoutes from "./cell.routes";
import demoRoutes from "./demo.routes";
import delegationRoutes from "./delegation.routes";
import groupRoutes from "./group.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/national", nationalRoutes);
router.use("/districts", districtRoutes);
router.use("/churches", churchRoutes);
router.use("/members", memberRoutes);
router.use("/users", userRoutes);
router.use("/volunteer-groups", volunteerGroupRoutes);
router.use("/events", eventRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/attendance/admin", attendanceAdminRoutes);
router.use("/roles", roleRoutes);
router.use("/notifications", notificationRoutes);
router.use("/pastors", pastorRoutes);
router.use("/followup", followUpRoute);
router.use("/cells", cellRoutes);
router.use("/demo", demoRoutes);
router.use("/activity", activityRoutes);
router.use("/delegations", delegationRoutes);
router.use("/groups", groupRoutes);


export default router;
