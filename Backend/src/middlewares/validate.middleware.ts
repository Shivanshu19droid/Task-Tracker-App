import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/error.util";

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return next(new ApiError(400, message));
    }

    // req.query is read-only in newer Express versions — mutate its keys instead
    Object.keys(req.query).forEach((key) => delete (req.query as any)[key]);
    Object.assign(req.query, result.data);

    next();
  };