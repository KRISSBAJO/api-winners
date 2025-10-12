// src/services/attendance.service.ts
import { Types } from "mongoose";
import Attendance, { IAttendance, ServiceType } from "../models/Attendance";
import { canActOnChurch, isSiteAdmin } from "../lib/access";
import { buildOrgScopeFilter } from "../middleware/scope";

type Actor = any;

type ListParams = {
  churchId?: string;
  from?: string;
  to?: string;
  serviceType?: ServiceType;
  q?: string;
  page?: number;
  limit?: number;
  sort?: "serviceDate" | "-serviceDate" | "createdAt" | "-createdAt";
  includeDeleted?: boolean;
};

function ensureChurchScope(actor: Actor, churchId?: string) {
  if (!canActOnChurch(actor, churchId)) throw new Error("Forbidden");
}

export const AttendanceService = {
  async create(data: Partial<IAttendance>, actor: Actor) {
    ensureChurchScope(actor, data.churchId as any);
    const doc = await Attendance.create({
      ...data,
      createdBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
      updatedBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
    });
    return doc;
  },

  async upsertByKey(
    key: { churchId: string; serviceDate: string | Date; serviceType: ServiceType },
    patch: Partial<IAttendance>,
    actor: Actor
  ) {
    ensureChurchScope(actor, key.churchId);

    const serviceDate = new Date(key.serviceDate);
    const normalized = new Date(Date.UTC(serviceDate.getUTCFullYear(), serviceDate.getUTCMonth(), serviceDate.getUTCDate()));

    const { churchId: _c, serviceDate: _sd, serviceType: _st, _id: _id, createdBy: _cb, updatedBy: _ub, isDeleted: _del, ...safePatch } = patch || {};

    const doc = await Attendance.findOneAndUpdate(
      {
        churchId: new Types.ObjectId(key.churchId),
        serviceDate: normalized,
        serviceType: key.serviceType,
        isDeleted: false,
      },
      {
        $setOnInsert: {
          churchId: new Types.ObjectId(key.churchId),
          serviceDate: normalized,
          serviceType: key.serviceType,
          createdBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
        },
        $set: {
          ...safePatch,
          updatedBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
        },
      },
      { new: true, upsert: true }
    );

    return doc!;
  },

  async update(id: string, data: Partial<IAttendance>, actor: Actor) {
    const current = await Attendance.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!current) throw new Error("Not found");
    ensureChurchScope(actor, String(current.churchId));

    const doc = await Attendance.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { ...data, updatedBy: actor?.id ? new Types.ObjectId(actor.id) : undefined },
      { new: true }
    );
    return doc!;
  },

  async remove(id: string, actor: Actor) {
    const current = await Attendance.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!current) throw new Error("Not found");
    ensureChurchScope(actor, String(current.churchId));
    await Attendance.findByIdAndUpdate(id, { isDeleted: true });
    return { message: "Deleted" };
  },

  async getById(id: string, actor: Actor) {
    const doc = await Attendance.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!doc) return null;
    // read scope: allow siteAdmin or same church
    if (!isSiteAdmin(actor) && String(doc.churchId) !== String(actor.churchId)) return null;
    return doc;
  },

  async list(params: ListParams, actor: Actor) {
    const {
      churchId, from, to, serviceType, page = 1, limit = 20, sort = "-serviceDate", includeDeleted = false,
    } = params;

    const query: any = {};
    if (!includeDeleted) query.isDeleted = { $ne: true };

    // org scope: actor can only see within their scope
    if (isSiteAdmin(actor)) {
      if (churchId) query.churchId = new Types.ObjectId(churchId);
    } else {
      query.churchId = new Types.ObjectId(actor.churchId);
    }

    if (serviceType) query.serviceType = serviceType;
    if (from || to) {
      query.serviceDate = {};
      if (from) query.serviceDate.$gte = new Date(from);
      if (to) query.serviceDate.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Attendance.find(query).sort(sort).skip(skip).limit(limit),
      Attendance.countDocuments(query),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async summaryByRange(params: { churchId: string; from?: string; to?: string }, actor: Actor) {
    ensureChurchScope(actor, params.churchId);
    const { churchId, from, to } = params;
    const match: any = { isDeleted: false, churchId: new Types.ObjectId(churchId) };
    if (from || to) {
      match.serviceDate = {};
      if (from) match.serviceDate.$gte = new Date(from);
      if (to) match.serviceDate.$lte = new Date(to);
    }

    const [byType, all] = await Promise.all([
      Attendance.aggregate([
        { $match: match },
        { $group: { _id: "$serviceType", services: { $sum: 1 }, men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" }, firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" }, holyGhostBaptisms: { $sum: "$holyGhostBaptisms" }, online: { $sum: "$online" }, ushers: { $sum: "$ushers" }, choir: { $sum: "$choir" },
          total: { $sum: { $add: ["$men", "$women", "$children", "$online", "$ushers", "$choir"] } } } },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([
        { $match: match },
        { $group: { _id: null, services: { $sum: 1 }, men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" }, firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" }, holyGhostBaptisms: { $sum: "$holyGhostBaptisms" }, online: { $sum: "$online" }, ushers: { $sum: "$ushers" }, choir: { $sum: "$choir" },
          total: { $sum: { $add: ["$men", "$women", "$children", "$online", "$ushers", "$choir"] } } } },
      ]),
    ]);

    return { totals: all[0] || { services: 0, men: 0, women: 0, children: 0, firstTimers: 0, newConverts: 0, holyGhostBaptisms: 0, online: 0, ushers: 0, choir: 0, total: 0 }, byServiceType: byType };
  },

  async timeseriesDaily(params: { churchId?: string; from?: string; to?: string; serviceType?: ServiceType }, actor: Actor) {
    const churchId = isSiteAdmin(actor) ? params.churchId : actor.churchId;
    if (!churchId) throw new Error("churchId is required");
    ensureChurchScope(actor, churchId);

    const { from, to, serviceType } = params;
    const match: any = { isDeleted: false, churchId: new Types.ObjectId(churchId) };
    if (from || to) {
      match.serviceDate = {};
      if (from) match.serviceDate.$gte = new Date(from);
      if (to) match.serviceDate.$lte = new Date(to);
    }
    if (serviceType) match.serviceType = serviceType;

    return Attendance.aggregate([
      { $match: match },
      { $group: { _id: "$serviceDate", services: { $sum: 1 }, total: { $sum: { $add: ["$men", "$women", "$children", "$online", "$ushers", "$choir"] } },
        men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" }, firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" }, holyGhostBaptisms: { $sum: "$holyGhostBaptisms" } } },
      { $sort: { _id: 1 } },
    ]);
  },

  async byWeek(params: { churchId?: string; from?: string; to?: string }, actor: Actor) {
    const churchId = isSiteAdmin(actor) ? params.churchId : actor.churchId;
    if (!churchId) throw new Error("churchId is required");
    ensureChurchScope(actor, churchId);

    const { from, to } = params;
    const match: any = { isDeleted: false, churchId: new Types.ObjectId(churchId) };
    if (from || to) {
      match.serviceDate = {};
      if (from) match.serviceDate.$gte = new Date(from);
      if (to) match.serviceDate.$lte = new Date(to);
    }

    return Attendance.aggregate([
      { $match: match },
      { $group: { _id: { year: { $isoWeekYear: "$serviceDate" }, week: { $isoWeek: "$serviceDate" } },
        services: { $sum: 1 },
        total: { $sum: { $add: ["$men", "$women", "$children", "$online", "$ushers", "$choir"] } },
        firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" }, holyGhostBaptisms: { $sum: "$holyGhostBaptisms" } } },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);
  },

  async exportCSV(params: { churchId?: string; from?: string; to?: string; serviceType?: ServiceType }, actor: Actor) {
    const churchId = isSiteAdmin(actor) ? params.churchId : actor.churchId;
    if (!churchId) throw new Error("churchId is required");
    ensureChurchScope(actor, churchId);

    const list = await this.list({ ...params, churchId, page: 1, limit: 10_000 }, actor);
    const headers = ["serviceDate","serviceType","men","women","children","firstTimers","newConverts","holyGhostBaptisms","online","ushers","choir","total","notes"];
    const toRow = (a: IAttendance) => [
      a.serviceDate.toISOString().slice(0, 10), a.serviceType, a.men, a.women, a.children, a.firstTimers, a.newConverts, a.holyGhostBaptisms, a.online ?? 0, a.ushers ?? 0, a.choir ?? 0,
      (a.men + a.women + a.children + (a.online ?? 0) + (a.ushers ?? 0) + (a.choir ?? 0)), (a.notes || "").replace(/\n/g, " "),
    ];
    const rows = [headers.join(","), ...list.items.map(toRow).map(r => r.join(","))];
    return rows.join("\n");
  },
};
