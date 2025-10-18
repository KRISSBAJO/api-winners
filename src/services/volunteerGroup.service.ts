// src/services/volunteerGroup.service.ts
import VolunteerGroup, { IVolunteerGroup } from "../models/VolunteerGroup";
import mongoose, { Types } from "mongoose";
import type { AuthUser } from "../types/express";
import { notifySafe } from "../realtime/notifySafe";

const oid = (v: string | Types.ObjectId) =>
  typeof v === "string" ? new Types.ObjectId(v) : v;

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLevel = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

const actorLabel = (actor?: AuthUser) =>
  (actor as any)?.name ||
  [ (actor as any)?.firstName, (actor as any)?.lastName ].filter(Boolean).join(" ") ||
  undefined;

const groupLink = (id: string | Types.ObjectId) =>
  `/dashboard/volunteers/groups/${String(id)}`;

/** Build read scope for queries */
function buildScopeFilter(actor?: AuthUser) {
  if (!actor) return {};
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
  if (isDistrict(actor) || isNational(actor)) return true;
  return false;
}

/** READS (scope-aware) */
export const list = async (actor?: AuthUser) => {
  const scope = buildScopeFilter(actor);

  if ("churchId" in scope) {
    return VolunteerGroup.find({ churchId: (scope as any).churchId }).sort({ name: 1 });
  }

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

  return VolunteerGroup.find().sort({ name: 1 });
};

export const listByChurch = async (churchId: string, actor?: AuthUser) => {
  const scope = buildScopeFilter(actor);
  if ("churchId" in scope && String((scope as any).churchId) !== String(churchId)) {
    return [];
  }
  return VolunteerGroup.find({ churchId: oid(churchId) }).sort({ name: 1 });
};

export const get = async (id: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const group = await VolunteerGroup.findById(id);
  if (!group) return null;

  const scope = buildScopeFilter(actor);
  if ("churchId" in scope) {
    return String(group.churchId) === String((scope as any).churchId) ? group : null;
  }

  if ("__districtId" in scope || "__nationalId" in scope) {
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

  return group;
};

/** WRITES (scope-aware) */
export const create = async (payload: Partial<IVolunteerGroup>, actor?: AuthUser) => {
  if (!payload.churchId || !payload.name) throw new Error("churchId and name are required");
  if (!canWriteChurch(String(payload.churchId), actor)) throw new Error("Forbidden");

  const doc = await VolunteerGroup.create(payload);

  // 🔔 notify + activity
  await notifySafe({
    kind: "volunteer.group.created",
    title: "Volunteer group created",
    message: `“${doc.name}” has been created.`,
    link: groupLink(doc._id),
    actorId: (actor as any)?._id,
    actorName: actorLabel(actor),
    scope: "church",
    scopeRef: String(doc.churchId),
    activity: {
      verb: "created a volunteer group",
      churchId: String(doc.churchId),
      target: { type: "VolunteerGroup", id: String(doc._id), name: doc.name },
      meta: {},
    },
  });

  return doc;
};

export const update = async (id: string, payload: Partial<IVolunteerGroup>, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id");
  const current = await VolunteerGroup.findById(id).select("churchId name");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  const updated = await VolunteerGroup.findByIdAndUpdate(id, payload, { new: true });

  if (updated) {
    await notifySafe({
      kind: "volunteer.group.updated",
      title: "Volunteer group updated",
      message: `“${updated.name}” was updated.`,
      link: groupLink(updated._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(updated.churchId),
      activity: {
        verb: "updated a volunteer group",
        churchId: String(updated.churchId),
        target: { type: "VolunteerGroup", id: String(updated._id), name: updated.name },
        meta: { changed: Object.keys(payload || {}) },
      },
    });
  }

  return updated;
};

export const remove = async (id: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id");
  const current = await VolunteerGroup.findById(id).select("churchId name");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  // 🔔 emit before delete so link/name exist
  await notifySafe({
    kind: "volunteer.group.deleted",
    title: "Volunteer group deleted",
    message: `“${current.name}” was deleted.`,
    link: groupLink(current._id),
    actorId: (actor as any)?._id,
    actorName: actorLabel(actor),
    scope: "church",
    scopeRef: String(current.churchId),
    activity: {
      verb: "deleted a volunteer group",
      churchId: String(current.churchId),
      target: { type: "VolunteerGroup", id: String(current._id), name: current.name },
      meta: {},
    },
  });

  await VolunteerGroup.findByIdAndDelete(id);
};

export const addMember = async (groupId: string, memberId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId name");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  const doc = await VolunteerGroup.findByIdAndUpdate(
    groupId,
    { $addToSet: { members: oid(memberId) } },
    { new: true }
  );

  if (doc) {
    await notifySafe({
      kind: "volunteer.group.member.added",
      title: "Member added to group",
      message: `A member was added to “${doc.name}”.`,
      link: groupLink(doc._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(doc.churchId),
      activity: {
        verb: "added a member to a volunteer group",
        churchId: String(doc.churchId),
        target: { type: "VolunteerGroup", id: String(doc._id), name: doc.name },
        meta: { memberId },
      },
    });
  }

  return doc;
};

export const removeMember = async (groupId: string, memberId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId name");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  const doc = await VolunteerGroup.findByIdAndUpdate(
    groupId,
    { $pull: { members: oid(memberId) } },
    { new: true }
  );

  if (doc) {
    await notifySafe({
      kind: "volunteer.group.member.removed",
      title: "Member removed from group",
      message: `A member was removed from “${doc.name}”.`,
      link: groupLink(doc._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(doc.churchId),
      activity: {
        verb: "removed a member from a volunteer group",
        churchId: String(doc.churchId),
        target: { type: "VolunteerGroup", id: String(doc._id), name: doc.name },
        meta: { memberId },
      },
    });
  }

  return doc;
};

export const assignLeader = async (groupId: string, leaderId: string, actor?: AuthUser) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(leaderId)) {
    throw new Error("Invalid id");
  }
  const current = await VolunteerGroup.findById(groupId).select("churchId name");
  if (!current) throw new Error("Not found");
  if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

  const doc = await VolunteerGroup.findByIdAndUpdate(
    groupId,
    { leaderId: oid(leaderId) },
    { new: true }
  );

  if (doc) {
    await notifySafe({
      kind: "volunteer.group.leader.assigned",
      title: "Group leader assigned",
      message: `A leader was assigned to “${doc.name}”.`,
      link: groupLink(doc._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(doc.churchId),
      activity: {
        verb: "assigned a leader to a volunteer group",
        churchId: String(doc.churchId),
        target: { type: "VolunteerGroup", id: String(doc._id), name: doc.name },
        meta: { leaderId },
      },
    });
  }

  return doc;
};
