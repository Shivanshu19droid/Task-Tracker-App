import { redis } from "../config/redis";

// set a max time for cache tasks
const TASKS_CACHE_TTL_SECONDS = 300; // 5 minutes

// Builds the tasks key for a given user id
const tasksKey = (userId: string): string => `tasks:${userId}`;

// Reads the user's task list saved in the cache
export const getCachedTasks = async <T>(userId: string): Promise<T | null> => {
  const raw = await redis.get(tasksKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

// Writes the user's task list into the cache
export const setCachedTasks = async (userId: string, tasks: unknown): Promise<void> => {
  await redis.set(tasksKey(userId), JSON.stringify(tasks), "EX", TASKS_CACHE_TTL_SECONDS);
};

// Invalidates the cache
export const invalidateTasksCache = async (userId: string): Promise<void> => {
  await redis.del(tasksKey(userId));
};