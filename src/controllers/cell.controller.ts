// src/controllers/cell.controller.ts
import { Request, Response } from "express";
import cellService from "../services/cell.service";
import CellAttendanceReport, { ICellAttendanceReport } from "../models/CellAttendanceReport";
import { Types } from "mongoose";

const oid = (v: string | Types.ObjectId) => typeof v === "string" ? new Types.ObjectId(v) : v;

export const listCells = async (req: Request, res: Response) => {
  const items = await cellService.listCells(req.user as any, req.query);
  res.json(items);
};
export const getCell = async (req: Request, res: Response) => {
  const item = await cellService.getCell(req.params.id, req.user as any);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
};
export const createCell = async (req: Request, res: Response) => {
  try {
    const item = await cellService.createCell(req.body, req.user as any);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const updateCell = async (req: Request, res: Response) => {
  try {
    const item = await cellService.updateCell(req.params.id, req.body, req.user as any);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const deleteCell = async (req: Request, res: Response) => {
  try {
    const ok = await cellService.deleteCell(req.params.id, req.user as any);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const addMembers = async (req: Request, res: Response) => {
  try {
    const item = await cellService.addMembers(req.params.id, req.body.memberIds || [], req.user as any);
    res.json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const removeMember = async (req: Request, res: Response) => {
  try {
    const item = await cellService.removeMember(req.params.id, req.params.memberId, req.user as any);
    res.json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

/* Meetings */
export const listMeetings = async (req: Request, res: Response) => {
  const items = await cellService.listMeetings(req.query, req.user as any);
  res.json(items);
};
export const scheduleMeeting = async (req: Request, res: Response) => {
  try {
    const item = await cellService.scheduleMeeting(req.body, req.user as any);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const updateMeeting = async (req: Request, res: Response) => {
  try {
    const item = await cellService.updateMeeting(req.params.id, req.body, req.user as any);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
export const deleteMeeting = async (req: Request, res: Response) => {
  try {
    const ok = await cellService.deleteMeeting(req.params.id, req.user as any);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

/* Reports */
export const submitReport = async (req: Request, res: Response) => {
  try {
    const rpt = await cellService.submitReport(req.body, req.user as any);
    res.status(201).json(rpt);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
const isOid = (v: unknown): v is string =>
  typeof v === "string" && Types.ObjectId.isValid(v);

export const listReports = async (req: Request, res: Response, next: Function) => {
  try {
    const { cellId, churchId, districtId, nationalChurchId, nationalId, from, to } = req.query;

    const params: any = {};
    if (isOid(cellId))       params.cellId = cellId;
    if (isOid(churchId))     params.churchId = churchId;
    if (isOid(districtId))   params.districtId = districtId;

    // support either ?nationalChurchId or ?nationalId
    const nat = typeof nationalChurchId === "string" ? nationalChurchId : (nationalId as string | undefined);
    if (isOid(nat)) params.nationalChurchId = nat;

    if (typeof from === "string") params.from = from;
    if (typeof to === "string")   params.to   = to;

    const items = await cellService.listReports(params, req.user as any);
    res.json(items);
  } catch (e) {
    next(e);
  }
};
export const analytics = async (req: Request, res: Response) => {
  const data = await cellService.analytics({ churchId: req.query.churchId as string, from: req.query.from as string, to: req.query.to as string });
  res.json(data);
};


export const updateReport = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body as Partial<ICellAttendanceReport>;
    // authorize by church on current report
    const current = await CellAttendanceReport.findById(id).select("churchId meetingId").lean();
    if (!current) return res.status(404).json({ message: "Report not found" });
    // optional: ensure canWriteChurch(req.user, current.churchId)
    const updated = await CellAttendanceReport.findByIdAndUpdate(
      id,
      { $set: {
        totals: body.totals,
        presentMemberIds: (body.presentMemberIds ?? []).map((v:any)=>oid(v)),
        comments: body.comments,
        date: body.date, // if you allow date correction
      }},
      { new: true }
    );
    res.json(updated);
  } catch (e:any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const ok = await cellService.useDeleteReport(req.params.id, req.user as any);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};