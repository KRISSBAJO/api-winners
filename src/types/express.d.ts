/* eslint-disable @typescript-eslint/no-unused-vars */
import "express-serve-static-core";
import type { Request } from "express";

/** What we keep on req.user after auth */
export interface AuthUser {
  id: string;
  role: string;
  churchId?: string;
  districtId?: string;
  nationalChurchId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    /** Set by authenticate() middleware */
    user?: AuthUser; // keep OPTIONAL for express compatibility
  }
}

/** Optional helper type (don’t use as controller param type) */
export type AuthRequest = Request & { user: AuthUser };

export {}; // ensure module
