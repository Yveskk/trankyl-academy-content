import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { QuizResult } from "./types";

export function submitQuiz(quizId: number, answers: { question_id: number; choice_id: number }[]) {
  if (USE_MOCK_DATA) return mock.mockSubmitQuiz(quizId, answers);
  return api.post<QuizResult>(`/quizzes/${quizId}/attempts`, { answers });
}
