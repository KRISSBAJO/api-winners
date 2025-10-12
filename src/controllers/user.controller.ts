// src/controllers/user.controller.ts (Updated: Pass actor to services; 403 for scope errors)
import { Request, Response } from "express";
import * as UserService from "../services/user.service";
import { requireUser, getUploadFile } from "../utils/http";

// GET ALL USERS
export const listUsers = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const users = await UserService.getAllUsers(actor);
    res.json(users);
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : (err.statusCode || 400);
    res.status(status).json({ message: err.message });
  }
};

// GET USER BY ID
export const getUser = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const user = await UserService.getUserById(req.params.id, actor);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : (err.statusCode || 400);
    res.status(status).json({ message: err.message });
  }
};

// UPDATE PROFILE (self)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const file = getUploadFile(req);
    const updatedUser = await UserService.updateProfile(actor.id, req.body, file);
    res.json(updatedUser);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

// NEW: CREATE USER (admin)
export const createUser = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const newUser = await UserService.createUser(actor, req.body);
    res.status(201).json(newUser);
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

// TOGGLE ACTIVE STATUS (admin)
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const updated = await UserService.toggleActiveStatus(req.params.id, actor);
    res.json({
      message: `User ${updated?.isActive ? "activated" : "deactivated"} successfully`,
      user: updated,
    });
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : (err.statusCode || 400);
    res.status(status).json({ message: err.message });
  }
};

// DELETE USER (admin)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    await UserService.deleteUser(req.params.id, actor);
    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : (err.statusCode || 400);
    res.status(status).json({ message: err.message });
  }
};

// ADMIN UPDATE (role/scope/basic fields)
export const updateUserAdmin = async (req: Request, res: Response) => {
  try {
    const actor = requireUser(req);
    const updated = await UserService.updateUserAdmin(req.params.id, req.body, actor);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err: any) {
    const status = /forbidden/i.test(err.message) ? 403 : (err.statusCode || 400);
    res.status(status).json({ message: err.message });
  }
};