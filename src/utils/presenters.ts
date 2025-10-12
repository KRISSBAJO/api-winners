// utils/presenters.ts
export function nameOf(ref: any, fallback = "—") {
  if (!ref) return "";
  if (typeof ref === "string") return ref; // non-populated ObjectId
  // populated doc
  return ref.name || ref.churchId || ref.code || fallback;
}
