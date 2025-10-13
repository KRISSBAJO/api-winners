// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

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
  password: string; // hashed at rest
  role: UserRole;
  churchId?: mongoose.Types.ObjectId;
  nationalChurchId?: mongoose.Types.ObjectId;
  districtId?: mongoose.Types.ObjectId;
  isActive: boolean;
  avatar?: string;
  avatarPublicId?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdBy?: mongoose.Types.ObjectId;
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
      enum: ["siteAdmin","nationalPastor","districtPastor","churchAdmin","pastor","volunteer"],
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// helper
const isHashed = (pwd?: string) => typeof pwd === "string" && pwd.startsWith("$2"); // bcryptjs hashes start with $2

// 1) Hash on create/save
userSchema.pre("save", async function (next) {
  const doc = this as IUser & { isModified: (k: string) => boolean; isNew: boolean };
  if (doc.isNew || doc.isModified("password")) {
    if (!isHashed(doc.password)) {
      doc.password = await bcrypt.hash(doc.password, 10);
    }
  }
  next();
});

// 2) Hash on findOneAndUpdate / findByIdAndUpdate
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;
  if (!update) return next();

  const get = () => update.password ?? update.$set?.password;
  const set = (val: string) => {
    if (update.password) update.password = val;
    if (update.$set?.password) update.$set.password = val;
  };

  const pwd = get();
  if (pwd && !isHashed(pwd)) set(await bcrypt.hash(pwd, 10));
  next();
});

// 3) EXTRA: cover updateOne / updateMany (in case someone uses them)
userSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate() as any;
  if (!update) return next();
  const pwd = update.password ?? update.$set?.password;
  if (pwd && !isHashed(pwd)) {
    const hashed = await bcrypt.hash(pwd, 10);
    if (update.password) update.password = hashed;
    if (update.$set?.password) update.$set.password = hashed;
  }
  next();
});

export default mongoose.model<IUser>("User", userSchema);
