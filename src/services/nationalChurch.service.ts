import NationalChurch from "../models/NationalChurch";
import District from "../models/District";
import Church from "../models/Church";
import mongoose from "mongoose";

export const createNationalChurch = async (data: any) => {
  return await NationalChurch.create(data);
};

export const getNationalChurches = async () => {
  return await NationalChurch.find();
};

export const getNationalChurchById = async (id: string) => {
  return await NationalChurch.findById(id);
};

export const updateNationalChurch = async (id: string, data: any) => {
  return await NationalChurch.findByIdAndUpdate(id, data, { new: true });
};

export const deleteNationalChurch = async (id: string) => {
  return await NationalChurch.findByIdAndDelete(id);
};


// List districts under a national
export async function listDistrictsByNational(nationalId: string) {
  return District.find({ nationalChurchId: nationalId }).lean();
}

// List ALL churches under a national (via district join)
export async function listChurchesByNational(nationalId: string) {
  return Church.aggregate([
    {
      $lookup: {
        from: "districts",
        localField: "districtId",
        foreignField: "_id",
        as: "district",
      },
    },
    { $unwind: "$district" },
    {
      $match: { "district.nationalChurchId": new mongoose.Types.ObjectId(nationalId) },
    },
    {
      $project: {
        name: 1,
        churchId: 1,
        pastor: 1,
        contactEmail: 1,
        contactPhone: 1,
        address: 1,
        districtId: 1,
        "district._id": 1,
        "district.name": 1,
        "district.code": 1,
      },
    },
  ]);
}/**
 * Overview for a national church:
 * - info: basic national church details
 * - districts: each with embedded churches (+ churchCount)
 * - totals: { districts, churches, pastors }
 */
export async function nationalOverview(nationalId: string) {
  const natObjectId = new mongoose.Types.ObjectId(nationalId);

  // 1) Basic national info
  const info = await NationalChurch.findById(natObjectId)
    .select("_id name code nationalPastor address")
    .lean();
  if (!info) return null;

  // 2) Districts with embedded churches
  const rows = await District.aggregate([
    { $match: { nationalChurchId: natObjectId } },
    {
      $lookup: {
        from: "churches",
        localField: "_id",
        foreignField: "districtId",
        as: "churches",
      },
    },
    {
      $addFields: {
        churchCount: { $size: "$churches" },
        churches: {
          $map: {
            input: "$churches",
            as: "c",
            in: {
              _id: "$$c._id",
              name: "$$c.name",
              churchId: "$$c.churchId",
              pastor: "$$c.pastor",
              contactEmail: "$$c.contactEmail",
              contactPhone: "$$c.contactPhone",
              address: "$$c.address",
              districtId: "$$c.districtId",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        code: 1,
        districtPastor: 1,
        address: 1,
        churchCount: 1,
        churches: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  // 3) Totals (including unique pastors)
  const totals = rows.reduce(
    (acc, d: any) => {
      acc.districts += 1;
      acc.churches += d.churchCount || 0;
      for (const c of d.churches || []) {
        if (c.pastor) acc._pastorSet.add(String(c.pastor));
      }
      return acc;
    },
    { districts: 0, churches: 0, _pastorSet: new Set<string>() }
  );

  const result = {
    info,
    totals: {
      districts: totals.districts,
      churches: totals.churches,
      pastors: totals._pastorSet.size,
    },
    districts: rows,
  };

  return result;
}