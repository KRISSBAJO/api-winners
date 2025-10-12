import { Request, Response } from "express";
import { AttendanceService } from "../services/attendance.service";

export const create = async (req: Request, res: Response) => {
  try {
    const doc = await AttendanceService.create(req.body, req.user);
    res.status(201).json(doc);
  } catch (err: any) {
    const code = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(code).json({ message: err.message });
  }
};

export const upsert = async (req: Request, res: Response) => {
  try {
    const { churchId, serviceDate, serviceType, ...rest } = req.body || {};
    if (!churchId || !serviceDate || !serviceType) {
      return res
        .status(400)
        .json({ message: "churchId, serviceDate, serviceType are required" });
    }
    const {
      churchId: _c,
      serviceDate: _sd,
      serviceType: _st,
      _id: _id,
      createdBy: _cb,
      updatedBy: _ub,
      isDeleted: _del,
      ...patch
    } = rest;

    const doc = await AttendanceService.upsertByKey(
      { churchId, serviceDate, serviceType },
      patch,
      req.user
    );
    res.json(doc);
  } catch (err: any) {
    const code = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(code).json({ message: err.message || "Upsert failed" });
  }
};

export const list = async (req: Request, res: Response) => {
  const data = await AttendanceService.list(req.query as any, req.user);
  res.json(data);
};

export const get = async (req: Request, res: Response) => {
  const doc = await AttendanceService.getById(req.params.id, req.user);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
};

export const update = async (req: Request, res: Response) => {
  try {
    const doc = await AttendanceService.update(req.params.id, req.body, req.user);
    res.json(doc);
  } catch (err: any) {
    const code = /not found/i.test(err.message)
      ? 404
      : /forbidden|unauthorized/i.test(err.message)
      ? 403
      : 400;
    res.status(code).json({ message: err.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await AttendanceService.remove(req.params.id, req.user);
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    const code = /not found/i.test(err.message)
      ? 404
      : /forbidden|unauthorized/i.test(err.message)
      ? 403
      : 400;
    res.status(code).json({ message: err.message });
  }
};

/** Summaries */
export const summary = async (req: Request, res: Response) => {
  const { churchId, from, to } = req.query as any;
  if (!churchId) return res.status(400).json({ message: "churchId is required" });
  const data = await AttendanceService.summaryByRange({ churchId, from, to }, req.user);
  res.json(data);
};

export const timeseriesDaily = async (req: Request, res: Response) => {
  const { churchId, from, to, serviceType } = req.query as any;
  const data = await AttendanceService.timeseriesDaily(
    { churchId, from, to, serviceType },
    req.user
  );
  res.json(data);
};

export const byWeek = async (req: Request, res: Response) => {
  const { churchId, from, to } = req.query as any;
  const data = await AttendanceService.byWeek({ churchId, from, to }, req.user);
  res.json(data);
};

export const exportCSV = async (req: Request, res: Response) => {
  const { churchId, from, to, serviceType } = req.query as any;
  const csv = await AttendanceService.exportCSV(
    { churchId, from, to, serviceType },
    req.user
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="attendance_${churchId || req.user?.churchId || "scope"}.csv"`
  );
  res.send(csv);
};
