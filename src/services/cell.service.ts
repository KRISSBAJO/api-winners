// src/services/cell.service.ts
import { Types } from "mongoose";
import CellGroup, { ICellGroup } from "../models/CellGroup";
import CellMeeting, { ICellMeeting } from "../models/CellMeeting";
import CellAttendanceReport, { ICellAttendanceReport } from "../models/CellAttendanceReport";
import Church from "../models/Church";
import District from "../models/District";
import type { AuthUser } from "../types/express";
import Member from "../models/Member";
import { buildOrgScopeFilter } from "../middleware/scope";

const oid = (v: string | Types.ObjectId) => typeof v === "string" ? new Types.ObjectId(v) : v;

const tryOid = (v: any) =>
  typeof v === "string" && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : undefined;

const canWriteChurch = (actor?: AuthUser, churchId?: string | Types.ObjectId) => {
  if (!actor || !churchId) return false;
  if (actor.role === "siteAdmin") return true;
  if (actor.role === "churchAdmin" || actor.role === "pastor" || actor.role === "volunteer") {
    return String(actor.churchId) === String(churchId);
  }
  if (actor.role === "districtPastor" || actor.role === "nationalPastor") return true;
  return false;
};

// Small helper to derive lineage from a church id
async function deriveLineageFromChurch(churchId: string | Types.ObjectId) {
  const ch = await Church.findById(churchId).select("districtId nationalChurchId").lean();
  if (!ch) throw new Error("Church not found");
  return { churchId: oid(churchId), districtId: ch.districtId, nationalChurchId: ch.nationalChurchId };
}

