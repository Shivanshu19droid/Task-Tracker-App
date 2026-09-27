const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Thin wrapper around fetch for talking to the backend.
 * - Always sends cookies (credentials: "include") so the httpOnly JWT cookie
 *   is included automatically on every request.
 * - Always sets Content-Type: application/json for requests with a body.
 * - Throws on non-2xx responses so callers can use try/catch.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}