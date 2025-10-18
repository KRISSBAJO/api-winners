// src/services/user.service.ts
import User, { IUser } from "../models/User";
import fs from "fs";
import { buildOrgScopeFilter, assertPayloadWithinScope } from "../middleware/scope";
import { uploadImage, deleteImage } from "../config/cloudinary";
import { pushNotif } from "../realtime/notify"; // <-- add this
import bcrypt from "bcryptjs";

const SITE = "siteAdmin";
const CHURCH_ADMIN = "churchAdmin";
const NATIONAL = "nationalPastor";
const DISTRICT = "districtPastor";

const isSite = (u?: any) => u?.role === SITE;
const isChurchAdmin = (u?: any) => u?.role === CHURCH_ADMIN;
const eq = (a?: any, b?: any) => a && b && String(a) === String(b);

const USER_POPULATE = [
  { path: "nationalChurchId", select: "name code contactEmail contactPhone" },
  { path: "districtId", select: "name code" },
  { path: "churchId", select: "name churchId contactEmail contactPhone" },
];

const baseSelect = "-password -resetPasswordToken -resetPasswordExpires -__v";

const assertSameChurchIfNotSite = (actor?: any, targetChurchId?: any) => {
  if (isSite(actor)) return;
  if (!eq(actor?.churchId, targetChurchId)) {
    throw Object.assign(new Error("Forbidden: out of church scope"), { statusCode: 403 });
  }
};

const looksHashed = (pwd?: string) => typeof pwd === "string" && pwd.startsWith("$2");

const canAssignRole = (actor: any, role?: string) => {
  if (!role) return true;
  if (isSite(actor)) return true;
  if (isChurchAdmin(actor)) {
    if ([SITE, NATIONAL, DISTRICT].includes(role)) return false;
    return true;
  }
  return false;
};

const normalizePayloadForChurchAdmin = (actor: any, data: Partial<IUser>) => {
  if (isChurchAdmin(actor)) {
    return {
      ...data,
      churchId: actor.churchId,
      districtId: actor.districtId ?? data.districtId,
      nationalChurchId: actor.nationalChurchId ?? data.nationalChurchId,
    };
  }
  return data;
};

const findOnePopulatedById = async (id: string) =>
  User.findById(id).select(baseSelect).populate(USER_POPULATE).lean();

export const getAllUsers = async (actor?: any) => {
  const scope = buildOrgScopeFilter(actor);
  return User.find(scope).select(baseSelect).populate(USER_POPULATE).lean();
};

export const createUser = async (actor: any, raw: Partial<IUser>) => {
  if (!actor) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (!canAssignRole(actor, raw.role)) {
    throw Object.assign(new Error("Forbidden: cannot assign target role"), { statusCode: 403 });
  }

  const data = normalizePayloadForChurchAdmin(actor, raw);
  assertPayloadWithinScope(actor, data);

  if (isChurchAdmin(actor) && !data.churchId) {
    throw Object.assign(new Error("Church admin must specify (or inherit) churchId"), { statusCode: 400 });
  }
  if (!data.password) {
    throw Object.assign(new Error("Password is required"), { statusCode: 400 });
  }

  // 🔒 service-level guard
  if (!looksHashed(data.password)) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const created = await User.create({ ...data, createdBy: actor?.id });
  const safe = await findOnePopulatedById(String(created._id));

  // (notifications remain as you already added)
  try {
    await pushNotif({
      kind: "user.created",
      title: "Welcome to Dominion Connect",
      message: "Your account has been created.",
      scope: "user",
      scopeRef: String(created._id),
      actorId: actor.id,
      actorName: `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || "System",
    });
    if (created.churchId) {
      await pushNotif({
        kind: "user.created",
        title: "New user added",
        message: `${created.firstName} ${created.lastName} was added.`,
        scope: "church",
        scopeRef: String(created.churchId),
        actorId: actor.id,
        actorName: `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || "System",
        activity: {
          verb: "created-user",
          churchId: String(created.churchId),
          target: { type: "User", id: String(created._id), name: created.email },
        },
      });
    }
  } catch {}

  return safe;
};

export const getUserById = async (id: string, actor?: any) => {
  const u = await User.findById(id).select(baseSelect).populate(USER_POPULATE).lean();
  if (!u) return null;
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, (u as any).churchId?._id || (u as any).churchId);
  return u;
};

export const updateProfile = async (
  userId: string,
  data: Partial<IUser>,
  file?: Express.Multer.File
) => {
  // fetch current to know existing avatarPublicId
  const current = await User.findById(userId).select("avatar avatarPublicId");
  if (!current) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  let avatar: string | undefined;
  let avatarPublicId: string | undefined;

  if (file?.path) {
    // upload to Cloudinary
    const uploaded = await uploadImage(file.path, "dominion_connect/avatars");
    avatar = uploaded.url;
    avatarPublicId = uploaded.publicId;

    // cleanup tmp file
    try { fs.unlinkSync(file.path); } catch {}
  }

  // build patch (only allow safe profile fields here)
  const patch: Partial<IUser> = {
    firstName: data.firstName,
    middleName: data.middleName,
    lastName:  data.lastName,
    phone:     data.phone,
    ...(avatar ? { avatar } : {}),
    ...(avatarPublicId ? { avatarPublicId } : {}),
  };

  await User.findByIdAndUpdate(userId, patch, { new: false });

  // if we replaced avatar, remove the old asset
  if (avatarPublicId && current.avatarPublicId && current.avatarPublicId !== avatarPublicId) {
    try { await deleteImage(current.avatarPublicId); } catch {}
  }

  return User.findById(userId).select(baseSelect).populate(USER_POPULATE).lean();
};

