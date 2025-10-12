// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User, { IUser } from "../models/User";
import PasswordHistory from "../models/PasswordHistory";
import Notification from "../models/Notification"; // assuming it exists as in your controllers
import { mailer } from "../utils/mailer";          // moved mailer into utils/mailer for reusability
import { Types } from "mongoose";
import { buildResetPasswordUrl } from "../utils/url";

const ACCESS_EXPIRES_IN = "1d";
const REFRESH_EXPIRES_IN = "7d";
const PASSWORD_HISTORY_LIMIT = 10;

// -------------------- Helpers --------------------
const hash = (plain: string) => bcrypt.hash(plain, 10);
const sameHash = (plain: string, hashed: string) => bcrypt.compare(plain, hashed);

const generateTokens = (user: IUser) => {
  const payload = {
    id: String(user._id),
    role: user.role,
    churchId: user.churchId ? String(user.churchId) : undefined,
    districtId: user.districtId ? String(user.districtId) : undefined,
    nationalChurchId: user.nationalChurchId ? String(user.nationalChurchId) : undefined,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    expiresIn: ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ id: String(user._id) }, process.env.JWT_REFRESH_SECRET!, {
    algorithm: "HS256",
    expiresIn: REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const ensureNotInPasswordHistory = async (userId: Types.ObjectId, newPlain: string) => {
  const recent = await PasswordHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(PASSWORD_HISTORY_LIMIT)
    .lean();

  for (const entry of recent) {
    const reused = await sameHash(newPlain, entry.passwordHash);
    if (reused) {
      throw Object.assign(
        new Error(`You cannot reuse any of your last ${PASSWORD_HISTORY_LIMIT} passwords.`),
        { statusCode: 400 }
      );
    }
  }
};

const recordPasswordHistory = async (userId: Types.ObjectId, passwordHash: string) => {
  await PasswordHistory.create({ userId, passwordHash });
  // Trim beyond limit (best effort)
  const ids = await PasswordHistory.find({ userId })
    .sort({ createdAt: -1 })
    .skip(PASSWORD_HISTORY_LIMIT)
    .select("_id")
    .lean();
  if (ids.length) {
    await PasswordHistory.deleteMany({ _id: { $in: ids.map((d) => d._id) } });
  }
};

const notify = async (opts: {
  scope?: "user";
  userId: string;
  title: string;
  body: string;
}) => {
  try {
    await Notification.create({
      scope: "user",
      scopeRef: new Types.ObjectId(opts.userId),
      title: opts.title,
      body: opts.body,
      recipients: [new Types.ObjectId(opts.userId)],
    });
  } catch (e) {
    // non-fatal
    console.error("Failed to create notification:", e);
  }
};

// -------------------- Public API --------------------
export const registerUser = async (data: Partial<IUser>) => {
  const { email, password } = data;
  if (!email || !password) throw new Error("Email & password required");
  if (await User.findOne({ email })) throw new Error("User already exists");

  const pwHash = await hash(password);
  const user = await User.create({ ...data, password: pwHash });

  // record initial password as history
  await recordPasswordHistory(user._id, pwHash);

  const tokens = generateTokens(user);
  const safeUser = await User.findById(user._id)
    .select("-password")
    .populate("churchId", "name")
    .populate("districtId", "name")
    .populate("nationalChurchId", "name");
  return { user: safeUser, ...tokens };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");
  if (!(await sameHash(password, user.password))) throw new Error("Invalid credentials");

  const tokens = generateTokens(user);
  const safeUser = await User.findById(user._id)
    .select("-password")
    .populate("churchId", "name")
    .populate("districtId", "name")
    .populate("nationalChurchId", "name");
  return { user: safeUser, ...tokens };
};

export const refreshTokens = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found");
    return generateTokens(user);
  } catch {
    throw new Error("Invalid refresh token");
  }
};

export const generatePasswordReset = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Create token + 60 min expiry
  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  // Build absolute URL from APP_BASE_URL
  const resetUrl = buildResetPasswordUrl(token);

  const subject = "Reset your Dominion Connect password";
  const text =
    `We received a request to reset your password.\n\n` +
    `Open the link below (valid for 60 minutes):\n${resetUrl}\n\n` +
    `If you didn't request this, you can ignore this email.`;

  const html = `
  <table style="max-width:600px;width:100%;border-collapse:separate;border:1px solid #eee;border-radius:12px;padding:24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
    <tr><td>
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="margin:0 0 16px">We received a request to reset your Dominion Connect account password.</p>
      <p style="margin:0 0 24px">Click the button below to set a new password. This link will expire in <strong>60 minutes</strong>.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="${resetUrl}" style="background:linear-gradient(135deg,#8B0000,#D4AF37);color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">
          Reset Password
        </a>
      </p>
      <p style="font-size:12px;color:#555;margin:0 0 8px">If the button doesn’t work, paste this link into your browser:</p>
      <p style="font-size:12px;word-break:break-all;margin:0 0 16px">
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p style="font-size:12px;color:#777;margin:0">If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
  </table>`;

  await mailer(user.email, subject, text, html);

  // Optional in-app notification
  try {
    await notify?.({
      scope: "user",
      userId: String(user._id),
      title: "Password reset requested",
      body: "A password reset link was sent to your email. If this wasn’t you, secure your account immediately.",
    });
  } catch (_) {
    /* notification is best-effort; ignore failures */
  }

  return { ok: true };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("Invalid or expired token");

  await ensureNotInPasswordHistory(user._id, newPassword);

  const pwHash = await hash(newPassword);
  user.password = pwHash;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await recordPasswordHistory(user._id, pwHash);

  await notify({
    scope: "user",
    userId: String(user._id),
    title: "Password changed",
    body: "Your account password was changed successfully.",
  });

  return await User.findById(user._id).select("-password");
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const ok = await sameHash(currentPassword, user.password);
  if (!ok) throw Object.assign(new Error("Current password is incorrect"), { statusCode: 400 });

  await ensureNotInPasswordHistory(user._id, newPassword);

  const pwHash = await hash(newPassword);
  user.password = pwHash;
  await user.save();
  await recordPasswordHistory(user._id, pwHash);

  await notify({
    scope: "user",
    userId: String(user._id),
    title: "Password changed",
    body: "Your account password was changed successfully.",
  });

  return { ok: true };
};
