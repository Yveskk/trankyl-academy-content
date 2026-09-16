import { api } from "./client";
import type { Enrollment, NiveauEnrollment, NiveauEnrollmentAdmin } from "./types";

export function myEnrollments() {
  return api.get<Enrollment[]>("/enrollments/me");
}

export function enroll(moduleId: number) {
  return api.post<Enrollment>(`/enrollments/${moduleId}`);
}

export function myNiveauEnrollments() {
  return api.get<NiveauEnrollment[]>("/enrollments/niveaux/me");
}

export function enrollNiveau(niveauId: number) {
  return api.post<NiveauEnrollment>(`/enrollments/niveaux/${niveauId}`);
}

export function adminListNiveauEnrollments() {
  return api.get<NiveauEnrollmentAdmin[]>("/enrollments/niveaux");
}
