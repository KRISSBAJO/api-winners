import mongoose, { Schema, Document, Types } from "mongoose";

export type DemoStatus = "new" | "in_review" | "scheduled" | "won" | "lost";

export interface IDemoRequest extends Document {
  fullName: string;
  email: string;
  phone?: string;
  church?: string;
  role?: string;
  size?: string;
  interests: string[];
  goals?: string;
  timeframe?: string;
  budget?: string;
  demoPref?: string;
  notes?: string;         // user's free-form note
  consent: boolean;

  // internal fields
  status: DemoStatus;
  ownerId?: Types.ObjectId;   // assigned staff user
  adminNotes?: string;        // internal notes
  source?: string;            // "public_web", "partner", etc.
  meta?: Record<string, any>; // UA, IP, etc.

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDemoRequest>(
  {
    fullName: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: String,
    church: String,
    role: String,
    size: String,
    interests: { type: [String], default: [] },
    goals: String,
    timeframe: String,
    budget: String,
    demoPref: String,
    notes: String,
    consent: { type: Boolean, required: true },

    status: { type: String, enum: ["new","in_review","scheduled","won","lost"], default: "new", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    adminNotes: String,
    source: String,
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model<IDemoRequest>("DemoRequest", schema);
