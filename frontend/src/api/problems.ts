import api from './client';
import type { CreateProblemRequest, ProblemResponse } from './types';

export const getProblems = async (): Promise<ProblemResponse[]> => {
  const response = await api.get<ProblemResponse[]>('/problems');
  return response.data;
};

export const getProblemById = async (id: number): Promise<ProblemResponse> => {
  const response = await api.get<ProblemResponse>(`/problems/${id}`);
  return response.data;
};

export const createProblem = async (data: CreateProblemRequest): Promise<ProblemResponse> => {
  const response = await api.post<ProblemResponse>('/problems', data);
  return response.data;
};
