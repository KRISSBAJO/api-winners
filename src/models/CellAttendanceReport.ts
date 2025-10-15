// src/models/CellAttendanceReport.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICellAttendanceReport extends Document {
  churchId: Types.ObjectId;
  cellId: Types.ObjectId;     // CellGroup._id
  meetingId?: Types.ObjectId; // CellMeeting._id (optional if ad-hoc)
  date: Date;                 // meeting date
  totals: {
    men: number;
    women: number;
    children: number;
    firstTimers: number;
    newConverts: number;
  };
  presentMemberIds: Types.ObjectId[]; // Member._id[]
  submittedBy: Types.ObjectId;   // User or Member._id (choose policy; we’ll store a User._id)
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cellAttendanceReportSchema = new Schema<ICellAttendanceReport>({
  churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
  cellId:   { type: Schema.Types.ObjectId, ref: "CellGroup", required: true, index: true },
  meetingId:{ type: Schema.Types.ObjectId, ref: "CellMeeting" },
  date:     { type: Date, required: true, index: true },
  totals: {
    men:         { type: Number, default: 0 },
    women:       { type: Number, default: 0 },
    children:    { type: Number, default: 0 },
    firstTimers: { type: Number, default: 0 },
    newConverts: { type: Number, default: 0 },
  },
  presentMemberIds: [{ type: Schema.Types.ObjectId, ref: "Member" }],
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  comments: String,
}, { timestamps: true });

export default mongoose.model<ICellAttendanceReport>("CellAttendanceReport", cellAttendanceReportSchema);
