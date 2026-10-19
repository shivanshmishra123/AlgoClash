import api from './client';
import type { UserProfileResponse } from './types';

export const getUserProfile = async (username: string): Promise<UserProfileResponse> => {
  const response = await api.get<UserProfileResponse>(`/users/username/${username}/profile`);
  return response.data;
};

export const getAllUsers = async (): Promise<any[]> => {
  const response = await api.get<any[]>('/users');
  return response.data;
};
