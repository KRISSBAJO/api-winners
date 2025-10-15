// src/models/CellGroup.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICellGroup extends Document {
  churchId: Types.ObjectId;
  name: string;            // public name
  title?: string;          // optional subtitle
  description?: string;
  leaderId?: Types.ObjectId;      // Member._id (leader)
  assistantId?: Types.ObjectId;   // Member._id (assistant)
  secretaryId?: Types.ObjectId;   // Member._id (secretary)
  members: Types.ObjectId[];      // Member._id[]
  isActive: boolean;
  createdBy?: Types.ObjectId;     // User._id
  createdAt: Date;
  updatedAt: Date;
}

const cellGroupSchema = new Schema<ICellGroup>({
  churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
  name: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  leaderId: { type: Schema.Types.ObjectId, ref: "Member" },
  assistantId: { type: Schema.Types.ObjectId, ref: "Member" },
  secretaryId: { type: Schema.Types.ObjectId, ref: "Member" },
  members: [{ type: Schema.Types.ObjectId, ref: "Member" }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model<ICellGroup>("CellGroup", cellGroupSchema);
