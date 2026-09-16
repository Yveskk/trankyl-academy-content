import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { Certification } from "./types";

export function myCertifications() {
  if (USE_MOCK_DATA) return mock.mockMyCertifications();
  return api.get<Certification[]>("/certifications/me");
}
