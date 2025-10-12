// src/services/user.service.ts
import User, { IUser } from "../models/User";
import { buildOrgScopeFilter, assertPayloadWithinScope } from "../middleware/scope";

const SITE = "siteAdmin";
const CHURCH_ADMIN = "churchAdmin";
const NATIONAL = "nationalPastor";
const DISTRICT = "districtPastor";

const isSite = (u?: any) => u?.role === SITE;
const isChurchAdmin = (u?: any) => u?.role === CHURCH_ADMIN;
const eq = (a?: any, b?: any) => a && b && String(a) === String(b);

/** Centralized populate config so every query returns human labels */
const USER_POPULATE = [
  { path: "nationalChurchId", select: "name code contactEmail contactPhone" },
  { path: "districtId", select: "name code" },
  { path: "churchId", select: "name churchId contactEmail contactPhone" },
];

const baseSelect = "-password -resetPasswordToken -resetPasswordExpires -__v";

/** Church-scoped admins can only act within their church */
const assertSameChurchIfNotSite = (actor?: any, targetChurchId?: any) => {
  if (isSite(actor)) return;
  if (!eq(actor?.churchId, targetChurchId)) {
    throw Object.assign(new Error("Forbidden: out of church scope"), { statusCode: 403 });
  }
};

/** Church admins cannot assign high-privilege roles */
const canAssignRole = (actor: any, role?: string) => {
  if (!role) return true;
  if (isSite(actor)) return true;
  if (isChurchAdmin(actor)) {
    if ([SITE, NATIONAL, DISTRICT].includes(role)) return false;
    return true; // can assign churchAdmin/pastor/volunteer
  }
  return false;
};

/** When a church admin creates/updates someone, force the church scope if not provided. */
const normalizePayloadForChurchAdmin = (actor: any, data: Partial<IUser>) => {
  if (isChurchAdmin(actor)) {
    // must stay inside actor's church
    return {
      ...data,
      churchId: actor.churchId, // lock to actor church
      districtId: actor.districtId ?? data.districtId,
      nationalChurchId: actor.nationalChurchId ?? data.nationalChurchId,
    };
  }
  return data;
};

/** Helper to refetch a single user populated (by id) */
const findOnePopulatedById = async (id: string) => {
  return User.findById(id).select(baseSelect).populate(USER_POPULATE).lean();
};

export const getAllUsers = async (actor?: any) => {
  const scope = buildOrgScopeFilter(actor);
  return User.find(scope).select(baseSelect).populate(USER_POPULATE).lean();
};

export const createUser = async (actor: any, raw: Partial<IUser>) => {
  if (!actor) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (!canAssignRole(actor, raw.role)) {
    throw Object.assign(new Error("Forbidden: cannot assign target role"), { statusCode: 403 });
  }

  // Ensure payload stays in actor's scope
  const data = normalizePayloadForChurchAdmin(actor, raw);
  assertPayloadWithinScope(actor, data);

  // Church admin cannot create without church scope
  if (isChurchAdmin(actor) && !data.churchId) {
    throw Object.assign(new Error("Church admin must specify (or inherit) churchId"), { statusCode: 400 });
  }

  const created = await User.create({ ...data, createdBy: actor?.id });
  // Return populated version
  return findOnePopulatedById(String(created._id));
};

export const getUserById = async (id: string, actor?: any) => {
  const u = await User.findById(id).select(baseSelect).populate(USER_POPULATE).lean();
  if (!u) return null;
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, u.churchId && (u as any).churchId?._id || (u as any).churchId);
  return u;
};

export const updateProfile = async (
  userId: string,
  data: Partial<IUser>,
  _file?: Express.Multer.File
) => {
  await User.findByIdAndUpdate(
    userId,
    {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      phone: data.phone,
    },
    { new: false }
  );
  return findOnePopulatedById(userId);
};

export const toggleActiveStatus = async (id: string, actor?: any) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, user.churchId);
  user.isActive = !user.isActive;
  await user.save();
  return findOnePopulatedById(id);
};

export const deleteUser = async (id: string, actor?: any) => {
  const u = await User.findById(id);
  if (!u) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, u.churchId);
  await u.deleteOne();
  return { ok: true };
};

export const updateUserAdmin = async (id: string, raw: Partial<IUser>, actor?: any) => {
  const target = await User.findById(id);
  if (!target) return null;

  if (!isSite(actor)) assertSameChurchIfNotSite(actor, target.churchId);

  // Role guard
  if (!canAssignRole(actor, raw.role ?? target.role)) {
    throw Object.assign(new Error("Forbidden: cannot assign target role"), { statusCode: 403 });
  }

  // Normalize + scope guard
  const data = normalizePayloadForChurchAdmin(actor, raw);
  assertPayloadWithinScope(actor, { ...target.toObject(), ...data });

  // Church admin cannot elevate to site/national/district
  if (isChurchAdmin(actor) && data.role && [SITE, NATIONAL, DISTRICT].includes(data.role)) {
    throw Object.assign(new Error("Forbidden: cannot assign that role"), { statusCode: 403 });
  }

  const patch: Partial<IUser> = {
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    phone: data.phone,
    isActive: data.isActive,
    role: data.role,
    churchId: data.churchId,
    districtId: data.districtId,
    nationalChurchId: data.nationalChurchId,
  };

  await User.findByIdAndUpdate(id, patch, { new: false });
  return findOnePopulatedById(id);
};
