"use client";

import TaskCard from "@/components/TaskCard";
import { Task } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onDelete: (id: string) => void;
  onMarkDone: (id: string) => void;
  onUndo?: (id: string) => void;
}

export default function TaskList({
  tasks,
  loading,
  onDelete,
  onMarkDone,
  onUndo,
}: TaskListProps) {
  if (loading && tasks.length === 0) {
    // Only show a full loading state on the very first fetch.
    // Subsequent fetches (e.g. changing a filter) will replace tasks directly,
    // avoiding a jarring flash of "Loading..." for an already-populated list.
    return <p className="text-gray-500">Loading tasks...</p>;
  }

  if (!loading && tasks.length === 0) {
    return <p className="text-gray-500">No tasks yet. Create one to get started.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {tasks.map((task) => (
        <li key={task._id}>
          <TaskCard
            task={task}
            onDelete={onDelete}
            onMarkDone={onMarkDone}
            onUndo={onUndo}
          />
        </li>
      ))}
    </ul>
  );
}