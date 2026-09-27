import { Request, Response } from "express";
import { Task } from "../models/task.model";
import { ApiError } from "../utils/error.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  getCachedTasks,
  setCachedTasks,
  invalidateTasksCache,
} from "../services/cache.service";

/**
 * @route   GET /api/tasks
 * @access  Private (requires isLoggedIn)
 * @desc    Returns all tasks belonging to the logged-in user.
 *          Serves from Redis cache when available and no filters are applied;
 *          filtered queries (?status=, ?dueDate=) always read from MongoDB,
 *          since only the full unfiltered list is cached (see cache.service.ts).
 * @query   { status?: "pending" | "completed", dueDate?: Date }
 * @returns 200 { success: true, tasks: Task[], source: "cache" | "db" }
 */
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, dueDate } = req.query as { status?: string; dueDate?: Date };

  const hasFilters = Boolean(status || dueDate);

  // Only the unfiltered list is cached, so skip cache entirely when filtering
  if (!hasFilters) {
    const cached = await getCachedTasks(userId);
    if (cached) {
      return res.json({ success: true, tasks: cached, source: "cache" });
    }
  }

  const query: Record<string, unknown> = { owner: userId };
  if (status) query.status = status;
  if (dueDate) query.dueDate = dueDate;

  const tasks = await Task.find(query).sort({ createdAt: -1 });

  if (!hasFilters) {
    await setCachedTasks(userId, tasks);
  }

  res.json({ success: true, tasks, source: "db" });
});

/**
 * @route   POST /api/tasks
 * @access  Private (requires isLoggedIn)
 * @desc    Creates a new task owned by the logged-in user.
 *          Invalidates the user's cached task list so the next GET is fresh.
 * @body    { title: string, description?: string, status?: "pending"|"completed", dueDate?: Date }
 * @returns 201 { success: true, task: Task }
 */
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const task = await Task.create({ ...req.body, owner: userId });
  await invalidateTasksCache(userId);

  res.status(201).json({ success: true, task });
});

/**
 * @route   PUT /api/tasks/:id
 * @access  Private (requires isLoggedIn)
 * @desc    Updates a task. Only the task's owner may update it — this is
 *          checked explicitly rather than relying on the query filter alone,
 *          so a mismatched owner returns 403 (forbidden) rather than a
 *          silent 404, making the failure reason clear to the client.
 * @params  id — task ObjectId
 * @body    Partial<{ title, description, status, dueDate }>
 * @returns 200 { success: true, task: Task }
 * @throws  404 if the task doesn't exist, 403 if it belongs to another user
 */
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.owner.toString() !== userId) {
    throw new ApiError(403, "You do not have permission to modify this task");
  }

  Object.assign(task, req.body);
  await task.save();
  await invalidateTasksCache(userId);

  res.json({ success: true, task });
});

/**
 * @route   DELETE /api/tasks/:id
 * @access  Private (requires isLoggedIn)
 * @desc    Deletes a task. Same ownership check as updateTask.
 * @params  id — task ObjectId
 * @returns 200 { success: true, message: string }
 * @throws  404 if the task doesn't exist, 403 if it belongs to another user
 */
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.owner.toString() !== userId) {
    throw new ApiError(403, "You do not have permission to delete this task");
  }

  await task.deleteOne();
  await invalidateTasksCache(userId);

  res.json({ success: true, message: "Task deleted" });
});