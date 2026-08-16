export interface AuditLogEntry {
  id: number;
  actorName: string;
  action: string;
  targetType: string;
  targetId: number | null;
  targetLabel: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  page: number;
  totalPages: number;
  totalItems: number;
}
