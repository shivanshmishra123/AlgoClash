import api from './client';
import type { MatchmakingResponse } from './types';

export const joinMatchmakingQueue = async (): Promise<MatchmakingResponse> => {
  const response = await api.post<MatchmakingResponse>('/matchmaking/join');
  return response.data;
};

export const leaveMatchmakingQueue = async (): Promise<MatchmakingResponse> => {
  const response = await api.post<MatchmakingResponse>('/matchmaking/leave');
  return response.data;
};

export const getMatchmakingStatus = async (): Promise<MatchmakingResponse> => {
  const response = await api.get<MatchmakingResponse>('/matchmaking/status');
  return response.data;
};

export const matchWithBot = async (): Promise<MatchmakingResponse> => {
  const response = await api.post<MatchmakingResponse>('/matchmaking/bot');
  return response.data;
};
