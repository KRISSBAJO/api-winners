// src/models/notificationKinds.ts
export const NOTIF_KINDS = [

    // users
    "user.created",
    "user.updated",
    "user.deleted",
    "user.profile.updated",
    "user.status",

  // events
  "event.created",
  "event.updated",
  "event.commented",

  // attendance
  "attendance.upserted",

  // members
  "member.created",
  "member.updated",
  "member",

  // pastors
  "pastor.created",
  "pastor.updated",
  "pastor.deleted",
  "pastor.assignmentClosed",
  "pastor.assigned",

  // cells (add these if you use them anywhere)
  "cell.created",
  "cell.updated",
  "cell.deleted",
  "cell.members.added",
  "cell.members.removed",
  "cell.meeting.created",
  "cell.meeting.updated",
  "cell.meeting.cancelled",
   "cell.meeting.deleted",
  "cell.report.submitted",
  "cell.report.deleted",


  // volunteer groups
  "volunteer.group.created",
  "volunteer.group.deleted",
  "volunteer.group.member.added",
  "volunteer.group.member.removed",
  "volunteer.group.leader.assigned",
  "volunteer.group.leader.removed",
  "volunteer.group.event.assigned",
  "volunteer.group.event.unassigned",
  "volunteer.group.updated",

  // follow-up / care
  "followup.case.created",
  "followup.case.closed",
  "followup.case.reopened",
  "followup.attempt.logged",
  "followup.case.cadence.advanced",
  "followup.case.updated",
  "followup.case.assigned",
  "followup.case.unassigned",
  "followup.case.opened",
  "followup.case.paused",
  "followup.case.resumed",
  "followup.case.resolved",
  "followup.case.archived",
  "followup.case.tag.added",
  "followup.case.tag.removed",
  "followup.case.cadence.set",
  "followup.message.sent",

  "global.group.created",
  "global.group.updated",
  "global.group.deleted",
  "global.group.join.requested",
  "global.group.join.handled",
  "global.group.join.rejected",
  "group.occurrence.created",

  // system
  "system",
] as const;

export type NotifKind = typeof NOTIF_KINDS[number];
