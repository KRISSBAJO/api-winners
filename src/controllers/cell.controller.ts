// src/controllers/cell.controller.ts
import { Request, Response } from "express";
import cellService from "../services/cell.service";
import { PERMISSIONS } from "../config/permissions";
import { authorize } from "../middleware/authorize";
import { authenticate } from "../middleware/auth";

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
export const listReports = async (req: Request, res: Response) => {
  const items = await cellService.listReports(req.query, req.user as any);
  res.json(items);
};
export const analytics = async (req: Request, res: Response) => {
  const data = await cellService.analytics({ churchId: req.query.churchId as string, from: req.query.from as string, to: req.query.to as string });
  res.json(data);
};
