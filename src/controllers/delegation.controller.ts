import { Request, Response } from "express";
import { Types } from "mongoose";
import Role from "../models/Role";
import User from "../models/User";
import RoleDelegation from "../models/RoleDelegation";
import { getEffectivePermissionsForUser, getPermissionsForRole } from "../lib/permissions";
import { assertScope, isSiteAdmin, OrgScope } from "../lib/scope";

function toId(id?: string) { return id ? new Types.ObjectId(id) : undefined; }

function normalizeScope(body: any): OrgScope {
  return {
    nationalChurchId: body?.scope?.nationalChurchId || body?.nationalChurchId,
    districtId:       body?.scope?.districtId || body?.districtId,
    churchId:         body?.scope?.churchId || body?.churchId,
  };
}

function hasAnyScope(scope: OrgScope) {
  return Boolean(scope.nationalChurchId || scope.districtId || scope.churchId);
}

/** POST /delegations — create */
export const createDelegation = async (req: any, res: Response) => {
  try {
    const actor = req.user;
    const { granteeId, permissions, roleLike, startsAt, endsAt, reason } = req.body || {};
    const scope = normalizeScope(req.body);

    if (!granteeId) return res.status(400).json({ message: "granteeId is required" });
    if (!hasAnyScope(scope)) return res.status(400).json({ message: "scope is required" });
    if (!startsAt || !endsAt) return res.status(400).json({ message: "startsAt and endsAt required" });

    const start = new Date(startsAt), end = new Date(endsAt);
    if (Number.isNaN(+start) || Number.isNaN(+end) || start >= end) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Grantor must own the scope (or be siteAdmin)
    assertScope(actor, scope);

    // Validate grantee exists
    const grantee = await User.findById(granteeId).select("_id role churchId districtId nationalChurchId").lean();
    if (!grantee) return res.status(404).json({ message: "Grantee not found" });

    // Grantor effective permissions
    const grantorEff = await getEffectivePermissionsForUser({ id: actor.id, role: actor.role });
    const grantorPerms = new Set(grantorEff.permissions);

    let finalPerms: string[] = [];
    if (Array.isArray(permissions) && permissions.length) {
      // Ensure requested perms ⊆ grantor perms
      const unknown = permissions.filter((p: string) => !grantorPerms.has(p));
      if (unknown.length) {
        return res.status(400).json({ message: `Grantor lacks: ${unknown.join(", ")}` });
      }
      finalPerms = Array.from(new Set(permissions.map(String)));
    } else if (roleLike) {
      const role = await Role.findOne({ key: roleLike }).lean();
      if (!role) return res.status(400).json({ message: "roleLike not found" });
      // Ensure subset too
      const missing = (role.permissions || []).filter((p: string) => !grantorPerms.has(p));
      if (missing.length) {
        return res.status(400).json({ message: `Grantor lacks permissions in roleLike: ${missing.join(", ")}` });
      }
    } else {
      return res.status(400).json({ message: "Specify permissions[] or roleLike" });
    }

    const doc = await RoleDelegation.create({
      grantorId: new Types.ObjectId(actor.id),
      granteeId: new Types.ObjectId(granteeId),
      scope: {
        nationalChurchId: toId(scope.nationalChurchId),
        districtId: toId(scope.districtId),
        churchId: toId(scope.churchId),
      },
      permissions: finalPerms.length ? finalPerms : undefined,
      roleLike: finalPerms.length ? undefined : roleLike,
      startsAt: start,
      endsAt: end,
      reason,
      createdBy: new Types.ObjectId(actor.id),
    });

    res.status(201).json(doc);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ message: e.message || "Create failed" });
  }
};

/** GET /delegations/mine?as=grantor|grantee&active=1 */
export const listMine = async (req: any, res: Response) => {
  const actor = req.user;
  const as = (req.query.as as string) || "grantor";
  const onlyActive = req.query.active === "1" || req.query.active === "true";
  const now = new Date();

  const filter: any = as === "grantee" ? { granteeId: actor.id } : { grantorId: actor.id };
  if (onlyActive) {
    filter.startsAt = { $lte: now };
    filter.endsAt = { $gte: now };
    filter.isRevoked = { $ne: true };
  }

  const items = await RoleDelegation.find(filter)
    .sort({ createdAt: -1 })
    .populate("granteeId", "firstName lastName email role")
    .populate("grantorId", "firstName lastName email role")
    .lean();

  res.json(items);
};

/** GET /delegations/for-me (as grantee, active only) */
export const listActiveForMe = async (req: any, res: Response) => {
  const actor = req.user;
  const now = new Date();
  const items = await RoleDelegation.find({
    granteeId: actor.id,
    isRevoked: { $ne: true },
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).lean();
  res.json(items);
};

/** POST /delegations/:id/revoke */
export const revokeDelegation = async (req: any, res: Response) => {
  try {
    const actor = req.user;
    const { id } = req.params;
    const d = await RoleDelegation.findById(id);
    if (!d) return res.status(404).json({ message: "Not found" });

    // Only grantor or siteAdmin can revoke
    if (!isSiteAdmin(actor) && String(d.grantorId) !== String(actor.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    d.isRevoked = true;
    await d.save();

    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ message: e.message || "Revoke failed" });
  }
};
