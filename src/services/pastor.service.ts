import { Types } from "mongoose";
import Pastor from "../models/Pastor";
import PastorAssignment from "../models/PastorAssignment";
import type { AuthUser } from "../types/express";

const oid = (v?: string) => (v ? new Types.ObjectId(v) : undefined);

const isSite     = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLv = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

/** Build read filter by actor */
function readScope(actor?: AuthUser) {
  if (!actor || isSite(actor)) return {};
  if (isNational(actor) && actor.nationalChurchId) return { nationalChurchId: oid(actor.nationalChurchId) };
  if (isDistrict(actor) && actor.districtId)       return { districtId: oid(actor.districtId) };
  if (isChurchLv(actor) && actor.churchId)         return { churchId: oid(actor.churchId) };
  return { _id: null }; // deny by default
}

/** Write guard: can they write at the given target scope? */
function canWriteTo(target: { nationalChurchId?: any; districtId?: any; churchId?: any; level: string }, actor?: AuthUser) {
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
  if (isDistrict(actor) && actor.districtId && target.level === "church")
    return true;

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
  if (q) filter.$or = [
    { firstName: new RegExp(q, "i") },
    { lastName: new RegExp(q, "i") },
    { email: new RegExp(q, "i") },
    { phone: new RegExp(q, "i") },
  ];

  const [items, total] = await Promise.all([
    Pastor.find(filter).sort(sort).skip(skip).limit(limit)
      .populate("nationalChurchId").populate("districtId").populate("churchId").lean(),
    Pastor.countDocuments(filter),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

export async function getPastorById(id: string, actor?: AuthUser) {
  const doc = await Pastor.findById(id)
    .populate("nationalChurchId").populate("districtId").populate("churchId");
  if (!doc) return null;

  const scope = readScope(actor);
  if (scope._id === null) return null;

  // scope check
  if (scope.nationalChurchId && String(doc.nationalChurchId) !== String(scope.nationalChurchId)) return null;
  if (scope.districtId && String(doc.districtId) !== String(scope.districtId)) return null;
  if (scope.churchId && String(doc.churchId) !== String(scope.churchId)) return null;

  return doc;
}

export async function updatePastor(id: string, patch: any, actor?: AuthUser) {
  const current = await Pastor.findById(id);
  if (!current) return null;

  if (!canWriteTo(
    { level: current.level, nationalChurchId: current.nationalChurchId, districtId: current.districtId, churchId: current.churchId },
    actor
  )) throw new Error("Forbidden");

  // prevent direct manual moves via update — use transfer API
  delete patch.level;
  delete patch.nationalChurchId;
  delete patch.districtId;
  delete patch.churchId;

  return Pastor.findByIdAndUpdate(id, patch, { new: true });
}

export async function softDeletePastor(id: string, actor?: AuthUser) {
  const current = await Pastor.findById(id);
  if (!current) return false;
  if (!canWriteTo(
    { level: current.level, nationalChurchId: current.nationalChurchId, districtId: current.districtId, churchId: current.churchId },
    actor
  )) throw new Error("Forbidden");

  await Pastor.findByIdAndUpdate(id, { isDeleted: true, isActive: false });
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

  // end open assignment
  await PastorAssignment.updateMany(
    { pastorId: p._id, endDate: { $exists: false } },
    { $set: { endDate: new Date(), endedBy: oid(actor?.id), reason: payload.reason || "Reassigned" } }
  );

  // create new assignment
  const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
  await PastorAssignment.create({
    pastorId: p._id,
    ...target,
    title: payload.title,
    startDate,
    createdBy: oid(actor?.id),
    reason: payload.reason,
  });

  // update snapshot
  p.level = payload.level as any;
  p.nationalChurchId = target.nationalChurchId as any;
  p.districtId = target.districtId as any;
  p.churchId = target.churchId as any;
  p.currentTitle = payload.title as any;
  await p.save();

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
  if (!canWriteTo(
    { level: a.level, nationalChurchId: a.nationalChurchId, districtId: a.districtId, churchId: a.churchId },
    actor
  )) throw new Error("Forbidden");

  if (a.endDate) return a; // already closed
  a.endDate = new Date();
  a.endedBy = oid(actor?.id) as any || undefined;
  a.reason = a.reason || "Ended";
  await a.save();
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
