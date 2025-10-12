export const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:5174").replace(/\/+$/, "");

export function buildResetPasswordUrl(token: string) {
  return `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
