import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().max(500).optional(),
  status: z.enum(["pending", "completed"]).optional(),
  dueDate: z.coerce.date(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(100).optional(),
    description: z.string().trim().max(500).optional(),
    status: z.enum(["pending", "completed"]).optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

export const taskQuerySchema = z.object({
  status: z.enum(["pending", "completed"]).optional(),
  dueDate: z.coerce.date().optional(),
  view: z.enum(["past", "upcoming"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(16),
});