// controllers/attendance.admin.controller.ts
import { Request, Response } from "express";
import { Types } from "mongoose";
import Attendance from "../models/Attendance";

// Helper: build $match from optional filters
function buildMatch({ nationalId, districtId, churchId, from, to }: any) {
  const match: any = { isDeleted: false };

  // If you DO NOT denormalize, join to Church→District→National
  // Otherwise, if Attendance has districtId/nationalId fields, just match those directly.

  if (churchId) match.churchId = new Types.ObjectId(churchId);

  // Optional time bounds
  if (from || to) {
    match.serviceDate = {};
    if (from) match.serviceDate.$gte = new Date(from);
    if (to)   match.serviceDate.$lte = new Date(to);
  }
  return match;
}

export async function summary(req: Request, res: Response) {
  const { nationalId, districtId, churchId, from, to } = req.query as any;

  // If you need hierarchy filter, do $lookup to Churches/Districts/Nationals and $match
  const pipeline: any[] = [
    { $match: buildMatch({ nationalId, districtId, churchId, from, to }) },
  ];

  // Example: lookup to churches and then optional match
  if (nationalId || districtId) {
    pipeline.push(
      { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
      { $unwind: "$church" }
    );
  }
  if (districtId) {
    pipeline.push(
      { $match: { "church.districtId": new Types.ObjectId(districtId) } }
    );
  }
  if (nationalId) {
    pipeline.push(
      { $lookup: { from: "districts", localField: "church.districtId", foreignField: "_id", as: "dist" } },
      { $unwind: "$dist" },
      { $match: { "dist.nationalChurchId": new Types.ObjectId(nationalId) } }
    );
  }

  const [byType, totals] = await Promise.all([
    Attendance.aggregate([
      ...pipeline,
      {
        $group: {
          _id: "$serviceType",
          services: { $sum: 1 },
          men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" },
          firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" },
          holyGhostBaptisms: { $sum: "$holyGhostBaptisms" },
          online: { $sum: "$online" }, ushers: { $sum: "$ushers" }, choir: { $sum: "$choir" },
          total: { $sum: { $add: ["$men","$women","$children","$online","$ushers","$choir"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Attendance.aggregate([
      ...pipeline,
      {
        $group: {
          _id: null,
          services: { $sum: 1 },
          men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" },
          firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" },
          holyGhostBaptisms: { $sum: "$holyGhostBaptisms" },
          online: { $sum: "$online" }, ushers: { $sum: "$ushers" }, choir: { $sum: "$choir" },
          total: { $sum: { $add: ["$men","$women","$children","$online","$ushers","$choir"] } },
        },
      },
    ]),
  ]);

  res.json({
    totals: totals[0] || {
      services: 0, men: 0, women: 0, children: 0, firstTimers: 0, newConverts: 0,
      holyGhostBaptisms: 0, online: 0, ushers: 0, choir: 0, total: 0,
    },
    byServiceType: byType,
  });
}

export async function timeseries(req: Request, res: Response) {
  const { nationalId, districtId, churchId, from, to, serviceType } = req.query as any;

  const pipeline: any[] = [
    { $match: buildMatch({ nationalId, districtId, churchId, from, to }) },
  ];
  if (serviceType) pipeline[0].$match.serviceType = serviceType;

  if (nationalId || districtId) {
    pipeline.push(
      { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
      { $unwind: "$church" }
    );
  }
  if (districtId) {
    pipeline.push({ $match: { "church.districtId": new Types.ObjectId(districtId) } });
  }
  if (nationalId) {
    pipeline.push(
      { $lookup: { from: "districts", localField: "church.districtId", foreignField: "_id", as: "dist" } },
      { $unwind: "$dist" },
      { $match: { "dist.nationalChurchId": new Types.ObjectId(nationalId) } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: "$serviceDate",
        total: { $sum: { $add: ["$men","$women","$children","$online","$ushers","$choir"] } },
        men: { $sum: "$men" }, women: { $sum: "$women" }, children: { $sum: "$children" },
        firstTimers: { $sum: "$firstTimers" }, newConverts: { $sum: "$newConverts" },
        holyGhostBaptisms: { $sum: "$holyGhostBaptisms" },
      },
    },
    { $sort: { _id: 1 } },
  );

  const data = await Attendance.aggregate(pipeline);
  res.json(data);
}

export async function leaderboard(req: Request, res: Response) {
  const { nationalId, districtId, from, to, limit = 10 } = req.query as any;

  const pipeline: any[] = [{ $match: buildMatch({ from, to }) }];

  pipeline.push(
    { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
    { $unwind: "$church" }
  );
  if (districtId) pipeline.push({ $match: { "church.districtId": new Types.ObjectId(districtId) } });
  if (nationalId) {
    pipeline.push(
      { $lookup: { from: "districts", localField: "church.districtId", foreignField: "_id", as: "dist" } },
      { $unwind: "$dist" },
      { $match: { "dist.nationalChurchId": new Types.ObjectId(nationalId) } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: "$churchId",
        total: { $sum: { $add: ["$men","$women","$children","$online","$ushers","$choir"] } },
        services: { $sum: 1 },
        firstTimers: { $sum: "$firstTimers" },
        newConverts: { $sum: "$newConverts" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: "churches", localField: "_id", foreignField: "_id", as: "church" } },
    { $unwind: "$church" },
    {
      $project: {
        _id: 1,
        churchName: "$church.name",
        total: 1,
        services: 1,
        firstTimers: 1,
        newConverts: 1,
      },
    }
  );

  const data = await Attendance.aggregate(pipeline);
  res.json(data);
}