export const toggleActiveStatus = async (id: string, actor?: any) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, user.churchId);

  user.isActive = !user.isActive;
  await user.save();
  const safe = await findOnePopulatedById(id);

  // 🔔 notifs
  try {
    await pushNotif({
      kind: "user.status",
      title: user.isActive ? "Account activated" : "Account deactivated",
      message: user.isActive
        ? "Your account has been reactivated."
        : "Your account has been deactivated. Contact your admin if this is unexpected.",
      scope: "user",
      scopeRef: String(user._id),
      actorId: actor?.id,
      actorName: `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System",
    });

    if (user.churchId) {
      await pushNotif({
        kind: "user.status",
        title: user.isActive ? "User activated" : "User deactivated",
        message: `${user.firstName} ${user.lastName}`,
        scope: "church",
        scopeRef: String(user.churchId),
        actorId: actor?.id,
        actorName: `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System",
        activity: {
          verb: user.isActive ? "activate-user" : "deactivate-user",
          churchId: String(user.churchId),
          target: { type: "User", id: String(user._id), name: user.email },
        },
      });
    }
  } catch (_) {}

  return safe;
};

export const deleteUser = async (id: string, actor?: any) => {
  const u = await User.findById(id);
  if (!u) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  if (!isSite(actor)) assertSameChurchIfNotSite(actor, u.churchId);

  await u.deleteOne();

  // 🔔 org notif (we can’t notify the deleted user room safely after delete)
  try {
    if (u.churchId) {
      await pushNotif({
        kind: "user.deleted",
        title: "User removed",
        message: `${u.firstName} ${u.lastName}`,
        scope: "church",
        scopeRef: String(u.churchId),
        actorId: actor?.id,
        actorName: `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System",
        activity: {
          verb: "delete-user",
          churchId: String(u.churchId),
          target: { type: "User", id: String(u._id), name: u.email },
        },
      });
    }
  } catch (_) {}

  return { ok: true };
};
export const updateUserAdmin = async (
  id: string,
  raw: Partial<IUser>,
  actor?: any,
  file?: Express.Multer.File
) => {
  const target = await User.findById(id).select("churchId avatarPublicId");
  if (!target) return null;

  if (!isSite(actor)) assertSameChurchIfNotSite(actor, target.churchId);

  if (!canAssignRole(actor, raw.role ?? (target as any).role)) {
    throw Object.assign(new Error("Forbidden: cannot assign target role"), { statusCode: 403 });
  }

  const data = normalizePayloadForChurchAdmin(actor, raw);
  assertPayloadWithinScope(actor, { ...target.toObject(), ...data });

  // Optional avatar upload (admin can replace user’s avatar)
  let avatar: string | undefined;
  let avatarPublicId: string | undefined;

  if (file?.path) {
    const uploaded = await uploadImage(file.path, "dominion_connect/avatars");
    avatar = uploaded.url;
    avatarPublicId = uploaded.publicId;
    try { fs.unlinkSync(file.path); } catch {}
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
    ...(avatar ? { avatar } : {}),
    ...(avatarPublicId ? { avatarPublicId } : {}),
    // password: data.password (allowed) — hashed by schema pre-hooks if present
  };

  await User.findByIdAndUpdate(id, patch, { new: false });
  const safe = await findOnePopulatedById(id);

  // If avatar replaced, delete old
  if (avatarPublicId && target.avatarPublicId && target.avatarPublicId !== avatarPublicId) {
    try { await deleteImage(target.avatarPublicId); } catch {}
  }

  // 🔔 notifs
  try {
    await pushNotif({
      kind: "user.updated",
      title: "Account updated",
      message: "Your account details were changed by an administrator.",
      scope: "user",
      scopeRef: String(id),
      actorId: actor?.id,
      actorName: `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System",
    });

    if (target.churchId) {
      await pushNotif({
        kind: "user.updated",
        title: "User updated",
        message: `${safe?.firstName ?? ""} ${safe?.lastName ?? ""}`.trim(),
        scope: "church",
        scopeRef: String(target.churchId),
        actorId: actor?.id,
        actorName: `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System",
        activity: {
          verb: "update-user",
          churchId: String(target.churchId),
          target: { type: "User", id: String(id), name: safe?.email ?? "" },
          meta: { changed: Object.keys(patch).filter(Boolean) },
        },
      });
    }
  } catch (_) {}

  return safe;
};

export const getUsersByChurch = async (
  churchId: string,
  actor?: any,
  opts?: { q?: string; limit?: number; cursor?: string }
) => {
  if (!churchId) throw Object.assign(new Error("churchId is required"), { statusCode: 400 });

  // scope guard: non-site must match own church
  if (!isSite(actor) && String(actor?.churchId) !== String(churchId)) {
    throw Object.assign(new Error("Forbidden: out of church scope"), { statusCode: 403 });
  }

  const lim = Math.min(Math.max(Number(opts?.limit ?? 30), 1), 100);
  const q = (opts?.q ?? "").trim();
  const cursor = opts?.cursor;

  const filter: any = { churchId };
  if (cursor) filter._id = { $gt: cursor };

  if (q) {
    filter.$or = [
      { firstName: new RegExp(q, "i") },
      { lastName:  new RegExp(q, "i") },
      { email:     new RegExp(q, "i") },
      { phone:     new RegExp(q, "i") },
    ];
  }

  const docs = await User.find(filter)
    .select(baseSelect)
    .sort({ _id: 1 })
    .limit(lim + 1)
    .lean();

  const items = docs.slice(0, lim);
  const nextCursor = docs.length > lim ? String(docs[lim]._id) : undefined;

  return { items, nextCursor };
};
