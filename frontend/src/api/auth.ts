import { apiClient, unwrap } from "./client";
import type { UserSummary } from "../types";

export interface LoginResponse {
  token: string;
  user: UserSummary;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return unwrap(apiClient.post("/api/auth/login", { email, password }));
}
