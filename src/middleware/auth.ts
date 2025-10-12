// src/middleware/auth.ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

/** What we encode in the access token AND expect on req.user */
export type AuthUser = {
  id: string;
  role:
    | "siteAdmin"
    | "nationalPastor"
    | "districtPastor"
    | "churchAdmin"
    | "pastor"
    | "volunteer";
  churchId?: string;
  districtId?: string;
  nationalChurchId?: string;
};

// Removed duplicate declaration of req.user to avoid conflicts

export const authenticate =
  () => (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const token = h.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;

      // IMPORTANT: normalize the key (older tokens might have nationalId)
      const normalized: AuthUser = {
        id: decoded.id,
        role: decoded.role,
        churchId: decoded.churchId,
        districtId: decoded.districtId,
        nationalChurchId:
          (decoded as any).nationalChurchId ?? (decoded as any).nationalId,
      };

      req.user = normalized;
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };

export const requireRoles =
  (roles: AuthUser["role"][]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as AuthUser["role"])) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
