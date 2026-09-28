"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onMarkDone: (id: string) => void;
  onUpdate: (id: string) => void;
}

const UNDO_WINDOW_SECONDS = 5;

export default function TaskCard({ task, onDelete, onMarkDone, onUpdate }: TaskCardProps) {
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
  }

    return (
    <div
      className={`flex aspect-square flex-col rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${
        status === "completed" ? "border-l-emerald-500" : "border-l-amber-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="line-clamp-2 min-w-0 text-base font-semibold text-slate-900">
          {title}
        </h2>
        <button
          onClick={() => onDelete(task._id)}
          aria-label="Delete task"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      {description ? (
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">{description}</p>
      ) : (
        <p className="mt-2 text-sm italic text-slate-400">No description</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
            status === "completed"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "completed" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {status}
        </span>
        {dueDate && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {new Date(dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        {status === "pending" ? (
          !isPending ? (
            <>
              <button
                onClick={handleMarkDoneClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Mark as done
              </button>
              <button
                onClick={() => {onUpdate(task._id)}}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUndoClick}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <svg className="h-5 w-5 -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <circle
                    cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={100}
                    className="undo-ring"
                    style={{ animationDuration: `${UNDO_WINDOW_SECONDS}s` }}
                  />
                </svg>
                Undo
              </button>
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-400 shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            </>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        )}
      </div>
    </div>
  );
}