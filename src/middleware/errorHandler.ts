// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("🚨 Error Details:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id || "anonymous", // ← use id
  });

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value} is not a valid ID.`,
      error: { type: "CastError", path: err.path, value: err.value },
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      error: { type: "DuplicateKey", field, value: err.keyValue[field] },
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
