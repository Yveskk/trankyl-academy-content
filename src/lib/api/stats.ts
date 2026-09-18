import { api } from "./client";
import type { PublicImpactStats } from "./types";

export function getPublicImpactStats() {
  return api.get<PublicImpactStats>("/stats/public");
}
