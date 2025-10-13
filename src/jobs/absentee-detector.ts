// jobs/absentee-detector.ts
import Member from "../models/Member";
import FollowUpCase from "../models/FollowUpCase";
import { startOfDay, subWeeks } from "date-fns";

export async function detectAbsentees({ weeks = 4, churchId }: { weeks?: number; churchId?: string }) {
  const cutoff = startOfDay(subWeeks(new Date(), weeks));
  // You likely have an attendance collection; as a simple heuristic:
  const candidates = await Member.find({
    churchId,
    membershipStatus: { $in: ["Active", "New Convert"] },
    // if you track lastAttendanceAt on Member, otherwise use aggregation from attendance
    $or: [{ lastAttendanceAt: { $exists: false } }, { lastAttendanceAt: { $lte: cutoff } }],
  }).select("_id firstName lastName lastAttendanceAt churchId");

  for (const m of candidates) {
    const existing = await FollowUpCase.findOne({ memberId: m._id, type: "absentee", status: { $in: ["open","in_progress","paused"] } });
    if (existing) continue;
    await FollowUpCase.create({
      memberId: m._id,
      churchId: m.churchId,
      type: "absentee",
      status: "open",
      reason: `Missed ${weeks} weeks`,
      lastSeenAt: (m as any).lastAttendanceAt,
      openedBy: /* system user id */ m.churchId, // or a fixed bot user
      tags: ["auto"],
    });
  }
}
