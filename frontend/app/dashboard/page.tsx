"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/tasks";
import { Task, TaskStatus } from "@/lib/types";
import TaskList from "@/components/TaskList";
import AddTaskModal, {
  CreateTaskPayload,
  UpdateTaskInput,
} from "@/components/AddTaskModal";
import ConfirmDeleteModal from "@/components/ConfirmDeletionModal";

type StatusFilter = "all" | TaskStatus;
type ViewFilter = "all" | "past" | "upcoming";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // Task list + pagination state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Filter + search state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [dueDateFilter, setDueDateFilter] = useState(""); // "" = not set
  const [searchInput, setSearchInput] = useState(""); // what the user is typing
  const [searchQuery, setSearchQuery] = useState(""); // what's actually applied

  // Add Task modal state
  const [formOpen, setFormOpen] = useState(false);

  //Add Task to edit in case the modal is opened to edit a task
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Redirect unauthenticated users once we know for sure there's no session
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /**
   * Fetches a page of tasks using the current filter/search state.
   * append=false replaces the list (used on initial load and whenever
   * filters/search change). append=true adds to the existing list
   * (used by "Load more").
   */
  const fetchTasks = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setTasksLoading(true);
      setError("");

      try {
        const res = await getTasks({
          page: targetPage,
          status: statusFilter === "all" ? undefined : statusFilter,
          view: viewFilter === "all" ? undefined : viewFilter,
          dueDate: dueDateFilter || undefined,
          search: searchQuery || undefined,
        });

        setTasks((prev) => (append ? [...prev, ...res.tasks] : res.tasks));
        setHasMore(res.pagination.hasMore);
        setPage(res.pagination.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setTasksLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, viewFilter, dueDateFilter, searchQuery],
  );

  // Re-fetch from page 1 whenever a filter or the applied search changes
  useEffect(() => {
    if (user) fetchTasks(1, false);
  }, [user, fetchTasks]);

  function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    fetchTasks(page + 1, true);
  }

  function handleSearchSubmit() {
    setSearchQuery(searchInput.trim());
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleCreateTask(payload: CreateTaskPayload) {
    const res = await createTask(payload);
    setTasks((prev) => [res.task, ...prev]);
  }

  async function handleDelete(id: string) {
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== id));

    try {
      await deleteTask(id);
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleMarkDone(id: string) {
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: "completed" } : t)),
    );

    try {
      await updateTask(id, { status: "completed" });
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleUpdateTask(id: string, payload: UpdateTaskInput) {
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t._id === id ? { ...t, ...payload } : t)),
    );

    try {
      await updateTask(id, payload);
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  function handleUpdate(id: string) {
    const task = tasks.find((t) => t._id === id);
    if (task) {
      setTaskToEdit(task);
      setFormOpen(true);
    }
  }

  function onDeleteClick(id: string) {
    setTaskToDeleteId(id);
    setDeleteModalOpen(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hi, {user?.name} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Here&apos;s everything on your plate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Task
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Search tasks by title..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            onClick={handleSearchSubmit}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Search
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All tasks</option>
            <option value="past">Past</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            Due on
            <input
              type="date"
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          {dueDateFilter && (
            <button
              onClick={() => setDueDateFilter("")}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Clear date
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <TaskList
        tasks={tasks}
        loading={tasksLoading}
        onDelete={onDeleteClick}
        onMarkDone={handleMarkDone}
        onUpdate={handleUpdate}
      />

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-indigo-200 bg-white px-6 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      <AddTaskModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setTaskToEdit(null); // Clear editing state on close
        }}
        taskToEdit={taskToEdit}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        taskId={taskToDeleteId}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDeleteId(null);
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}
