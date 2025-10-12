// src/lib/access.ts
export const canActOnChurch = (user: any, churchId: string | undefined | null) => {
  if (!user) return false;
  if (user.role === "siteAdmin") return true;
  return String(user.churchId) === String(churchId);
};

export const isSiteAdmin = (user: any) => user?.role === "siteAdmin";
