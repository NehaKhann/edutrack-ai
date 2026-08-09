import { apiClient, unwrap } from "./client";
import type { Subject } from "../types";

export function getMySubjects(): Promise<Subject[]> {
  return unwrap(apiClient.get("/api/subjects"));
}
