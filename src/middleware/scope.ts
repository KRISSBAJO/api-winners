// src/middleware/scope.ts
import type { AuthUser } from "../types/express";

/**
 * Build a MongoDB filter for org-scoped queries.
 * For siteAdmin: returns {} (no restriction).
 * For nationalPastor: filter by nationalChurchId.
 * For districtPastor: filter by districtId (and implicitly national if present).
 * For churchAdmin/pastor/volunteer: filter by churchId (and implied parents if present).
 */
export function buildOrgScopeFilter(
  actor?: AuthUser,
  extra: Record<string, any> = {}
): Record<string, any> {
  if (!actor) return { ...extra };
  if (actor.role === "siteAdmin") return { ...extra };

  // Start narrowest first
  const filter: Record<string, any> = { ...extra };

  if (actor.churchId) filter.churchId = actor.churchId;
  if (actor.districtId) filter.districtId = actor.districtId;
  if (actor.nationalChurchId) filter.nationalChurchId = actor.nationalChurchId;

  return filter;
}

/**
 * Validate that a payload with org fields stays within the actor's scope.
 * Throws on violation; otherwise returns void.
 */
export function assertPayloadWithinScope(actor: AuthUser, payload: Record<string, any>) {
  if (actor.role === "siteAdmin") return;

  // If actor is scoped by church, payload (when present) must match.
  if (actor.churchId && payload.churchId && String(payload.churchId) !== String(actor.churchId)) {
    throw makeScopeError("churchId");
  }
  // If actor is scoped by district, payload (when present) must match.
  if (actor.districtId && payload.districtId && String(payload.districtId) !== String(actor.districtId)) {
    throw makeScopeError("districtId");
  }
  // If actor is scoped by national, payload (when present) must match.
  if (
    actor.nationalChurchId &&
    payload.nationalChurchId &&
    String(payload.nationalChurchId) !== String(actor.nationalChurchId)
  ) {
    throw makeScopeError("nationalChurchId");
  }

  // Also: if actor has church scope, don't allow assigning siteAdmin
  if ((payload as { role?: AuthUser["role"] }).role === "siteAdmin") {
  throw new Error("Forbidden: cannot assign siteAdmin role");
}
}

function makeScopeError(field: string) {
  const err: any = new Error(`Forbidden: payload ${field} is outside your scope`);
  err.statusCode = 403;
  return err;
}
