import { api } from "./client";
import type { QuizResult } from "./types";

export function submitQuiz(quizId: number, answers: { question_id: number; choice_id: number }[]) {
  return api.post<QuizResult>(`/quizzes/${quizId}/attempts`, { answers });
}
