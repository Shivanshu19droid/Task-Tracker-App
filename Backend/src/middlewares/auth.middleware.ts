import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util";
import { ApiError } from "../utils/error.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { User } from "../models/user.model";

export const isLoggedIn = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token = req.cookies?.token;

    const header = req.headers.authorization;
    if (!token && header?.startsWith("Bearer ")) token = header.split(" ")[1];

    if (!token) throw new ApiError(401, "Not authenticated");

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new ApiError(401, "Invalid or expired token");
    }

    const user = await User.findById(payload.id);
    if (!user) throw new ApiError(401, "User no longer exists");

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  }
);