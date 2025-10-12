// src/controllers/role.controller.ts
import { Request, Response } from "express";
import Role from "../models/Role";
import { PERMISSIONS, ROLE_MATRIX } from "../config/permissions";

/* -------------------------- Helpers -------------------------- */

const ALL_PERMISSION_VALUES: string[] = Object.values(PERMISSIONS);

/** Ensure every perm is known and unique */
function validatePermissions(perms: unknown): string[] {
  if (!Array.isArray(perms)) {
    throw new Error("permissions must be an array of strings");
  }
  const normalized = perms.map(String).map((p) => p.trim()).filter(Boolean);
  const unknown = normalized.filter((p) => !ALL_PERMISSION_VALUES.includes(p));
  if (unknown.length) {
    throw new Error(`Unknown permission(s): ${unknown.join(", ")}`);
  }
  // de-dup while preserving order
  return Array.from(new Set(normalized));
}

/** Pretty name if not supplied */
function labelFromKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^[a-z]/, (m) => m.toUpperCase());
}

/* --------------------------- CRUD ---------------------------- */

export const listRoles = async (_req: Request, res: Response) => {
  const roles = await Role.find({}).sort({ key: 1 });
  res.json(roles);
};

export const getRoleById = async (req: Request, res: Response) => {
  const r = await Role.findById(req.params.id);
  if (!r) return res.status(404).json({ message: "Not found" });
  res.json(r);
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { key, name, permissions } = req.body || {};
    if (!key) return res.status(400).json({ message: "key is required" });

    const existing = await Role.findOne({ key });
    if (existing) return res.status(400).json({ message: "Role key already exists" });

    const perms = permissions ? validatePermissions(permissions) : [];
    const role = await Role.create({
      key,
      name: name || labelFromKey(key),
      permissions: perms,
    });

    res.status(201).json(role);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Create failed" });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const patch: any = {};
    if (req.body.name != null) patch.name = String(req.body.name);
    if (req.body.permissions != null) patch.permissions = validatePermissions(req.body.permissions);

    const r = await Role.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Update failed" });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  const r = await Role.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
};

/* --------------------- Permissions Utils --------------------- */

// ...
export const listPermissionKeys = async (_req: any, res: any) => {
  // send a plain array so the FE can render it directly
  res.json(Object.values(PERMISSIONS));
};


/** PATCH /roles/:id/permissions — replace the role’s permissions */
export const replacePermissions = async (req: Request, res: Response) => {
  try {
    const perms = validatePermissions(req.body?.permissions);
    const r = await Role.findByIdAndUpdate(
      req.params.id,
      { permissions: perms },
      { new: true }
    );
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Update failed" });
  }
};

/** POST /roles/:id/permissions/add — add some permissions */
export const addPermissions = async (req: Request, res: Response) => {
  try {
    const toAdd = validatePermissions(req.body?.permissions);
    const r = await Role.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Not found" });

    const merged = Array.from(new Set([...(r.permissions || []), ...toAdd]));
    r.permissions = merged;
    await r.save();

    res.json(r);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Update failed" });
  }
};

/** POST /roles/:id/permissions/remove — remove some permissions */
export const removePermissions = async (req: Request, res: Response) => {
  try {
    const toRemove = validatePermissions(req.body?.permissions);
    const r = await Role.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Not found" });

    const set = new Set(toRemove);
    r.permissions = (r.permissions || []).filter((p) => !set.has(p));
    await r.save();

    res.json(r);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Update failed" });
  }
};

/* --------------------- ROLE_MATRIX seeding -------------------- */

/**
 * POST /roles/matrix/sync — upsert roles based on ROLE_MATRIX
 * - Creates any missing roles from ROLE_MATRIX
 * - Updates permissions of existing roles to match ROLE_MATRIX exactly
 *   (keeps existing 'name' unless missing)
 */
export const syncFromMatrix = async (_req: Request, res: Response) => {
  const results: Array<{ key: string; action: "created" | "updated"; count: number }> = [];

  for (const [key, perms] of Object.entries(ROLE_MATRIX)) {
    const targetPerms = validatePermissions(perms);
    const existing = await Role.findOne({ key });

    if (!existing) {
      await Role.create({
        key,
        name: labelFromKey(key),
        permissions: targetPerms,
      });
      results.push({ key, action: "created", count: targetPerms.length });
    } else {
      const changed =
        existing.permissions.length !== targetPerms.length ||
        existing.permissions.some((p) => !targetPerms.includes(p));
      if (changed) {
        existing.permissions = targetPerms;
        if (!existing.name) existing.name = labelFromKey(key);
        await existing.save();
        results.push({ key, action: "updated", count: targetPerms.length });
      }
    }
  }

  res.json({ ok: true, results });
};
