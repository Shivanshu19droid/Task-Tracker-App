"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-100">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-100 px-4 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
        Welcome to Task Tracker
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        Keep track of what matters, stay on top of deadlines, and get things
        done — one task at a time.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Get Started
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>

      {user && (
        <p className="mt-4 text-sm text-slate-500">
          Already logged in as <span className="font-medium">{user.name}</span> —{" "}
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            go to dashboard
          </Link>
        </p>
      )}
    </main>
  );
}