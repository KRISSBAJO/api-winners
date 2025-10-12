import type { Request } from "express";
import type { AuthUser } from "../types/express";

export function requireActor(req: Request): AuthUser {
  if (!req.user) {
    // You can replace with http-errors or your own error class
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}
