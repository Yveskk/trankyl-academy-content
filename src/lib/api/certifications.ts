import { api } from "./client";
import type { Certification } from "./types";

export function myCertifications() {
  return api.get<Certification[]>("/certifications/me");
}
