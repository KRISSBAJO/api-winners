// src/models/User.ts (Minor update: Add createdBy for auditing)
import mongoose, { Schema, Document } from "mongoose";

export type UserRole =
  | "siteAdmin"
  | "nationalPastor"
  | "districtPastor"
  | "churchAdmin"
  | "pastor"
  | "volunteer";

export interface IUser extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  churchId?: mongoose.Types.ObjectId;
  nationalChurchId?: mongoose.Types.ObjectId;
  districtId?: mongoose.Types.ObjectId;
  isActive: boolean;
  avatar?: string;
  avatarPublicId?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdBy?: mongoose.Types.ObjectId; // NEW: Audit who created this user
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "siteAdmin",
        "nationalPastor",
        "districtPastor",
        "churchAdmin",
        "pastor",
        "volunteer",
      ],
      default: "volunteer",
    },
    churchId: { type: Schema.Types.ObjectId, ref: "Church" },
    nationalChurchId: { type: Schema.Types.ObjectId, ref: "NationalChurch" },
    districtId: { type: Schema.Types.ObjectId, ref: "District" },
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // NEW
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);