"use client";

import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">
        {user ? `Logged in as ${user.name}` : "Not logged in"}
      </h1>
    </main>
  );
}