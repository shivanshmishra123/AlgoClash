import api from './client';
import type { CreateSubmissionRequest, MatchResponse, SubmissionResponse } from './types';

export const getMatchById = async (id: number): Promise<MatchResponse> => {
  const response = await api.get<MatchResponse>(`/matches/${id}`);
  return response.data;
};

export const submitSolution = async (
  matchId: number,
  data: CreateSubmissionRequest
): Promise<SubmissionResponse> => {
  const response = await api.post<SubmissionResponse>(`/matches/${matchId}/submissions`, data);
  return response.data;
};

export const seedDevMatch = async (): Promise<any> => {
  const response = await api.post('/dev/seed-match');
  return response.data;
};
