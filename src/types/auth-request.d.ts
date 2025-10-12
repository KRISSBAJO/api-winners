// src/types/express.d.ts
import "express-serve-static-core";

export interface AuthUser {
  id: string;
  role: string;
  churchId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser; // set by authenticate() middleware
  }
}
