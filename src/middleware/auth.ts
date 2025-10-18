// src/middleware/auth.ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import type { AuthUser } from "../types/express";
import { getEffectivePermissionsForUser } from "../lib/rolePerms";

type RawToken = Partial<AuthUser & { _id?: string; nationalId?: string; name?: string }>;

export const authenticate =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    try {
      const token = h.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as RawToken;

      const id = decoded?.id ?? decoded?._id ?? (decoded as any)?._id?.toString?.() ?? "";
      if (!id) return res.status(401).json({ message: "Invalid token" });

      const userDoc = await User.findById(id)
        .select("role firstName lastName email churchId districtId nationalChurchId")
        .lean();
      if (!userDoc) return res.status(401).json({ message: "Invalid token" });

      // 🔑 effective (base + active delegations)
      const { permissions, delegatedScopes } = await getEffectivePermissionsForUser({
        id: String(userDoc._id),
        role: userDoc.role,
      });

      const normalized: AuthUser = {
        id: String(userDoc._id),
        _id: String(userDoc._id),
        role: userDoc.role as AuthUser["role"],
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        email: userDoc.email,
        churchId: userDoc.churchId ? String(userDoc.churchId) : undefined,
        districtId: userDoc.districtId ? String(userDoc.districtId) : undefined,
        nationalChurchId: userDoc.nationalChurchId ? String(userDoc.nationalChurchId) : undefined,
        permissions,           // ← effective perms
        delegatedScopes,       // ← useful for scope-aware UIs
      };

      (req as any).user = normalized;
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
