import { api } from './api';
import type { ResearchOpportunity } from '../types';

export interface GetOpportunitiesResponse {
  success: boolean;
  data: ResearchOpportunity[];
  total: number;
  page: number;
  limit: number;
}

export const getOpportunities = async (filters: any = {}): Promise<GetOpportunitiesResponse> => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, String(filters[key]));
    }
  });
  const res = await api.get<any>(`/opportunities?${params.toString()}`);
  if (Array.isArray(res)) {
    return {
      success: true,
      data: res,
      total: res.length,
      page: 1,
      limit: res.length
    };
  }
  return {
    success: true,
    data: Array.isArray(res?.data) ? res.data : [],
    total: typeof res?.total === 'number' ? res.total : (Array.isArray(res?.data) ? res.data.length : 0),
    page: res?.page || 1,
    limit: res?.limit || 10
  };
};

export const getOpportunityDetail = async (id: string): Promise<ResearchOpportunity> => {
  const res = await api.get<any>(`/opportunities/${id}`);
  return (res?.data !== undefined ? res.data : res) as ResearchOpportunity;
};

export const generateOpportunities = async (): Promise<{ success: boolean; data: { generated_count: number } }> => {
  const res = await api.post<any>(`/opportunities/generate`, {});
  return {
    success: true,
    data: {
      generated_count: res?.generated_count ?? res?.data?.generated_count ?? 0
    }
  };
};

export const updateOpportunityState = async (id: string, state: string): Promise<ResearchOpportunity> => {
  const res = await api.patch<any>(`/opportunities/${id}/state`, { state });
  return (res?.data !== undefined ? res.data : res) as ResearchOpportunity;
};
