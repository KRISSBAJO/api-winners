import { Router } from "express";
import authRoutes from "./auth.routes";
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


export default router;
