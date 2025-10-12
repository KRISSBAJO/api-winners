import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  key: string;           // "siteAdmin", "churchAdmin", etc.
  name: string;          // Human label
  permissions: string[]; // e.g. "user.read", "event.create"
}

const roleSchema = new Schema<IRole>(
  {
    key: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    permissions: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export default mongoose.model<IRole>("Role", roleSchema);
