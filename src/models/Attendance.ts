import mongoose, { Schema, Document, Types } from "mongoose";

export type ServiceType =
  | "Sunday"
  | "Midweek"
  | "PrayerMeeting"
  | "Vigil"
  | "Conference"
  | "Special"
  | "Other";

export interface IAttendance extends Document {
  churchId: Types.ObjectId;
  serviceDate: Date;                 // normalized to 00:00 UTC (or your TZ policy)
  serviceType: ServiceType;
  // Counts
  men: number;
  women: number;
  children: number;
  firstTimers: number;
  newConverts: number;
  holyGhostBaptisms: number;
  online?: number;                   // optional online viewers
  ushers?: number;
  choir?: number;

  // Derived
  total: number;                     // virtual

  // Meta
  notes?: string;
  tags?: string[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    serviceDate: { type: Date, required: true, index: true },
    serviceType: {
      type: String,
      enum: ["Sunday", "Midweek", "PrayerMeeting", "Vigil", "Conference", "Special", "Other"],
      default: "Sunday",
      index: true,
    },

    men: { type: Number, default: 0, min: 0 },
    women: { type: Number, default: 0, min: 0 },
    children: { type: Number, default: 0, min: 0 },
    firstTimers: { type: Number, default: 0, min: 0 },
    newConverts: { type: Number, default: 0, min: 0 },
    holyGhostBaptisms: { type: Number, default: 0, min: 0 },
    online: { type: Number, default: 0, min: 0 },
    ushers: { type: Number, default: 0, min: 0 },
    choir: { type: Number, default: 0, min: 0 },

    notes: { type: String },
    tags: [{ type: String, index: true }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Normalize serviceDate to start-of-day UTC to avoid duplicate-day issues
attendanceSchema.pre("save", function (next) {
  if (this.serviceDate) {
    const d = new Date(this.serviceDate);
    // normalize to 00:00:00.000 UTC
    this.serviceDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  next();
});

// Virtual total
attendanceSchema.virtual("total").get(function (this: IAttendance) {
  return (
    (this.men || 0) +
    (this.women || 0) +
    (this.children || 0) +
    (this.ushers || 0) +
    (this.choir || 0) +
    (this.online || 0)
  );
});

// Unique per church + date + type (excluding deleted)
attendanceSchema.index(
  { churchId: 1, serviceDate: 1, serviceType: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export default mongoose.model<IAttendance>("Attendance", attendanceSchema);
