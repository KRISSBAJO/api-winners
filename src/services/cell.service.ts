// src/services/cell.service.ts
import { Types } from "mongoose";
import CellGroup, { ICellGroup } from "../models/CellGroup";
import CellMeeting, { ICellMeeting } from "../models/CellMeeting";
import CellAttendanceReport, { ICellAttendanceReport } from "../models/CellAttendanceReport";
import type { AuthUser } from "../types/express";
import Member from "../models/Member";
import { buildOrgScopeFilter } from "../middleware/scope";

const oid = (v: string | Types.ObjectId) => typeof v === "string" ? new Types.ObjectId(v) : v;

const canWriteChurch = (actor?: AuthUser, churchId?: string | Types.ObjectId) => {
  if (!actor || !churchId) return false;
  if (actor.role === "siteAdmin") return true;
  if (actor.role === "churchAdmin" || actor.role === "pastor" || actor.role === "volunteer") {
    return String(actor.churchId) === String(churchId);
  }
  // district/national allowed (if you want strict, validate via joins)
  if (actor.role === "districtPastor" || actor.role === "nationalPastor") return true;
  return false;
};

export class CellService {
  /* ========== Cells ========== */
  async listCells(actor?: AuthUser, params?: any) {
    const scope = buildOrgScopeFilter(actor);
    const q: any = { ...params };
    if (scope.churchId) q.churchId = scope.churchId;
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
    // scope check (simple: church-level)
    if (actor?.churchId && String(actor.churchId) !== String(doc.churchId)) return null;
    return doc;
  }

  async createCell(data: Partial<ICellGroup>, actor?: AuthUser) {
    if (!canWriteChurch(actor, data.churchId)) throw new Error("Forbidden");
    return CellGroup.create({ ...data, createdBy: actor?._id });
  }

  async updateCell(id: string, data: Partial<ICellGroup>, actor?: AuthUser) {
    const current = await CellGroup.findById(id).select("churchId");
    if (!current) return null;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    return CellGroup.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteCell(id: string, actor?: AuthUser) {
    const current = await CellGroup.findById(id).select("churchId");
    if (!current) return false;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    await CellGroup.findByIdAndDelete(id);
    // Optional: cascade delete meetings/reports
    return true;
  }

  async addMembers(cellId: string, memberIds: string[], actor?: AuthUser) {
    const current = await CellGroup.findById(cellId).select("churchId");
    if (!current) throw new Error("Cell not found");
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    // validate members belong to same church
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
    return CellMeeting.create({ ...data, status: "scheduled", createdBy: actor?._id });
  }

  async updateMeeting(id: string, data: Partial<ICellMeeting>, actor?: AuthUser) {
    const current = await CellMeeting.findById(id).select("churchId");
    if (!current) return null;
    if (!canWriteChurch(actor, current.churchId)) throw new Error("Forbidden");
    return CellMeeting.findByIdAndUpdate(id, data, { new: true });
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
    const q: any = { ...params };
    if (scope.churchId) q.churchId = scope.churchId;
    return CellMeeting.find(q).populate("cellId", "name").sort({ scheduledFor: -1 });
  }

  /* ========== Reports ========== */
  async submitReport(data: Partial<ICellAttendanceReport>, actor?: AuthUser) {
    const required = ["churchId", "cellId", "date", "totals"] as const;
    for (const f of required) if (!(data as any)[f]) throw new Error(`Missing ${f}`);
    if (!canWriteChurch(actor, data.churchId)) throw new Error("Forbidden");
    const payload = {
      ...data,
      submittedBy: actor?._id,
      presentMemberIds: (data.presentMemberIds ?? []).map(oid),
    };
    const rpt = await CellAttendanceReport.create(payload);
    // (Optional) auto-mark meeting held
    if (data.meetingId) {
      await CellMeeting.updateOne({ _id: data.meetingId }, { status: "held" });
    }
    return rpt;
  }

  async listReports(params: any = {}, actor?: AuthUser) {
    const scope = buildOrgScopeFilter(actor);
    const q: any = { ...params };
    if (scope.churchId) q.churchId = scope.churchId;
    return CellAttendanceReport
      .find(q)
      .populate("cellId", "name")
      .populate("submittedBy", "firstName lastName email")
      .sort({ date: -1, createdAt: -1 });
  }

  async analytics(params: { churchId?: string; from?: string; to?: string }) {
    const q: any = {};
    if (params.churchId) q.churchId = oid(params.churchId);
    if (params.from || params.to) {
      q.date = {};
      if (params.from) q.date.$gte = new Date(params.from);
      if (params.to) q.date.$lte = new Date(params.to);
    }

    const [agg] = await CellAttendanceReport.aggregate([
      { $match: q },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          men: { $sum: "$totals.men" },
          women: { $sum: "$totals.women" },
          children: { $sum: "$totals.children" },
          firstTimers: { $sum: "$totals.firstTimers" },
          newConverts: { $sum: "$totals.newConverts" },
        }
      }
    ]);

    const cellsCreated = await CellGroup.countDocuments(
      params.from || params.to
        ? {
            ...(params.churchId ? { churchId: oid(params.churchId) } : {}),
            ...(params.from ? { createdAt: { $gte: new Date(params.from) } } : {}),
            ...(params.to ? { createdAt: { ...(params.from ? {} : { $lte: new Date(params.to) }) } } : {}),
          }
        : (params.churchId ? { churchId: oid(params.churchId) } : {})
    );

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
}

export default new CellService();
