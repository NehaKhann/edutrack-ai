import axios from "axios";
import type { ApiResponse } from "../types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("edutrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("edutrack_token");
      localStorage.removeItem("edutrack_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return promise.then((res) => res.data.data);
}

export function unwrapWithMessage<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<{ data: T; message: string | null }> {
  return promise.then((res) => ({ data: res.data.data, message: res.data.message }));
}

export function errorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message || anyErr?.message || "Something went wrong. Please try again.";
}