export class CellService {
  /* ========== Cells ========== */
  async listCells(actor?: AuthUser, params?: any) {
  const scope = buildOrgScopeFilter(actor);
  const q: any = {};
    if (params?.nationalChurchId) q.nationalChurchId = oid(params.nationalChurchId);
    if (params?.districtId)      q.districtId       = oid(params.districtId);
    if (params?.churchId)        q.churchId         = oid(params.churchId);
    if (!params?.nationalChurchId && scope.nationalChurchId) q.nationalChurchId = scope.nationalChurchId;
    if (!params?.districtId && scope.districtId)              q.districtId       = scope.districtId;
    if (!params?.churchId && scope.churchId)                  q.churchId         = scope.churchId;

    return CellGroup.find(q)
      .populate("leaderId", "firstName lastName email")
      .populate("assistantId", "firstName lastName email")
      .populate("secretaryId", "firstName lastName email")
      .populate("members", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  async getCell(id: string, actor?: AuthUser) {
    const doc = await CellGroup.findById(id)
      .populate("leaderId", "firstName lastName email")
      .populate("assistantId", "firstName lastName email")
      .populate("secretaryId", "firstName lastName email")
      .populate("members", "firstName lastName email");
    if (!doc) return null;

    if (actor?.nationalChurchId && String(actor.nationalChurchId) !== String(doc.nationalChurchId)) return null;
    if (actor?.districtId && String(actor.districtId) !== String(doc.districtId)) return null;
    if (actor?.churchId && String(actor.churchId) !== String(doc.churchId)) return null;
    return doc;
  }

  async createCell(data: Partial<ICellGroup>, actor?: AuthUser) {
  if (!data.churchId) throw new Error("churchId required");
  if (!canWriteChurch(actor, data.churchId)) throw new Error("Forbidden");

  const church = await Church.findById(data.churchId).select("districtId nationalChurchId");
  if (!church) throw new Error("Church not found");

  return CellGroup.create({
    ...data,
    districtId: church.districtId,
    nationalChurchId: church.nationalChurchId,
    createdBy: actor?._id,
  });
}

  async updateCell(id: string, data: Partial<ICellGroup>, actor?: AuthUser) {
  const current = await CellGroup.findById(id).select("churchId");
  if (!current) return null;
  if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");

  const patch: any = { ...data };
  if (data.churchId && String(data.churchId) !== String(current.churchId)) {
    const church = await Church.findById(data.churchId).select("districtId nationalChurchId");
    if (!church) throw new Error("Church not found");
    patch.districtId = church.districtId;
    patch.nationalChurchId = church.nationalChurchId;
  }
  return CellGroup.findByIdAndUpdate(id, patch, { new: true });
}

  async deleteCell(id: string, actor?: AuthUser) {
    const current = await CellGroup.findById(id).select("churchId");
    if (!current) return false;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    await CellGroup.findByIdAndDelete(id);
    return true;
  }

  async addMembers(cellId: string, memberIds: string[], actor?: AuthUser) {
    const current = await CellGroup.findById(cellId).select("churchId");
    if (!current) throw new Error("Cell not found");
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    const count = await Member.countDocuments({ _id: { $in: memberIds.map(oid) }, churchId: current.churchId });
    if (count !== memberIds.length) throw new Error("Some members not in this church");
    await CellGroup.updateOne({ _id: cellId }, { $addToSet: { members: { $each: memberIds.map(oid) } } });
    return this.getCell(cellId, actor);
  }

  async removeMember(cellId: string, memberId: string, actor?: AuthUser) {
    const current = await CellGroup.findById(cellId).select("churchId");
    if (!current) throw new Error("Cell not found");
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    await CellGroup.updateOne({ _id: cellId }, { $pull: { members: oid(memberId) } });
    return this.getCell(cellId, actor);
  }

  /* ========== Meetings ========== */
  async scheduleMeeting(data: Partial<ICellMeeting>, actor?: AuthUser) {
    if (!data.cellId || !data.churchId || !data.scheduledFor) throw new Error("Missing fields");
    if (!canWriteChurch(actor, data.churchId)) throw new Error("Forbidden");

    const { districtId, nationalChurchId } = await deriveLineageFromChurch(data.churchId);

    return CellMeeting.create({
      ...data,
      districtId,
      nationalChurchId,
      status: data.status ?? "scheduled",
      createdBy: actor?._id,
    });
  }

  async updateMeeting(id: string, data: Partial<ICellMeeting>, actor?: AuthUser) {
    const current = await CellMeeting.findById(id).select("churchId");
    if (!current) return null;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");

    const patch: any = { ...data };

    if (data.churchId && String(data.churchId) !== String(current.churchId)) {
      const { districtId, nationalChurchId } = await deriveLineageFromChurch(data.churchId);
      patch.districtId = districtId;
      patch.nationalChurchId = nationalChurchId;
    }

    return CellMeeting.findByIdAndUpdate(id, patch, { new: true });
  }

  async deleteMeeting(id: string, actor?: AuthUser) {
    const current = await CellMeeting.findById(id).select("churchId");
    if (!current) return false;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    await CellMeeting.findByIdAndDelete(id);
    return true;
  }

async listMeetings(params: any = {}, actor?: AuthUser) {
  const scope = buildOrgScopeFilter(actor);
  const q: any = {};

  if (params.cellId)           q.cellId           = oid(params.cellId);
  if (params.churchId)         q.churchId         = oid(params.churchId);
  if (params.districtId)       q.districtId       = oid(params.districtId);
  if (params.nationalChurchId) q.nationalChurchId = oid(params.nationalChurchId);

  if (!q.nationalChurchId && scope.nationalChurchId) q.nationalChurchId = scope.nationalChurchId;
  if (!q.districtId       && scope.districtId)       q.districtId       = scope.districtId;
  if (!q.churchId         && scope.churchId)         q.churchId         = scope.churchId;

  if (params.from || params.to) {
    q.scheduledFor = {};
    if (params.from) q.scheduledFor.$gte = new Date(params.from);
    if (params.to)   q.scheduledFor.$lte = new Date(params.to);
  }

  // Only meetings without reports yet?
  if (params.onlyUnreported) {
    const reportedIds = await CellAttendanceReport.distinct("meetingId", { meetingId: { $ne: null } });
    q._id = { $nin: reportedIds };
  }

  return CellMeeting.find(q)
    .populate("cellId", "name")
    .sort({ scheduledFor: -1 });
}

  /* ========== Reports ========== */
  async submitReport(data: Partial<ICellAttendanceReport>, actor?: AuthUser) {
  if (!data.churchId)  throw new Error("Missing churchId");
  if (!data.cellId)    throw new Error("Missing cellId");
  if (!data.meetingId) throw new Error("Missing meetingId"); // enforce link to a meeting
  if (!data.date)      throw new Error("Missing date");
  if (!data.totals)    throw new Error("Missing totals");

  if (!canWriteChurch(actor, data.churchId)) throw new Error("Forbidden");

  // Validate meeting belongs to same church & cell
  const meeting = await CellMeeting.findById(data.meetingId).lean();
  if (!meeting) throw new Error("Meeting not found");
  if (String(meeting.churchId) !== String(data.churchId) || String(meeting.cellId) !== String(data.cellId)) {
    throw new Error("Meeting does not belong to provided church/cell");
  }

  const { districtId, nationalChurchId } = await deriveLineageFromChurch(data.churchId);

  // Upsert: one report per meeting
  const payload: Partial<ICellAttendanceReport> = {
    ...data,
    districtId,
    nationalChurchId,
    submittedBy: actor?._id ? oid(actor._id) : undefined,
    presentMemberIds: (data.presentMemberIds ?? []).map(oid),
  };

  const rpt = await CellAttendanceReport.findOneAndUpdate(
    { meetingId: oid(data.meetingId as any) },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Meeting becomes held once a report exists
  await CellMeeting.updateOne({ _id: data.meetingId }, { status: "held" });

  return rpt;
}

  // services/cell.service.ts
async listReports(params: any = {}, actor?: AuthUser) {
  const scope = buildOrgScopeFilter(actor);
  const q: any = {};

  const cell   = tryOid(params.cellId);
  const church = tryOid(params.churchId);
  const dist   = tryOid(params.districtId);
  const nat    = tryOid(params.nationalChurchId);

  if (cell)   q.cellId           = cell;
  if (church) q.churchId         = church;
  if (dist)   q.districtId       = dist;
  if (nat)    q.nationalChurchId = nat;

  if (!q.nationalChurchId && scope.nationalChurchId) q.nationalChurchId = scope.nationalChurchId;
  if (!q.districtId       && scope.districtId)       q.districtId       = scope.districtId;
  if (!q.churchId         && scope.churchId)         q.churchId         = scope.churchId;

  if (params.from || params.to) {
    q.date = {};
    if (params.from) q.date.$gte = new Date(params.from);
    if (params.to)   q.date.$lte = new Date(params.to);
  }

  return CellAttendanceReport.find(q)
    .populate("cellId", "name")
    .populate("submittedBy", "firstName lastName email")
    .sort({ date: -1, createdAt: -1 });
}
  async analytics(params: { churchId?: string; districtId?: string; nationalChurchId?: string; from?: string; to?: string }) {
    const q: any = {};
    if (params.nationalChurchId) q.nationalChurchId = oid(params.nationalChurchId);
    if (params.districtId)       q.districtId       = oid(params.districtId);
    if (params.churchId)         q.churchId         = oid(params.churchId);
    if (params.from || params.to) {
      q.date = {};
      if (params.from) q.date.$gte = new Date(params.from);
      if (params.to)   q.date.$lte = new Date(params.to);
    }

    const [agg] = await CellAttendanceReport.aggregate([
      { $match: q },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          men:          { $sum: "$totals.men" },
          women:        { $sum: "$totals.women" },
          children:     { $sum: "$totals.children" },
          firstTimers:  { $sum: "$totals.firstTimers" },
          newConverts:  { $sum: "$totals.newConverts" },
        }
      }
    ]);

    const cellFilter: any = {};
    if (params.nationalChurchId) cellFilter.nationalChurchId = oid(params.nationalChurchId);
    if (params.districtId)       cellFilter.districtId       = oid(params.districtId);
    if (params.churchId)         cellFilter.churchId         = oid(params.churchId);

    const cellsCreated = await CellGroup.countDocuments(cellFilter);

    return {
      totalMeetings: agg?.totalMeetings || 0,
      totals: {
        men: agg?.men || 0,
        women: agg?.women || 0,
        children: agg?.children || 0,
        firstTimers: agg?.firstTimers || 0,
        newConverts: agg?.newConverts || 0,
      },
      cellsCreated,
    };
  }
  async useDeleteReport(id: string, actor?: AuthUser) {
    const current = await CellAttendanceReport.findById(id).select("churchId");
    if (!current) return false;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    await CellAttendanceReport.findByIdAndDelete(id);
    return true;
  }
}

export default new CellService();
