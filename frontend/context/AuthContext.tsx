"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@/lib/types";
import { getMe, login as loginApi, logout as logoutApi } from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true until we've checked session on load

  // On first mount, check if a valid session cookie already exists
  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null)) // no valid session — not an error state, just logged out
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    setUser(res.user);
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}