import { apiFetch } from "./api";
import { Task, TaskStatus, TasksResponse } from "./types";

interface GetTasksParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  view?: "past" | "upcoming";
  dueDate?: string;
  search?: string;
}

export const getTasks = (params: GetTasksParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.view) query.set("view", params.view);
  if (params.dueDate) query.set("dueDate", params.dueDate);
  if (params.search) query.set("search", params.search);

  const qs = query.toString();
  return apiFetch<TasksResponse>(`/api/tasks${qs ? `?${qs}` : ""}`);
};

interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
}

export const createTask = (input: CreateTaskInput) =>
  apiFetch<{ success: boolean; task: Task }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
}

export const updateTask = (id: string, input: UpdateTaskInput) =>
  apiFetch<{ success: boolean; task: Task }>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deleteTask = (id: string) =>
  apiFetch<{ success: boolean; message: string }>(`/api/tasks/${id}`, {
    method: "DELETE",
  });