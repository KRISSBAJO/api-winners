// src/middleware/authorize.ts
import type { Request, Response, NextFunction } from "express";
import Role from "../models/Role";
import { ROLE_MATRIX } from "../config/permissions";

let cachedPermissions: Record<string, Set<string>> | null = null;
let lastLoad = 0;

export function clearPermissionCache() {
  cachedPermissions = null;
  lastLoad = 0;
}

async function loadPermissions(): Promise<Record<string, Set<string>>> {
  const now = Date.now();
  if (cachedPermissions && now - lastLoad < 5 * 60 * 1000) return cachedPermissions;

  const map: Record<string, Set<string>> = {};
  const roles = await Role.find({}, { key: 1, permissions: 1 }).lean();
  roles.forEach((r) => (map[r.key] = new Set(r.permissions as string[])));

  if (Object.keys(map).length === 0) {
    Object.keys(ROLE_MATRIX).forEach((k) => (map[k] = new Set(ROLE_MATRIX[k])));
  }

  cachedPermissions = map;
  lastLoad = now;
  return map;
}

type Rule = {
  allPermissions?: string[];
  anyPermission?: string[];   // original
  anyPermissions?: string[];  // typo-proof
};

export const authorize = (rule: Rule) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ message: "Unauthenticated" });

    const map = await loadPermissions();
    const perms = map[userRole] || new Set<string>();

    const any = rule.anyPermissions ?? rule.anyPermission ?? [];
    const hasAll = (rule.allPermissions || []).every((p) => perms.has(p));
    const hasAny = any.length ? any.some((p) => perms.has(p)) : true;

    if ((rule.allPermissions && !hasAll) || (any.length && !hasAny)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
