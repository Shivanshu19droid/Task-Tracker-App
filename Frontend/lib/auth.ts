import { apiFetch } from "./api";
import { User } from "./types";

interface AuthResponse {
  success: boolean;
  user: User;
}

export const signup = (name: string, email: string, password: string) =>
  apiFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const login = (email: string, password: string) =>
  apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  apiFetch<{ success: boolean; message: string }>("/api/auth/logout", {
    method: "POST",
  });

export const getMe = () => apiFetch<AuthResponse>("/api/auth/me");