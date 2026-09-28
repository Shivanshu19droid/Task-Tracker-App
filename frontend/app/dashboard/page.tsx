"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/tasks";
import { Task, TaskStatus } from "@/lib/types";
import TaskList from "@/components/TaskList";
import AddTaskModal, { CreateTaskPayload } from "@/components/AddTaskModal";

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

  // Filter + search state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [dueDateFilter, setDueDateFilter] = useState(""); // "" = not set
  const [searchInput, setSearchInput] = useState(""); // what the user is typing
  const [searchQuery, setSearchQuery] = useState(""); // what's actually applied

  // Add Task modal state
  const [formOpen, setFormOpen] = useState(false);

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
    [statusFilter, viewFilter, dueDateFilter, searchQuery]
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
      prev.map((t) => (t._id === id ? { ...t, status: "completed" } : t))
    );

    try {
      await updateTask(id, { status: "completed" });
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  function handleUndo(_id: string) {
    // no-op: TaskCard cancels its own timer, no API call was ever made
  }

  if (authLoading || !user) {
    return <p className="p-8">Loading...</p>;
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hi, {user.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFormOpen(true)}
            className="rounded bg-black px-3 py-1 text-sm text-white"
          >
            Add Task
          </button>
          <button onClick={handleLogout} className="rounded border px-3 py-1 text-sm">
            Log out
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          placeholder="Search tasks by title..."
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearchSubmit}
          className="rounded border px-4 py-2 text-sm"
        >
          Search
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={viewFilter}
          onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">All tasks</option>
          <option value="past">Past</option>
          <option value="upcoming">Upcoming</option>
        </select>

        <input
          type="date"
          value={dueDateFilter}
          onChange={(e) => setDueDateFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        {dueDateFilter && (
          <button
            onClick={() => setDueDateFilter("")}
            className="text-xs text-gray-500 underline"
          >
            Clear date
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TaskList
        tasks={tasks}
        loading={tasksLoading}
        onDelete={handleDelete}
        onMarkDone={handleMarkDone}
        onUndo={handleUndo}
      />

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      <AddTaskModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onCreateTask={handleCreateTask}
      />
    </main>
  );
}