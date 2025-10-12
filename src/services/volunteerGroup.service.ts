import VolunteerGroup, { IVolunteerGroup } from "../models/VolunteerGroup";
import mongoose, { Types } from "mongoose";
import type { AuthUser } from "../types/express";

const oid = (v: string | Types.ObjectId) =>
  typeof v === "string" ? new Types.ObjectId(v) : v;

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLevel = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

/** Build read scope for queries */
function buildScopeFilter(actor?: AuthUser) {
  if (!actor) return {}; // controller can decide; default open for non-auth paths if you want
  if (isSite(actor)) return {};
  if (isChurchLevel(actor) && actor.churchId) return { churchId: oid(actor.churchId) };
  if (isDistrict(actor) && actor.districtId) return { __districtId: actor.districtId };
  if (isNational(actor) && actor.nationalChurchId) return { __nationalId: actor.nationalChurchId };
  return {};
}

function canWriteChurch(churchId: string, actor?: AuthUser) {
  if (!actor) return false;
  if (isSite(actor)) return true;
  if (isChurchLevel(actor)) return String(actor.churchId) === String(churchId);
  if (isDistrict(actor) || isNational(actor)) return true; // you can tighten this with lookups if desired
  return false;
}

/** READS (scope-aware) */
export const list = async (actor?: AuthUser) => {
  const scope = buildScopeFilter(actor);

  if ("churchId" in scope) {
    return VolunteerGroup.find({ churchId: (scope as any).churchId }).sort({ name: 1 });
  }

  // District: join through churches
  if ("__districtId" in scope) {
    return VolunteerGroup.aggregate([
      {
        $lookup: {
          from: "churches",
          localField: "churchId",
          foreignField: "_id",
          as: "church",
        },
      },
      { $unwind: "$church" },
      { $match: { "church.districtId": oid((scope as any).__districtId) } },
      { $sort: { name: 1 } },
    ]);
  }

  // National: join to district then match nationalChurchId
  if ("__nationalId" in scope) {
    return VolunteerGroup.aggregate([
      {
        $lookup: {
          from: "churches",
          localField: "churchId",
          foreignField: "_id",
          as: "church",
        },
      },
      { $unwind: "$church" },
      {
        $lookup: {
          from: "districts",
          localField: "church.districtId",
          foreignField: "_id",
          as: "district",
        },
      },
      { $unwind: "$district" },
      { $match: { "district.nationalChurchId": oid((scope as any).__nationalId) } },
      { $sort: { name: 1 } },
    ]);
  }

  // siteAdmin or no restriction
  return VolunteerGroup.find().sort({ name: 1 });
};

export const listByChurch = async (churchId: string, actor?: AuthUser) => {
  // even if actor is broader, we still filter by passed churchId
  const scope = buildScopeFilter(actor);
  if ("churchId" in scope && String((scope as any).churchId) !== String(churchId)) {
    // trying to read another church while church-scoped → empty
    return [];
  }
  // For district/national you could validate the church belongs to scope via lookup; keeping simple
  return VolunteerGroup.find({ churchId: oid(churchId) }).sort({ name: 1 });
};

export const get = async (id: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  // fetch & post-filter by scope
  const group = await VolunteerGroup.findById(id);
  if (!group) return null;

  const scope = buildScopeFilter(actor);
  if ("churchId" in scope) {
    return String(group.churchId) === String((scope as any).churchId) ? group : null;
  }

  if ("__districtId" in scope || "__nationalId" in scope) {
    // Resolve via lookups just for this one record
    const rows = await VolunteerGroup.aggregate([
      { $match: { _id: oid(id) } },
      {
        $lookup: {
          from: "churches",
          localField: "churchId",
          foreignField: "_id",
          as: "church",
        },
      },
      { $unwind: "$church" },
      {
        $lookup: {
          from: "districts",
          localField: "church.districtId",
          foreignField: "_id",
          as: "district",
        },
      },
      { $unwind: { path: "$district", preserveNullAndEmptyArrays: true } },
    ]);

    const row = rows[0];
    if (!row) return null;

    if ("__districtId" in scope) {
      return String(row.district?._id || row.church?.districtId) === String((scope as any).__districtId) ? group : null;
    }
    if ("__nationalId" in scope) {
      return String(row.district?.nationalChurchId) === String((scope as any).__nationalId) ? group : null;
    }
  }

  return group; // site or unrestricted
};

/** WRITES (scope-aware) */
export const create = async (payload: Partial<IVolunteerGroup>, actor?: AuthUser) => {
  if (!payload.churchId || !payload.name) throw new Error("churchId and name are required");
  if (!canWriteChurch(String(payload.churchId), actor)) throw new Error("Forbidden");
  return VolunteerGroup.create(payload);
};

export const update = async (id: string, payload: Partial<IVolunteerGroup>, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id");
  const current = await VolunteerGroup.findById(id).select("churchId");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  return VolunteerGroup.findByIdAndUpdate(id, payload, { new: true });
};

export const remove = async (id: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id");
  const current = await VolunteerGroup.findById(id).select("churchId");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");
  await VolunteerGroup.findByIdAndDelete(id);
};

export const addMember = async (groupId: string, memberId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  return VolunteerGroup.findByIdAndUpdate(
    groupId,
    { $addToSet: { members: oid(memberId) } },
    { new: true }
  );
};

export const removeMember = async (groupId: string, memberId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  return VolunteerGroup.findByIdAndUpdate(
    groupId,
    { $pull: { members: oid(memberId) } },
    { new: true }
  );
};

export const assignLeader = async (groupId: string, leaderId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(leaderId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  return VolunteerGroup.findByIdAndUpdate(groupId, { leaderId: oid(leaderId) }, { new: true });
};
