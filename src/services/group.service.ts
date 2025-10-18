import { FilterQuery, Types } from "mongoose";
import Group, { IGroup } from "../models/Group";
import Occurrence, { IOccurrence } from "../models/Occurrence";
import GroupJoinRequest, { IGroupJoinRequest } from "../models/GroupJoinRequest";
import type { AuthUser } from "../types/express";
import { notifySafe } from "../realtime/notifySafe";
import { uploadImage, deleteImage } from "../config/cloudinary";
import fs from "fs/promises";
import { RRule, rrulestr } from "rrule";

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const oid = (v: string | Types.ObjectId) => (typeof v === "string" ? new Types.ObjectId(v) : v);

function enforceChurchWrite(churchId: string | Types.ObjectId, actor?: AuthUser) {
  if (!actor) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  if (isSite(actor)) return;
  if (!actor.churchId || String(actor.churchId) !== String(churchId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

function toIcsUTC(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function nextDateForOccurrence(doc: any, now = new Date()): Date | null {
  if (doc.status === "cancelled") return null;

  // if repeating
  if (doc.rrule) {
    try {
      const dtstart = new Date(doc.startAt);
      const rule = rrulestr(`DTSTART:${toIcsUTC(dtstart)}\nRRULE:${doc.rrule}`) as RRule;
      const next = rule.after(now, true);
      if (next) return next;
    } catch {
      // bad rrule → ignore and fall through to one-off
    }
  }

  // one-off
  const start = new Date(doc.startAt);
  return start >= now ? start : null;
}

// ---------- public-safe responses ----------
type NextOccResponse = {
  groupId: string;
  startAt: string;                // ISO
  title?: string | null;
  status?: "scheduled" | "held" | "cancelled";
  locationOverride?: string | null;
} | null;

function buildReadFilter(actor?: AuthUser) {
  if (!actor) return { _id: null }; // block anonymous on private endpoints
  if (isSite(actor)) return {};
  if (actor.churchId) return { churchId: oid(actor.churchId) };
  return { _id: null };
}

const groupLink = (id: string | Types.ObjectId) => `/dashboard/groups/${String(id)}`;

/* ----------------------------- SERVICE ----------------------------- */
class GroupService {
  /* --------- Public directory (privacy-safe fields only) --------- */
  async listPublic(params: { q?: string; type?: string; page?: number; limit?: number; churchId?: string }) {
    const q: FilterQuery<IGroup> = {
      isActive: true,
      visibility: "public",
    };

    if (params.churchId) q.churchId = oid(params.churchId);
    if (params.type) q.type = params.type as any;
    if (params.q) {
      q.$or = [
        { name: { $regex: params.q, $options: "i" } },
        { subtitle: { $regex: params.q, $options: "i" } },
        { description: { $regex: params.q, $options: "i" } },
        { tags: { $in: [new RegExp(params.q, "i")] as any } },
        { publicArea: { $regex: params.q, $options: "i" } },
      ];
    }

    const page  = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip  = (page - 1) * limit;

    const fields = "_id type name subtitle description coverUrl tags publicArea visibility joinPolicy capacity";
    const [items, total] = await Promise.all([
      Group.find(q).select(fields).sort({ name: 1 }).skip(skip).limit(limit),
      Group.countDocuments(q),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /* ------------------- Authenticated group endpoints ------------------- */
  async list(params: { q?: string; type?: string; page?: number; limit?: number; isActive?: string }, actor?: AuthUser) {
    const base = buildReadFilter(actor);
    const q: FilterQuery<IGroup> = { ...base };

    if (params.type) q.type = params.type as any;
    if (params.isActive) q.isActive = params.isActive === "true";
    if (params.q) {
      q.$or = [
        { name: { $regex: params.q, $options: "i" } },
        { subtitle: { $regex: params.q, $options: "i" } },
        { description: { $regex: params.q, $options: "i" } },
        { tags: { $in: [new RegExp(params.q, "i")] as any } },
        { publicArea: { $regex: params.q, $options: "i" } },
        { address: { $regex: params.q, $options: "i" } },
      ];
    }

    const page  = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Group.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Group.countDocuments(q),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async get(id: string, actor?: AuthUser) {
    const g = await Group.findById(id);
    if (!g) return null;

    // visibility enforcement for unauthenticated callers should happen at controller/router (public endpoint)
    if (actor && !isSite(actor) && actor.churchId && String(actor.churchId) !== String(g.churchId)) {
      return null;
    }
    return g;
  }

  /** CREATE with optional file upload */
  async create(payload: Partial<IGroup>, actor?: AuthUser, filePath?: string) {
    if (!payload.churchId) throw Object.assign(new Error("churchId required"), { statusCode: 400 });
    enforceChurchWrite(payload.churchId, actor);

    let uploaded:
      | { url: string; publicId: string }
      | undefined;

    try {
      if (filePath) {
        uploaded = await uploadImage(filePath, "dominion_connect/group_covers");
        payload.coverUrl = uploaded.url;
        // @ts-ignore – field recommended in schema
        payload.coverPublicId = uploaded.publicId;
      }

      const doc = await Group.create({
        ...payload,
        isActive: payload.isActive ?? true,
        createdBy: (actor as any)?._id,
      });

      await notifySafe({
        kind: "global.group.created",
        title: "Group created",
        message: doc.name,
        link: groupLink(doc._id),
        actorId: (actor as any)?._id,
        actorName: (actor as any)?.firstName
          ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim()
          : undefined,
        scope: "church",
        scopeRef: String(doc.churchId),
        activity: {
          verb: "created a group",
          churchId: String(doc.churchId),
          target: { type: "Group", id: String(doc._id), name: doc.name },
          meta: { type: doc.type },
        },
      });

      return doc;
    } finally {
      if (filePath) {
        // cleanup local temp file
        fs.unlink(filePath).catch(() => {});
      }
    }
  }

  /** UPDATE with optional file replacement & old image cleanup */
  async update(id: string, patch: Partial<IGroup>, actor?: AuthUser, filePath?: string) {
    const current = await Group.findById(id).select("churchId coverPublicId");
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);

    let newUpload:
      | { url: string; publicId: string }
      | undefined;

    try {
      if (filePath) {
        newUpload = await uploadImage(filePath, "dominion_connect/group_covers");
        patch.coverUrl = newUpload.url;
        // @ts-ignore – field recommended in schema
        patch.coverPublicId = newUpload.publicId;
      }

      const updated = await Group.findByIdAndUpdate(id, patch, { new: true });

      // If replaced image, delete the old one after successful update
      if (updated && filePath && current.coverPublicId && current.coverPublicId !== newUpload?.publicId) {
        await deleteImage(current.coverPublicId);
      }

      if (updated) {
        await notifySafe({
          kind: "global.group.updated",
          title: "Group updated",
          message: updated.name,
          link: groupLink(updated._id),
          actorId: (actor as any)?._id,
          actorName: (actor as any)?.firstName
            ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim()
            : undefined,
          scope: "church",
          scopeRef: String(updated.churchId),
          activity: {
            verb: "updated a group",
            churchId: String(updated.churchId),
            target: { type: "Group", id: String(updated._id), name: updated.name },
          },
        });
      }

      return updated;
    } finally {
      if (filePath) {
        fs.unlink(filePath).catch(() => {});
      }
    }
  }

  /** DELETE with cloud image cleanup */
  async remove(id: string, actor?: AuthUser) {
    const current = await Group.findById(id).select("churchId name coverPublicId");
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);

    await Group.findByIdAndDelete(id);

    // cleanup cloud image
    if ((current as any).coverPublicId) {
      await deleteImage((current as any).coverPublicId);
    }

    await notifySafe({
      kind: "global.group.deleted",
      title: "Group deleted",
      message: current.name,
      link: groupLink(current._id),
      actorId: (actor as any)?._id,
      actorName: (actor as any)?.firstName
        ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim()
        : undefined,
      scope: "church",
      scopeRef: String(current.churchId),
      activity: {
        verb: "deleted a group",
        churchId: String(current.churchId),
        target: { type: "Group", id: String(current._id), name: current.name },
      },
    });

    return { ok: true };
  }

  /* ------------------- Occurrences (meetings/sessions) ------------------- */
  async listOccurrences(groupId: string, params: { from?: string; to?: string }, actor?: AuthUser) {
    const g = await Group.findById(groupId).select("churchId _id");
    if (!g) return [];
    const rf = buildReadFilter(actor);
    if (!isSite(actor) && String(g.churchId) !== String((actor as any)?.churchId)) return [];

    const q: FilterQuery<IOccurrence> = { groupId: g._id };
    if (params.from || params.to) {
      q.startAt = {};
      if (params.from) (q.startAt as any).$gte = new Date(params.from);
      if (params.to)   (q.startAt as any).$lte = new Date(params.to);
    }

    return Occurrence.find(q).sort({ startAt: 1 });
  }

  async createOccurrence(groupId: string, payload: Partial<IOccurrence>, actor?: AuthUser) {
    const g = await Group.findById(groupId).select("churchId _id");
    if (!g) throw Object.assign(new Error("Group not found"), { statusCode: 404 });
    enforceChurchWrite(g.churchId, actor);

    const doc = await Occurrence.create({
      ...payload,
      groupId: g._id,
      churchId: g.churchId,
      status: payload.status ?? "scheduled",
      createdBy: (actor as any)?._id,
    });

    await notifySafe({
      kind: "group.occurrence.created",
      title: "Group meeting scheduled",
      message: doc.title || "Scheduled",
      link: groupLink(g._id),
      actorId: (actor as any)?._id,
      actorName: (actor as any)?.firstName ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim() : undefined,
      scope: "church",
      scopeRef: String(g.churchId),
      activity: {
        verb: "scheduled a group occurrence",
        churchId: String(g.churchId),
        target: { type: "Occurrence", id: String(doc._id), name: doc.title || "" },
      },
    });

    return doc;
  }

  async updateOccurrence(id: string, patch: Partial<IOccurrence>, actor?: AuthUser) {
    const current = await Occurrence.findById(id).select("churchId groupId");
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);

    return Occurrence.findByIdAndUpdate(id, patch, { new: true });
  }

  async deleteOccurrence(id: string, actor?: AuthUser) {
    const current = await Occurrence.findById(id).select("churchId groupId");
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    await Occurrence.findByIdAndDelete(id);
    return { ok: true };
  }

  /* ----------------------------- Join Requests ---------------------------- */
  async requestJoin(groupId: string, payload: { name: string; email?: string; phone?: string; message?: string }) {
    const g = await Group.findById(groupId).select("churchId visibility joinPolicy");
    if (!g) throw Object.assign(new Error("Group not found"), { statusCode: 404 });

    if (g.joinPolicy === "auto") {
      // could auto-approve or return an indicator to add to members by staff
    }

    const jr = await GroupJoinRequest.create({
      groupId: g._id,
      churchId: g.churchId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: payload.message,
      status: "pending",
    });

    await notifySafe({
      kind: "global.group.join.requested",
      title: "New join request",
      message: payload.name,
      link: groupLink(g._id),
      scope: "church",
      scopeRef: String(g.churchId),
      activity: {
        verb: "requested to join a group",
        churchId: String(g.churchId),
        target: { type: "Group", id: String(g._id), name: "" },
      },
    });

    return jr;
  }

  async listJoinRequests(groupId: string, actor?: AuthUser) {
    const g = await Group.findById(groupId).select("churchId _id");
    if (!g) return [];
    const rf = buildReadFilter(actor);
    if (!isSite(actor) && String(g.churchId) !== String((actor as any)?.churchId)) return [];
    return GroupJoinRequest.find({ groupId: g._id }).sort({ createdAt: -1 });
  }

  async handleJoinRequest(id: string, action: "approve" | "reject", actor?: AuthUser) {
    const jr = await GroupJoinRequest.findById(id);
    if (!jr) throw Object.assign(new Error("Request not found"), { statusCode: 404 });
    enforceChurchWrite(jr.churchId, actor);

    jr.status = action === "approve" ? "approved" : "rejected";
    jr.handledBy = (actor as any)?._id;
    jr.handledAt = new Date();
    await jr.save();

    // On approval, you may attach member by email/phone lookup in your Member collection here.

    await notifySafe({
      kind: "global.group.join.handled",
      title: `Join request ${jr.status}`,
      message: jr.name,
      link: groupLink(jr.groupId),
      actorId: (actor as any)?._id,
      actorName: (actor as any)?.firstName ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim() : undefined,
      scope: "church",
      scopeRef: String(jr.churchId),
      activity: {
        verb: `join request ${jr.status}`,
        churchId: String(jr.churchId),
        target: { type: "GroupJoinRequest", id: String(jr._id), name: jr.name },
      },
    });

    return jr;
  }
    async rejectJoinRequest(id: string, actor?: AuthUser) {
    const jr = await GroupJoinRequest.findById(id);
    if (!jr) throw Object.assign(new Error("Request not found"), { statusCode: 404 });
    enforceChurchWrite(jr.churchId, actor);

    jr.status = "rejected";
    jr.handledBy = (actor as any)?._id;
    jr.handledAt = new Date();
    await jr.save();

    await notifySafe({
      kind: "global.group.join.rejected",
      title: "Join request rejected",
      message: jr.name,
      link: groupLink(jr.groupId),
      actorId: (actor as any)?._id,
      actorName: (actor as any)?.firstName ? `${(actor as any)?.firstName} ${(actor as any)?.lastName || ""}`.trim() : undefined,
      scope: "church",
      scopeRef: String(jr.churchId),
      activity: {
        verb: `join request ${jr.status}`,
        churchId: String(jr.churchId),
        target: { type: "GroupJoinRequest", id: String(jr._id), name: jr.name },
      },
    });

    return jr;
  }
/** Earliest upcoming (single group) */
async getNextOccurrenceForGroup(groupId: string): Promise<NextOccResponse> {
  const now = new Date();

  const candidates = await Occurrence.find({
    groupId,
    status: { $ne: "cancelled" },
    $or: [{ rrule: { $exists: true, $ne: "" } }, { startAt: { $gte: now } }],
  })
    .sort({ startAt: 1 })
    .limit(200)
    .lean();

  let best: { d: Date; doc: any } | null = null;
  for (const doc of candidates) {
    const d = nextDateForOccurrence(doc, now);
    if (!d) continue;
    if (!best || d < best.d) best = { d, doc };
  }

  if (!best) return null;
  return {
    groupId,
    startAt: best.d.toISOString(),
    title: best.doc.title ?? null,
    status: best.doc.status ?? "scheduled",
    locationOverride: best.doc.locationOverride ?? null,
  };
}

/** Earliest upcoming for many groups at once */
async getNextOccurrencesForGroups(groupIds: string[]): Promise<Record<string, NextOccResponse>> {
  const now = new Date();

  const candidates = await Occurrence.find({
    groupId: { $in: groupIds },
    status: { $ne: "cancelled" },
    $or: [{ rrule: { $exists: true, $ne: "" } }, { startAt: { $gte: now } }],
  })
    .sort({ startAt: 1 })
    .limit(1000)
    .lean();

  const byG = new Map<string, any[]>();
  for (const c of candidates) {
    const key = String(c.groupId);
    if (!byG.has(key)) byG.set(key, []);
    byG.get(key)!.push(c);
  }

  const out: Record<string, NextOccResponse> = {};
  for (const gid of groupIds) {
    const list = byG.get(String(gid)) ?? [];
    let best: { d: Date; doc: any } | null = null;
    for (const doc of list) {
      const d = nextDateForOccurrence(doc, now);
      if (!d) continue;
      if (!best || d < best.d) best = { d, doc };
    }
    out[String(gid)] = best
      ? {
          groupId: String(gid),
          startAt: best.d.toISOString(),
          title: best.doc.title ?? null,
          status: best.doc.status ?? "scheduled",
          locationOverride: best.doc.locationOverride ?? null,
        }
      : null;
  }

  return out;
}
}

export default new GroupService();
