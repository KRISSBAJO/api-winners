import { Types } from "mongoose";
import Church from "../models/Church";
import District from "../models/District"; // must have nationalChurchId on District
import{ AuthUser}  from "../types/express";

/* ------------------------------------------------------- */
/* Types                                                   */
/* ------------------------------------------------------- */

type ListParams = {
  q?: string; // future: name contains, etc.
  page?: number;
  limit?: number;
  sort?: "name" | "-name" | "createdAt" | "-createdAt";
};

/* ------------------------------------------------------- */
/* Helpers                                                 */
/* ------------------------------------------------------- */

const oid = (v?: string) => (v ? new Types.ObjectId(v) : undefined);

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLevel = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

/** Hard auth for mutations that target a specific district */
async function canManageDistrict(actor: AuthUser | undefined, districtId: string): Promise<boolean> {
  if (!actor) return false;
  if (isSite(actor)) return true;
  if (isDistrict(actor)) return String(actor.districtId) === String(districtId);

  if (isNational(actor)) {
    const d = await District.findById(districtId).select("nationalChurchId").lean();
    return !!d && String(d.nationalChurchId) === String(actor.nationalChurchId);
  }

  // church-level roles shouldn’t create/update churches by default
  return false;
}

/** Hard auth for mutations on an existing church */
async function canManageChurchDoc(actor: AuthUser | undefined, churchId: string): Promise<boolean> {
  if (!actor) return false;
  if (isSite(actor)) return true;

  const ch = await Church.findById(churchId).select("districtId").lean();
  if (!ch) return false;

  if (isDistrict(actor)) return String(actor.districtId) === String(ch.districtId);

  if (isNational(actor)) {
    const d = await District.findById(ch.districtId).select("nationalChurchId").lean();
    return !!d && String(d.nationalChurchId) === String(actor.nationalChurchId);
  }

  // church-level: allow only their own church to be UPDATED (toggle here if you want)
  // return String(actor.churchId) === String(churchId);
  return false;
}

/** Query builder for READ scope */
async function buildReadFilter(actor?: AuthUser): Promise<any> {
  if (!actor || isSite(actor)) return {}; // full access

  // district pastor → simple filter
  if (isDistrict(actor) && actor.districtId) {
    return { districtId: oid(actor.districtId) };
  }

  // church-level → only their own church
  if (isChurchLevel(actor) && actor.churchId) {
    return { _id: oid(actor.churchId) };
  }

  // national pastor → need to filter via district join; we'll handle via aggregate
  if (isNational(actor) && actor.nationalChurchId) {
    // return a marker to tell callers to use aggregate
    return { __useNationalAggregate: true };
  }

  // default: deny
  return { _id: null };
}

/* ------------------------------------------------------- */
/* READS                                                   */
/* ------------------------------------------------------- */

