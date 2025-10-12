// src/models/PasswordHistory.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPasswordHistory extends Document {
  userId: mongoose.Types.ObjectId;
  passwordHash: string;           // bcrypt hash
  createdAt: Date;
}

const passwordHistorySchema = new Schema<IPasswordHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Keep collection lean: optional TTL (e.g., 2 years). Comment out if not wanted.
// passwordHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 });

export default mongoose.model<IPasswordHistory>("PasswordHistory", passwordHistorySchema);
