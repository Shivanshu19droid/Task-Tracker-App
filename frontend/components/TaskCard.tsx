"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onMarkDone: (id: string) => void;
  onUndo?: (id: string) => void; // called if user undoes; optional since it's local-only by default
}

const UNDO_WINDOW_SECONDS = 5;

export default function TaskCard({ task, onDelete, onMarkDone, onUndo }: TaskCardProps) {
  const { title, description, status, dueDate } = task;

  const [isPending, setIsPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(UNDO_WINDOW_SECONDS);

  // Refs, not state, for timer IDs — we never want changing these to trigger a re-render
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up any running timers if the component unmounts mid-countdown
  // (e.g. the task gets removed from the list some other way)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleMarkDoneClick() {
    setIsPending(true);
    setSecondsLeft(UNDO_WINDOW_SECONDS);

    // Tick the visible countdown every second
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    // After 5 seconds, actually commit the action
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPending(false);
      onMarkDone(task._id);
    }, UNDO_WINDOW_SECONDS * 1000);
  }

  function handleUndoClick() {
    // Cancel both timers before they fire — onMarkDone is never called
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPending(false);
    onUndo?.(task._id);
  }

  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <h2 className="font-medium">{title}</h2>
        <button
          onClick={() => onDelete(task._id)}
          aria-label="Delete task"
          className="text-gray-400 hover:text-red-600"
        >
          🗑
        </button>
      </div>

      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span
          className={`rounded px-2 py-0.5 ${
            status === "completed"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {status}
        </span>
        {dueDate && (
          <span className="text-gray-400">
            Due: {new Date(dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {status === "pending" && (
        <div className="mt-3">
          {!isPending ? (
            <button
              onClick={handleMarkDoneClick}
              className="rounded bg-black px-3 py-1 text-sm text-white"
            >
              Mark as done
            </button>
          ) : (
            <button
              onClick={handleUndoClick}
              className="flex items-center gap-2 rounded border px-3 py-1 text-sm"
            >
              <span>⏱ {secondsLeft}s</span>
              <span>Undo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}