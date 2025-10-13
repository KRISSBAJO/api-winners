// src/services/pastor.service.ts
import { Types } from "mongoose";
import Pastor from "../models/Pastor";
import PastorAssignment from "../models/PastorAssignment";
import type { AuthUser } from "../types/express";
import { pushNotif } from "../realtime/notify"; // 🔔 add this

const oid = (v?: string) => (v ? new Types.ObjectId(v) : undefined);

const isSite     = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLv = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

const actorLabel = (u?: AuthUser & { firstName?: string; lastName?: string }) =>
  `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "System";

/** Build read filter by actor */
function readScope(actor?: AuthUser) {
  if (!actor || isSite(actor)) return {};
  if (isNational(actor) && actor.nationalChurchId) return { nationalChurchId: oid(actor.nationalChurchId) };
  if (isDistrict(actor) && actor.districtId)       return { districtId: oid(actor.districtId) };
  if (isChurchLv(actor) && actor.churchId)         return { churchId: oid(actor.churchId) };
  return { _id: null }; // deny by default
}

/** Write guard: can they write at the given target scope? */
function canWriteTo(
  target: { nationalChurchId?: any; districtId?: any; churchId?: any; level: string },
  actor?: AuthUser
) {
  if (!actor) return false;
  if (isSite(actor)) return true;

  if (target.level === "national" && isNational(actor))
    return String(actor.nationalChurchId) === String(target.nationalChurchId);

  if (target.level === "district" && isDistrict(actor))
    return String(actor.districtId) === String(target.districtId);

  if (target.level === "church" && isChurchLv(actor))
    return String(actor.churchId) === String(target.churchId);

  // national pastor can also write to districts/churches under their national
  if (isNational(actor) && actor.nationalChurchId) return true;
  // district pastor can write to churches in their district
  if (isDistrict(actor) && actor.districtId && target.level === "church") return true;

  return false;
}

/* ---------------------------- CRUD Pastors ---------------------------- */

export async function createPastor(data: any, actor?: AuthUser) {
  const snapshot = {
    level: data.level,
    nationalChurchId: oid(data.nationalChurchId),
    districtId: oid(data.districtId),
    churchId: oid(data.churchId),
  };
  if (!canWriteTo({ ...snapshot, level: data.level }, actor)) throw new Error("Forbidden");

  const doc = await Pastor.create({
    ...data,
    nationalChurchId: snapshot.nationalChurchId,
    districtId: snapshot.districtId,
    churchId: snapshot.churchId,
  });

  // seed first assignment (history)
  await PastorAssignment.create({
    pastorId: doc._id,
    level: data.level,
    nationalChurchId: snapshot.nationalChurchId,
    districtId: snapshot.districtId,
    churchId: snapshot.churchId,
    title: data.currentTitle || "Pastor",
    startDate: data.dateBecamePastor || new Date(),
    createdBy: oid(actor?.id),
    reason: "Initial assignment",
  });

  // 🔔 notifications
  try {
    const name = `${doc.firstName ?? ""} ${doc.lastName ?? ""}`.trim() || "New Pastor";

    // org-scoped stream
    const scopeRef =
      doc.level === "national" ? String(doc.nationalChurchId)
      : doc.level === "district" ? String(doc.districtId)
      : String(doc.churchId);

    const scope: "national" | "district" | "church" =
      doc.level === "national" ? "national"
      : doc.level === "district" ? "district"
      : "church";

    await pushNotif({
      kind: "pastor.created",
      title: "Pastor added",
      message: name,
      scope,
      scopeRef,
      actorId: actor?.id,
      actorName: actorLabel(actor as any),
      activity: {
        verb: "create-pastor",
        churchId: doc.churchId ? String(doc.churchId) : undefined,
        districtId: doc.districtId ? String(doc.districtId) : undefined,
        nationalId: doc.nationalChurchId ? String(doc.nationalChurchId) : undefined,
        target: { type: "Pastor", id: String(doc._id), name },
        meta: { level: doc.level, title: doc.currentTitle },
      },
    });

    // user-scoped (if linked to a User account)
    if ((doc as any).userId) {
      await pushNotif({
        kind: "pastor.created",
        title: "You have been registered",
        message: "Your profile has been created as a pastor.",
        scope: "user",
        scopeRef: String((doc as any).userId),
      });
    }
  } catch {}

  return doc;
}

export async function listPastors(query: any, actor?: AuthUser) {
  const { q, page = 1, limit = 50, sort = "-createdAt", title, level, churchId, districtId, nationalChurchId } = query;
  const skip = (page - 1) * limit;

  const scope = readScope(actor);
  const filter: any = { isDeleted: { $ne: true }, ...scope };

  if (title) filter.currentTitle = title;
  if (level) filter.level = level;
  if (churchId) filter.churchId = oid(churchId);
  if (districtId) filter.districtId = oid(districtId);
  if (nationalChurchId) filter.nationalChurchId = oid(nationalChurchId);
  if (q)
    filter.$or = [
      { firstName: new RegExp(q, "i") },
      { lastName: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { phone: new RegExp(q, "i") },
    ];

  const [items, total] = await Promise.all([
    Pastor.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("nationalChurchId")
      .populate("districtId")
      .populate("churchId")
      .lean(),
    Pastor.countDocuments(filter),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

export async function getPastorById(id: string, actor?: AuthUser) {
  const doc = await Pastor.findById(id)
    .populate("nationalChurchId")
    .populate("districtId")
    .populate("churchId");
  if (!doc) return null;

  const scope = readScope(actor);
  if ((scope as any)._id === null) return null;

  // scope check
  if ((scope as any).nationalChurchId && String(doc.nationalChurchId) !== String((scope as any).nationalChurchId)) return null;
  if ((scope as any).districtId && String(doc.districtId) !== String((scope as any).districtId)) return null;
  if ((scope as any).churchId && String(doc.churchId) !== String((scope as any).churchId)) return null;

  return doc;
}

export async function updatePastor(id: string, patch: any, actor?: AuthUser) {
  const current = await Pastor.findById(id);
  if (!current) return null;

  if (
    !canWriteTo(
      {
        level: current.level,
        nationalChurchId: current.nationalChurchId,
        districtId: current.districtId,
        churchId: current.churchId,
      },
      actor
    )
  )
    throw new Error("Forbidden");

  // prevent direct manual moves via update — use transfer API
  delete patch.level;
  delete patch.nationalChurchId;
  delete patch.districtId;
  delete patch.churchId;

  const updated = await Pastor.findByIdAndUpdate(id, patch, { new: true });

  // 🔔 notifications
  try {
    if (updated) {
      const name = `${updated.firstName ?? ""} ${updated.lastName ?? ""}`.trim() || "Pastor";
      const scopeRef =
        updated.level === "national" ? String(updated.nationalChurchId)
        : updated.level === "district" ? String(updated.districtId)
        : String(updated.churchId);

      const scope: "national" | "district" | "church" =
        updated.level === "national" ? "national"
        : updated.level === "district" ? "district"
        : "church";

      await pushNotif({
        kind: "pastor.updated",
        title: "Pastor updated",
        message: name,
        scope,
        scopeRef,
        actorId: actor?.id,
        actorName: actorLabel(actor as any),
        activity: {
          verb: "update-pastor",
          churchId: updated.churchId ? String(updated.churchId) : undefined,
          districtId: updated.districtId ? String(updated.districtId) : undefined,
          nationalId: updated.nationalChurchId ? String(updated.nationalChurchId) : undefined,
          target: { type: "Pastor", id: String(updated._id), name },
          meta: Object.keys(patch),
        },
      });

      if ((updated as any).userId) {
        await pushNotif({
          kind: "pastor.updated",
          title: "Your profile was updated",
          message: "An administrator updated your pastor profile.",
          scope: "user",
          scopeRef: String((updated as any).userId),
        });
      }
    }
  } catch {}

  return updated;
}

export async function softDeletePastor(id: string, actor?: AuthUser) {
  const current = await Pastor.findById(id);
  if (!current) return false;
  if (
    !canWriteTo(
      {
        level: current.level,
        nationalChurchId: current.nationalChurchId,
        districtId: current.districtId,
        churchId: current.churchId,
      },
      actor
    )
  )
    throw new Error("Forbidden");

  await Pastor.findByIdAndUpdate(id, { isDeleted: true, isActive: false });

  // 🔔 notifications
  try {
    const name = `${current.firstName ?? ""} ${current.lastName ?? ""}`.trim() || "Pastor";
    const scopeRef =
      current.level === "national" ? String(current.nationalChurchId)
      : current.level === "district" ? String(current.districtId)
      : String(current.churchId);

    const scope: "national" | "district" | "church" =
      current.level === "national" ? "national"
      : current.level === "district" ? "district"
      : "church";

    await pushNotif({
      kind: "pastor.deleted",
      title: "Pastor removed",
      message: name,
      scope,
      scopeRef,
      actorId: actor?.id,
      actorName: actorLabel(actor as any),
      activity: {
        verb: "delete-pastor",
        churchId: current.churchId ? String(current.churchId) : undefined,
        districtId: current.districtId ? String(current.districtId) : undefined,
        nationalId: current.nationalChurchId ? String(current.nationalChurchId) : undefined,
        target: { type: "Pastor", id: String(current._id), name },
      },
    });

    if ((current as any).userId) {
      await pushNotif({
        kind: "pastor.deleted",
        title: "Your profile was removed",
        message: "Contact your administrator if this is unexpected.",
        scope: "user",
        scopeRef: String((current as any).userId),
      });
    }
  } catch {}

  return true;
}

/* -------------------- Assignments / History actions ------------------- */

/** Start a new assignment (also ends current active one if overlapping) */
export async function assign(
  pastorId: string,
  payload: {
    level: "national" | "district" | "church";
    nationalChurchId?: string;
    districtId?: string;
    churchId?: string;
    title: string;
    startDate?: string | Date;
    reason?: string;
  },
  actor?: AuthUser
) {
  const p = await Pastor.findById(pastorId);
  if (!p) throw new Error("Not found");

  const target = {
    level: payload.level,
    nationalChurchId: oid(payload.nationalChurchId),
    districtId: oid(payload.districtId),
    churchId: oid(payload.churchId),
  };
  if (!canWriteTo(target, actor)) throw new Error("Forbidden");

  // end open assignment(s)
  await PastorAssignment.updateMany(
    { pastorId: p._id, endDate: { $exists: false } },
    { $set: { endDate: new Date(), endedBy: oid(actor?.id), reason: payload.reason || "Reassigned" } }
  );

  // create new assignment
  const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
  const created = await PastorAssignment.create({
    pastorId: p._id,
    ...target,
    title: payload.title,
    startDate,
    createdBy: oid(actor?.id),
    reason: payload.reason,
  });

  // update snapshot on pastor
  p.level = payload.level as any;
  p.nationalChurchId = target.nationalChurchId as any;
  p.districtId = target.districtId as any;
  p.churchId = target.churchId as any;
  p.currentTitle = payload.title as any;
  await p.save();

  // 🔔 notifications
  try {
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Pastor";
    const scopeRef =
      created.level === "national" ? String(created.nationalChurchId)
      : created.level === "district" ? String(created.districtId)
      : String(created.churchId);

    const scope: "national" | "district" | "church" =
      created.level === "national" ? "national"
      : created.level === "district" ? "district"
      : "church";

    await pushNotif({
      kind: "pastor.assigned",
      title: "New assignment",
      message: `${name} • ${payload.title}`,
      scope,
      scopeRef,
      actorId: actor?.id,
      actorName: actorLabel(actor as any),
      activity: {
        verb: "assign-pastor",
        churchId: created.churchId ? String(created.churchId) : undefined,
        districtId: created.districtId ? String(created.districtId) : undefined,
        nationalId: created.nationalChurchId ? String(created.nationalChurchId) : undefined,
        target: { type: "Pastor", id: String(p._id), name },
        meta: { title: payload.title, startDate },
      },
    });

    if ((p as any).userId) {
      await pushNotif({
        kind: "pastor.assigned",
        title: "You received a new assignment",
        message: `${payload.title}`,
        scope: "user",
        scopeRef: String((p as any).userId),
      });
    }
  } catch {}

  return p;
}

export async function endAssignment(
  pastorId: string,
  assignmentId: string,
  actor?: AuthUser
) {
  const a = await PastorAssignment.findById(assignmentId);
  if (!a || String(a.pastorId) !== String(pastorId)) throw new Error("Not found");

  // write permission based on assignment target
  if (
    !canWriteTo(
      { level: a.level as any, nationalChurchId: a.nationalChurchId, districtId: a.districtId, churchId: a.churchId },
      actor
    )
  )
    throw new Error("Forbidden");

  if (a.endDate) return a; // already closed
  a.endDate = new Date();
  a.endedBy = (oid(actor?.id) as any) || undefined;
  a.reason = a.reason || "Ended";
  await a.save();

  // 🔔 notifications
  try {
    const p = await Pastor.findById(pastorId).lean();
    const name = `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || "Pastor";
    const scopeRef =
      a.level === "national" ? String(a.nationalChurchId)
      : a.level === "district" ? String(a.districtId)
      : String(a.churchId);

    const scope: "national" | "district" | "church" =
      a.level === "national" ? "national"
      : a.level === "district" ? "district"
      : "church";

    await pushNotif({
      kind: "pastor.assignmentClosed",
      title: "Assignment ended",
      message: `${name} • ${a.title}`,
      scope,
      scopeRef,
      actorId: actor?.id,
      actorName: actorLabel(actor as any),
      activity: {
        verb: "end-assignment",
        churchId: a.churchId ? String(a.churchId) : undefined,
        districtId: a.districtId ? String(a.districtId) : undefined,
        nationalId: a.nationalChurchId ? String(a.nationalChurchId) : undefined,
        target: { type: "PastorAssignment", id: String(a._id), name: name },
        meta: { title: a.title, endDate: a.endDate },
      },
    });

    if ((p as any)?.userId) {
      await pushNotif({
        kind: "pastor.assignmentClosed",
        title: "Your assignment ended",
        message: `${a.title}`,
        scope: "user",
        scopeRef: String((p as any).userId),
      });
    }
  } catch {}

  return a;
}

export async function listAssignments(pastorId: string, actor?: AuthUser) {
  const p = await getPastorById(pastorId, actor);
  if (!p) throw new Error("Not found");

  return PastorAssignment.find({ pastorId: oid(pastorId) })
    .sort({ startDate: -1 })
    .populate("nationalChurchId districtId churchId")
    .lean();
}
