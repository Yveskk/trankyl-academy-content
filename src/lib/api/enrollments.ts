import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { Enrollment } from "./types";

export function myEnrollments() {
  if (USE_MOCK_DATA) return mock.mockMyEnrollments();
  return api.get<Enrollment[]>("/enrollments/me");
}

export function enroll(moduleId: number) {
  if (USE_MOCK_DATA) return mock.mockEnroll(moduleId);
  return api.post<Enrollment>(`/enrollments/${moduleId}`);
}
