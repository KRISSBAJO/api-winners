// src/services/district.service.ts
import { Types } from "mongoose";
import District from "../models/District";
import type { AuthUser } from "../types/express";

// --- tiny helpers (kept local to avoid extra imports) ---
const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

const isSite        = (a?: AuthUser) => a?.role === "siteAdmin";
const isNational    = (a?: AuthUser) => a?.role === "nationalPastor";
const isDistrict    = (a?: AuthUser) => a?.role === "districtPastor";
const isChurchLevel = (a?: AuthUser) =>
  a?.role === "churchAdmin" || a?.role === "pastor" || a?.role === "volunteer";

/** Create a district.
 *  - siteAdmin: can create for any national
 *  - nationalPastor: can create only under their nationalChurchId (forced)
 */
export async function createDistrict(data: any, actor?: AuthUser) {
  if (!actor) throw new Error("Unauthorized");
  if (!(isSite(actor) || isNational(actor))) throw new Error("Forbidden");

  const payload = { ...data };
  if (isNational(actor)) {
    if (!actor.nationalChurchId) throw new Error("No national scope");
    payload.nationalChurchId = oid(actor.nationalChurchId);
  } else if (payload.nationalChurchId) {
    // normalize to ObjectId
    payload.nationalChurchId = oid(payload.nationalChurchId);
  } else {
    throw new Error("nationalChurchId is required");
  }

  return District.create(payload);
}

/** List districts with scope:
 *  - siteAdmin: all
 *  - nationalPastor: only their national
 *  - districtPastor/church/pastor/volunteer: only their district (if any)
 */
export async function getDistricts(actor?: AuthUser) {
  if (isSite(actor)) {
    return District.find().populate("nationalChurchId");
  }
  if (isNational(actor) && actor?.nationalChurchId) {
    return District.find({ nationalChurchId: oid(actor.nationalChurchId) }).populate("nationalChurchId");
  }
  if ((isDistrict(actor) || isChurchLevel(actor)) && actor?.districtId) {
    return District.find({ _id: oid(actor.districtId) }).populate("nationalChurchId");
  }
  // default: nothing visible
  return [];
}

/** Get one district (authorized if within scope) */
export async function getDistrictById(id: string, actor?: AuthUser) {
  const doc = await District.findById(id).populate("nationalChurchId");
  if (!doc) return null;

  if (isSite(actor)) return doc;

  if (isNational(actor) && actor?.nationalChurchId) {
    if (String(doc.nationalChurchId) === String(actor.nationalChurchId)) return doc;
    return null;
  }

  if ((isDistrict(actor) || isChurchLevel(actor)) && actor?.districtId) {
    if (String(doc._id) === String(actor.districtId)) return doc;
    return null;
  }

  return null;
}

/** Update a district (same scope rules as get) */
export async function updateDistrict(id: string, data: any, actor?: AuthUser) {
  const current = await District.findById(id);
  if (!current) return null;

  if (isSite(actor)) {
    // site can update anything
  } else if (isNational(actor) && actor?.nationalChurchId) {
    if (String(current.nationalChurchId) !== String(actor.nationalChurchId)) throw new Error("Forbidden");
    // nationalPastor cannot move district to another national
    if (data?.nationalChurchId && String(data.nationalChurchId) !== String(actor.nationalChurchId)) {
      throw new Error("Cannot change nationalChurchId out of scope");
    }
    data.nationalChurchId = oid(actor.nationalChurchId);
  } else if ((isDistrict(actor) || isChurchLevel(actor)) && actor?.districtId) {
    if (String(current._id) !== String(actor.districtId)) throw new Error("Forbidden");
    // deny moving or reassigning national via lower roles
    if (data?.nationalChurchId) delete data.nationalChurchId;
  } else {
    throw new Error("Forbidden");
  }

  // normalize ids if present
  if (data?.nationalChurchId) data.nationalChurchId = oid(data.nationalChurchId);

  return District.findByIdAndUpdate(id, data, { new: true });
}

/** Delete a district (same scope rules as update) */
export async function deleteDistrict(id: string, actor?: AuthUser) {
  const current = await District.findById(id);
  if (!current) return null;

  if (isSite(actor)) {
    return District.findByIdAndDelete(id);
  }

  if (isNational(actor) && actor?.nationalChurchId) {
    if (String(current.nationalChurchId) !== String(actor.nationalChurchId)) throw new Error("Forbidden");
    return District.findByIdAndDelete(id);
  }

  if ((isDistrict(actor) || isChurchLevel(actor)) && actor?.districtId) {
    // Generally you wouldn't allow district/church roles to delete a district
    throw new Error("Forbidden");
  }

  throw new Error("Forbidden");
}

/** List districts under a national, scoped:
 *  - siteAdmin: allowed for any national
 *  - nationalPastor: only if national matches theirs
 *  - others: none (or you can return their single district if it belongs)
 */
export async function getDistrictsByNationalChurch(nationalChurchId: string, actor?: AuthUser) {
  if (isSite(actor) || (isNational(actor) && String(actor?.nationalChurchId) === String(nationalChurchId))) {
    return District.find({ nationalChurchId: oid(nationalChurchId) }).populate("nationalChurchId");
  }

  if ((isDistrict(actor) || isChurchLevel(actor)) && actor?.districtId) {
    // show their district only if it belongs to this national
    const d = await District.findById(actor.districtId).select("nationalChurchId");
    if (d && String(d.nationalChurchId) === String(nationalChurchId)) {
      const one = await District.findById(actor.districtId).populate("nationalChurchId");
      return one ? [one] : [];
    }
    return [];
  }

  return [];
}
