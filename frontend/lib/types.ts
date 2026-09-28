export interface User {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus = "pending" | "completed";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string; // ISO date string over the wire
  owner: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TasksResponse {
  success: boolean;
  tasks: Task[];
  pagination: Pagination;
  source: "cache" | "db";
}