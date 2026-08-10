import { apiClient, unwrap } from "./client";
import type { TopicSearchResult } from "../types";

export function searchTopics(query: string): Promise<TopicSearchResult[]> {
  return unwrap(apiClient.get("/api/topics/search", { params: { q: query } }));
}
