// src/routes/activity.routes.ts
import { Router } from "express";
import * as Ctrl from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth";
const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Activity
 *     description: Organization activity stream
 */
r.get("/", authenticate(), Ctrl.list);
export default r;
