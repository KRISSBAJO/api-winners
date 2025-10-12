// src/utils/acl.ts
import mongoose from "mongoose";

export function canAccessNational(user: any, nationalId: string) {
  if (!mongoose.isValidObjectId(nationalId)) return false;
  if (user.role === "siteAdmin") return true;
  if (user.role === "nationalPastor") {
    return String(user.nationalChurchId) === String(nationalId);
  }
  return false;
}
