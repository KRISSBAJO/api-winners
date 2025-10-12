// src/utils/seedRoles.ts
import Role from "../models/Role";
import { ROLE_MATRIX } from "../config/permissions";

export async function ensureDefaultRoles() {
  for (const key of Object.keys(ROLE_MATRIX)) {
    const existing = await Role.findOne({ key });
    if (!existing) {
      await Role.create({
        key,
        name: key,
        permissions: ROLE_MATRIX[key],
      });
    } else {
      // keep DB in sync with code
      existing.permissions = ROLE_MATRIX[key];
      await existing.save();
    }
  }
}
