import { Schema, model, Types, Document } from "mongoose";

export interface IRoleDelegation extends Document {
  grantorId: Types.ObjectId;  // who delegates
  granteeId: Types.ObjectId;  // who receives
  scope: {
    nationalChurchId?: Types.ObjectId;
    districtId?: Types.ObjectId;
    churchId?: Types.ObjectId;
  };
  permissions?: string[];     // explicit perms (subset of grantor’s effective)
  roleLike?: string;          // optional: emulate role (e.g. "districtPastor")
  startsAt: Date;
  endsAt: Date;
  reason?: string;
  isRevoked?: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IRoleDelegation>(
  {
    grantorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    granteeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scope: {
      nationalChurchId: { type: Schema.Types.ObjectId, ref: "NationalChurch" },
      districtId: { type: Schema.Types.ObjectId, ref: "District" },
      churchId: { type: Schema.Types.ObjectId, ref: "Church" },
    },
    permissions: [{ type: String }],
    roleLike: { type: String },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    reason: String,
    isRevoked: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

schema.index({ granteeId: 1, startsAt: 1, endsAt: 1, isRevoked: 1 });
schema.index({ grantorId: 1, startsAt: 1, endsAt: 1, isRevoked: 1 });

export default model<IRoleDelegation>("RoleDelegation", schema);
