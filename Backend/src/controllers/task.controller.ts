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
  const { status, dueDate, view, search, page, limit } = req.query as unknown as {
    status?: string;
    dueDate?: Date;
    view?: "past" | "upcoming";
    search?: string;
    page: number;
    limit: number;
  };

  const isDefaultView = !status && !dueDate && !view && !search && page === 1;

  // Only the default (unfiltered, first-page) view is cached
  if (isDefaultView) {
    const cached = await getCachedTasks(userId);
    if (cached) {
      return res.json({ success: true, ...cached, source: "cache" });
    }
  }

  const query: Record<string, unknown> = { owner: userId };
  if (status) query.status = status;

  if (dueDate) {
    // Exact date match takes priority over the "view" range filter
    query.dueDate = dueDate;
  } else if (view) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    query.dueDate =
      view === "past" ? { $lt: startOfToday } : { $gte: startOfToday };
  }

  if (search) {
    // Case-insensitive substring match — "fuzzy" in the sense of partial,
    // not typo-tolerant. Escape regex special characters so a title like
    // "C++ notes" or "3.5 hrs" doesn't break or behave unexpectedly.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.title = { $regex: escaped, $options: "i" };
  }

  const skip = (page - 1) * limit;

  // Fetch one extra document to cheaply determine if more pages exist,
  // without a separate countDocuments() query
  const tasks = await Task.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1);

  const hasMore = tasks.length > limit;
  const pageTasks = hasMore ? tasks.slice(0, limit) : tasks;

  const responseBody = {
    tasks: pageTasks,
    pagination: { page, limit, hasMore },
  };

  if (isDefaultView) {
    await setCachedTasks(userId, responseBody);
  }

  res.json({ success: true, ...responseBody, source: "db" });
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