export async function getChurches(params: ListParams = {}, actor?: AuthUser) {
  const { page = 1, limit = 50, sort = "name" } = params;
  const skip = (page - 1) * limit;

  const f = await buildReadFilter(actor);

  // National pastor: use $lookup to filter by district.nationalChurchId
  if (f.__useNationalAggregate && actor?.nationalChurchId) {
    const pipeline: any[] = [
      { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
      { $unwind: "$d" },
      { $match: { "d.nationalChurchId": oid(actor.nationalChurchId) } },
      { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [items, totalAgg] = await Promise.all([
      Church.aggregate(pipeline),
      Church.aggregate([
        { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
        { $unwind: "$d" },
        { $match: { "d.nationalChurchId": oid(actor.nationalChurchId) } },
        { $count: "n" },
      ]),
    ]);
    const total = totalAgg[0]?.n || 0;
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // Everyone else: simple find with filter
  const query = { ...f };
  const [items, total] = await Promise.all([
    Church.find(query).sort(sort).skip(skip).limit(limit).populate({
      path: "districtId",
      populate: { path: "nationalChurchId" },
    }),
    Church.countDocuments(query),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

export async function getChurchById(id: string, actor?: AuthUser) {
  const ch = await Church.findById(id).populate({
    path: "districtId",
    populate: { path: "nationalChurchId" },
  });
  if (!ch) return null;

  // authorize read
  if (isSite(actor)) return ch;

  if (isChurchLevel(actor)) {
    if (String(actor?.churchId) !== String(ch._id)) return null;
    return ch;
  }

  if (isDistrict(actor)) {
    if (String(actor?.districtId) !== String(ch.districtId)) return null;
    return ch;
  }

  if (isNational(actor)) {
    const d = ch.districtId as any;
    if (!d?.nationalChurchId) {
      const dx = await District.findById(ch.districtId).select("nationalChurchId");
      if (!dx) return null;
      if (String(dx.nationalChurchId) !== String(actor?.nationalChurchId)) return null;
      return ch;
    }
    if (String(d.nationalChurchId?._id || d.nationalChurchId) !== String(actor?.nationalChurchId)) return null;
    return ch;
  }

  return null;
}

/* ------------------------------------------------------- */
/* WRITES                                                  */
/* ------------------------------------------------------- */

// createChurch
export async function createChurch(data: any, actor?: AuthUser) {
  if (!data?.districtId) throw new Error("districtId is required");

  const allow = await canManageDistrict(actor, String(data.districtId));
  if (!allow) throw new Error("Forbidden");

  const district = await District.findById(data.districtId).select("nationalChurchId");
  if (!district) throw new Error("District not found");

  const payload = {
    ...data,
    nationalChurchId: district.nationalChurchId, // <- denormalize here
  };

  return Church.create(payload);
}


// updateChurch
export async function updateChurch(id: string, patch: any, actor?: AuthUser) {
  const allow = await canManageChurchDoc(actor, id);
  if (!allow) throw new Error("Forbidden");

  const updates: any = { ...patch };

  if (patch?.districtId) {
    const canMove = await canManageDistrict(actor, String(patch.districtId));
    if (!canMove) throw new Error("Forbidden to move church to that district");

    const district = await District.findById(patch.districtId).select("nationalChurchId");
    if (!district) throw new Error("District not found");

    updates.nationalChurchId = district.nationalChurchId; // <- keep lineage in sync
  }

  // Never let clients set nationalChurchId alone (prevents mismatches)
  if ("nationalChurchId" in updates && !patch?.districtId) {
    delete updates.nationalChurchId;
  }

  return Church.findByIdAndUpdate(id, updates, { new: true });
}


export async function deleteChurch(id: string, actor?: AuthUser) {
  const allow = await canManageChurchDoc(actor, id);
  if (!allow) throw new Error("Forbidden");
  return Church.findByIdAndDelete(id);
}

/* ------------------------------------------------------- */
/* Convenience filters                                     */
/* ------------------------------------------------------- */

export async function getChurchesByDistrict(districtId: string, actor?: AuthUser) {
  // READ auth: district pastor for same district, national pastor if district under them, site = all,
  // church-level can only see their own church (so they’ll only see results if their church is in this district).
  if (!actor || isSite(actor)) {
    return Church.find({ districtId: oid(districtId) }).populate({
      path: "districtId",
      populate: { path: "nationalChurchId" },
    });
  }

  if (isDistrict(actor)) {
    if (String(actor.districtId) !== String(districtId)) return [];
    return Church.find({ districtId: oid(districtId) }).populate({
      path: "districtId",
      populate: { path: "nationalChurchId" },
    });
  }

  if (isNational(actor)) {
    const d = await District.findById(districtId).select("nationalChurchId").lean();
    if (!d || String(d.nationalChurchId) !== String(actor.nationalChurchId)) return [];
    return Church.find({ districtId: oid(districtId) }).populate({
      path: "districtId",
      populate: { path: "nationalChurchId" },
    });
  }

  // church-level
  return Church.find({ _id: oid(actor.churchId), districtId: oid(districtId) }).populate({
    path: "districtId",
    populate: { path: "nationalChurchId" },
  });
}

export async function getChurchesByNationalChurch(
  nationalChurchId: string,
  actor?: AuthUser
) {
  // siteAdmin can see any national; nationalPastor only their own
  if (isSite(actor) || (isNational(actor) && String(actor?.nationalChurchId) === String(nationalChurchId))) {
    // join districts to filter by nationalChurchId
    return Church.aggregate([
      { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
      { $unwind: "$d" },
      { $match: { "d.nationalChurchId": oid(nationalChurchId) } },
    ]);
  }

  // districtPastor: only if their district belongs to this national
  if (isDistrict(actor) && actor?.districtId) {
    const d = await District.findById(actor.districtId).select("nationalChurchId");
    if (!d || String(d.nationalChurchId) !== String(nationalChurchId)) return [];
    return Church.find({ districtId: oid(actor.districtId) });
  }

  // church-level roles: only their own church, iff it belongs to this national
  if (isChurchLevel(actor) && actor?.churchId) {
    const ch = await Church.findById(actor.churchId).select("districtId");
    if (!ch) return [];
    const d = await District.findById(ch.districtId).select("nationalChurchId");
    if (!d || String(d.nationalChurchId) !== String(nationalChurchId)) return [];
    const own = await Church.findById(actor.churchId);
    return own ? [own] : [];
  }

  return [];
}