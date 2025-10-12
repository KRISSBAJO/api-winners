import { Request, Response } from "express";
import * as DistrictService from "../services/district.service";

/** Create */
export const create = async (req: any, res: Response) => {
  try {
    const record = await DistrictService.createDistrict(req.body, req.user);
    res.status(201).json(record);
  } catch (err: any) {
    // convert scope violations to 403
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** List (scope-aware) */
export const list = async (req: any, res: Response) => {
  const rows = await DistrictService.getDistricts(req.user);
  res.json(rows);
};

/** Get one (404 if out-of-scope or missing) */
export const get = async (req: any, res: Response) => {
  const doc = await DistrictService.getDistrictById(req.params.id, req.user);
  if (!doc) return res.status(404).json({ message: "District not found" });
  res.json(doc);
};

/** Update */
export const update = async (req: any, res: Response) => {
  try {
    const doc = await DistrictService.updateDistrict(req.params.id, req.body, req.user);
    if (!doc) return res.status(404).json({ message: "District not found" });
    res.json(doc);
  } catch (err: any) {
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** Delete */
export const remove = async (req: any, res: Response) => {
  try {
    const deleted = await DistrictService.deleteDistrict(req.params.id, req.user);
    if (!deleted) return res.status(404).json({ message: "District not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** List by national (scope-aware) */
export const getByNationalChurch = async (req: any, res: Response) => {
  const nationalChurchId = req.params.nationalChurchId;
  const districts = await DistrictService.getDistrictsByNationalChurch(nationalChurchId, req.user);
  res.json(districts);
};
