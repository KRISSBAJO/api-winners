/* eslint-disable @typescript-eslint/no-unused-vars */
import "express-serve-static-core";
import type { Request } from "express";

/** What we attach to req.user after auth */
export interface AuthUser {
  /** Canonical primary key from DB */
  _id: string;                   // ← use _id everywhere to match Mongo
  /** Convenience mirror if some code expects `id` */
  id: string;                    // ← set to same as _id in middleware

  email?: string;
  firstName?: string;
  lastName?: string;
  role:
    | "siteAdmin"
    | "nationalPastor"
    | "districtPastor"
    | "pastor"
    | "churchAdmin"
    | "volunteer"
    | "member";

  /** Org scope (use ONE naming consistently) */
  churchId?: string;
  districtId?: string;
  nationalChurchId?: string;     // ← keep this name everywhere (not nationalId)

  /** Optional flags you might add later */
  permissions?: string[];
}

declare module "express-serve-static-core" {
  interface Request {
    /** Set by authenticate() middleware */
    user?: AuthUser; // keep optional for Express compatibility
  }
}

/** Optional helper type (avoid as controller param; prefer Request['user']) */
export type AuthRequest = Request & { user: AuthUser };

export {};
