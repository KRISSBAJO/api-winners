import { Schema, model, Types, Document } from "mongoose";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface IGroupJoinRequest extends Document {
  churchId: Types.ObjectId;
  groupId: Types.ObjectId;

  name: string;
  email?: string;
  phone?: string;
  message?: string;

  status: JoinRequestStatus;
  handledBy?: Types.ObjectId; // User id
  handledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IGroupJoinRequest>(
  {
    churchId:  { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    groupId:   { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },

    name:      { type: String, required: true },
    email:     String,
    phone:     String,
    message:   String,

    status:    { type: String, enum: ["pending","approved","rejected"], default: "pending", index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,
  },
  { timestamps: true }
);

export default model<IGroupJoinRequest>("GroupJoinRequest", joinRequestSchema);
