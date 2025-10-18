import Role from "../models/Role";
import RoleDelegation from "../models/RoleDelegation";

export async function getPermissionsForRole(key?: string): Promise<string[]> {
  if (!key) return [];
  const role = await Role.findOne({ key }).lean();
  return role?.permissions ?? [];
}

export function union<T>(a: Iterable<T>, b: Iterable<T>) {
  const s = new Set(a);
  for (const x of b) s.add(x);
  return Array.from(s);
}

export async function getEffectivePermissionsForUser(user: {
  id: string;
  role: string;
}) {
  const basePerms = await getPermissionsForRole(user.role);
  const now = new Date();

  const delegations = await RoleDelegation.find({
    granteeId: user.id,
    isRevoked: { $ne: true },
    startsAt: { $lte: now },
    endsAt:   { $gte: now },
  }).lean();

  let merged = basePerms.slice();
  const delegatedScopes: Array<{ nationalChurchId?: string; districtId?: string; churchId?: string }> = [];

  for (const d of delegations) {
    let extra: string[] = [];
    if (d.permissions?.length) {
      extra = d.permissions;
    } else if (d.roleLike) {
      extra = await getPermissionsForRole(d.roleLike);
    }
    merged = union(merged, extra);
    delegatedScopes.push({
      nationalChurchId: d.scope?.nationalChurchId?.toString(),
      districtId: d.scope?.districtId?.toString(),
      churchId: d.scope?.churchId?.toString(),
    });
  }

  return { permissions: merged, delegations, delegatedScopes };
}
