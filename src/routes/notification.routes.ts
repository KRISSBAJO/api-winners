// src/routes/notification.routes.ts
import { Router } from "express";
import * as Ctrl from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: Real-time & inbox notifications
 */
r.get("/", authenticate(), Ctrl.list);
r.get("/unread-count", authenticate(), Ctrl.unreadCount);
r.post("/:id/read", authenticate(), Ctrl.markRead);
r.post("/read-all", authenticate(), Ctrl.markAllRead);

export default r;
