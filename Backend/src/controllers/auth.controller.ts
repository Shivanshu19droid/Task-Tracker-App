import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { signToken } from "../utils/jwt.util";
import { ApiError } from "../utils/error.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { env } from "../config/env";

/**
 * Shared cookie options for the JWT auth cookie.
 * httpOnly prevents JS access (XSS protection); secure + sameSite=none
 * is required for cross-site cookies in production (frontend on a different domain).
 */
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: (env.nodeEnv === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * @route   POST /api/auth/signup
 * @access  Public
 * @desc    Create a new user account. Hashes the password with bcrypt before
 *          storing, then issues a JWT set as an httpOnly cookie.
 * @body    { name: string, email: string, password: string }
 * @returns 201 { success: true, user: { id, name, email } }
 * @throws  409 if the email is already registered
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  const token = signToken(user.id);
  res.cookie("token", token, cookieOptions);
  res.status(201).json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 * @desc    Authenticate a user by email + password and issue a JWT cookie.
 *          Returns the same error for "user not found" and "wrong password"
 *          so callers can't enumerate registered emails.
 * @body    { email: string, password: string }
 * @returns 200 { success: true, user: { id, name, email } }
 * @throws  401 if credentials are invalid
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // password has `select: false` in the schema, so it must be explicitly requested
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user.id);
  res.cookie("token", token, cookieOptions);
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

/**
 * @route   POST /api/auth/logout
 * @access  Public
 * @desc    Clears the auth cookie. Must be called (not just deleted client-side)
 *          since the cookie is httpOnly and inaccessible to frontend JS.
 * @returns 200 { success: true, message: string }
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token", cookieOptions);
  res.json({ success: true, message: "Logged out" });
});

/**
 * @route   GET /api/auth/me
 * @access  Private (requires isLoggedIn middleware)
 * @desc    Returns the currently authenticated user, as attached to
 *          req.user by the isLoggedIn middleware. Used by the frontend
 *          on load to check session state.
 * @returns 200 { success: true, user: { id, name, email } }
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});