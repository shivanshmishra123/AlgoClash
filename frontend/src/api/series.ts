import api from './client';
import type { CreateSeriesRequest, Page, SeriesDetailResponse, SeriesSummaryResponse } from './types';

export const getSeriesList = async (page = 0, size = 20): Promise<Page<SeriesSummaryResponse>> => {
  const response = await api.get<Page<SeriesSummaryResponse>>('/series', {
    params: { page, size, sort: 'id,desc' },
  });
  return response.data;
};

export const getSeriesDetail = async (id: number): Promise<SeriesDetailResponse> => {
  const response = await api.get<SeriesDetailResponse>(`/series/${id}`);
  return response.data;
};

export const createSeries = async (data: CreateSeriesRequest): Promise<SeriesSummaryResponse> => {
  const response = await api.post<SeriesSummaryResponse>('/series', data);
  return response.data;
};

export const joinSeries = async (id: number): Promise<SeriesDetailResponse> => {
  const response = await api.post<SeriesDetailResponse>(`/series/${id}/join`);
  return response.data;
};
