import { apiClient, unwrap } from "./client";
import type { AuditLogPage } from "../types/audit";

export function listAuditLog(page: number, size = 50): Promise<AuditLogPage> {
  return unwrap(apiClient.get("/api/principal/audit-log", { params: { page, size } }));
}
