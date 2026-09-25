import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error.util";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e: any) => e.message).join(", ");
  }
  // Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }
  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value: resource already exists";
  }

  // Don't leak internals for unexpected errors
  if (!(err instanceof ApiError) && statusCode === 500) {
    console.error(err);
    message = "Internal Server Error";
  }

  res.status(statusCode).json({ success: false, message });
};