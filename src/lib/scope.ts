import type { Request } from "express";

export type OrgScope = { nationalChurchId?: string; districtId?: string; churchId?: string };

export function isSiteAdmin(user: any) {
  return user?.role === "siteAdmin";
}

export function ownsScope(user: any, scope: OrgScope) {
  if (!scope) return false;
  // siteAdmin owns everything
  if (isSiteAdmin(user)) return true;

  // strict equality per level if provided
  if (scope.nationalChurchId && String(user.nationalChurchId) !== String(scope.nationalChurchId)) return false;
  if (scope.districtId      && String(user.districtId)      !== String(scope.districtId)) return false;
  if (scope.churchId        && String(user.churchId)        !== String(scope.churchId)) return false;
  return true;
}

/** User can act in their own scope OR any delegated scope that matches the target */
export function canActInScope(user: any, target: OrgScope) {
  if (ownsScope(user, target)) return true;
  const ds = user?.delegatedScopes || [];
  return ds.some((s: OrgScope) => {
    if (target.nationalChurchId && String(s.nationalChurchId) !== String(target.nationalChurchId)) return false;
    if (target.districtId       && String(s.districtId)       !== String(target.districtId)) return false;
    if (target.churchId         && String(s.churchId)         !== String(target.churchId)) return false;
    return true;
  });
}

/** Useful in controllers to quickly enforce */
export function assertScope(user: any, scope: OrgScope) {
  if (!canActInScope(user, scope)) {
    const e: any = new Error("Forbidden (scope)");
    e.statusCode = 403;
    throw e;
  }
}
