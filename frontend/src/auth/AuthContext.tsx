import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserSummary } from "../types";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("edutrack_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("edutrack_user");
      }
    }
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const res = await authApi.login(email, password);
        localStorage.setItem("edutrack_token", res.token);
        localStorage.setItem("edutrack_user", JSON.stringify(res.user));
        setUser(res.user);
      },
      logout: () => {
        localStorage.removeItem("edutrack_token");
        localStorage.removeItem("edutrack_user");
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
