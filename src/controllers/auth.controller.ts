import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import { ROLE_MATRIX } from "../config/permissions";
import User from "../models/User";
import { requireUser } from "../utils/http";

// REGISTER
export const register = async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const payload = req.body;

    if (role === "siteAdmin") {
      const data = await AuthService.registerUser(payload);
      return res.status(201).json(data);
    }

    if (role === "churchAdmin") {
      if (!["pastor", "volunteer"].includes(payload.role)) {
        return res.status(403).json({ message: "Not authorized to create this role" });
      }
      payload.churchId = req.user.churchId;
      const data = await AuthService.registerUser(payload);
      return res.status(201).json(data);
    }

    res.status(403).json({ message: "Not authorized to register users" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const data = await AuthService.loginUser(email, password);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// REFRESH TOKEN
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token missing" });

    const tokens = await AuthService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

// ME
export const me = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("churchId");
    if (!user) return res.status(404).json({ message: "User not found" });
    const permissions = ROLE_MATRIX[user.role] || [];
    res.json({ ...user.toObject(), permissions });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// REQUEST PASSWORD RESET
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const appBaseUrl = (req.headers["x-app-url"] as string) || process.env.APP_BASE_URL || "";
    await AuthService.generatePasswordReset(req.body.email);
    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (e: any) {
    // Don’t reveal existence—still return 200-style message
    res.json({ message: "If the email exists, a reset link has been sent." });
  }
};

export const performPasswordReset = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const user = await resetPassword(token, newPassword);
    res.json({ message: "Password updated", user });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(actor.id, currentPassword, newPassword);
    res.json({ message: "Password changed" });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ message: e.message });
  }
};

// RESET PASSWORD
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    res.json({ message: "Password reset successful" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// LIST USERS (admin only)
export const listUsers = async (req: any, res: Response) => {
  try {
    if (!["siteAdmin", "churchAdmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const query = req.user.role === "churchAdmin" ? { churchId: req.user.churchId } : {};
    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
