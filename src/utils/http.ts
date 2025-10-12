// src/utils/http.ts
import { Request } from "express";
import type { AuthUser } from "../types/express";

export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}

export function getUploadFile(req: Request) {
  return (req as any).file as Express.Multer.File | undefined;
}
