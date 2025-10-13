import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "../types/express";

/**
 * We accept tokens that may have legacy keys:
 *  - _id instead of id
 *  - nationalId instead of nationalChurchId
 *  - name/firstName/lastName may vary
 */
type RawToken = Partial<
  AuthUser & {
    _id?: string;
    nationalId?: string;
    name?: string; // e.g. "First Last"
  }
>;

export const authenticate =
  () => (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const token = h.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as RawToken;

      // ---- normalize all fields safely ----
      const id =
        decoded?.id ??
        decoded?._id ??
        (decoded as any)?._id?.toString?.() ??
        "";

      // Role is required to pass authorize checks later
      const role = (decoded?.role ?? "volunteer") as AuthUser["role"];

      // Prefer explicit first/last; fallback to a split of name
      let firstName = decoded?.firstName;
      let lastName = decoded?.lastName;
      if ((!firstName || !lastName) && decoded?.name) {
        const [f, ...rest] = decoded.name.split(" ");
        firstName ||= f;
        lastName ||= rest.join(" ").trim();
      }

      const normalized: AuthUser = {
        id: String(id),
        _id: String(id), // keep both for Mongo compatibility
        role,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: decoded?.email || undefined,
        churchId: decoded?.churchId ? String(decoded.churchId) : undefined,
        districtId: decoded?.districtId ? String(decoded.districtId) : undefined,
        nationalChurchId: decoded?.nationalChurchId
          ? String(decoded.nationalChurchId)
          : decoded?.nationalId
          ? String(decoded.nationalId)
          : undefined,
      };

      if (!normalized.id) {
        return res.status(401).json({ message: "Invalid token" });
      }

      req.user = normalized;
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };

export const requireRoles =
  (roles: AuthUser["role"][]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
