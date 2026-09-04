import { api } from './api';
import type { ResearchGap, Paper } from '../types';

const buildQueryString = (params: any = {}): string => {
  const cleanParams: Record<string, string> = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = String(params[key]);
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return query ? `?${query}` : '';
};

export const getGaps = async (params: any = {}): Promise<ResearchGap[]> => {
  const query = buildQueryString(params);
  return await api.get<ResearchGap[]>(`/gaps${query}`);
};

export const getGapDetail = async (gapId: string): Promise<ResearchGap> => {
  return await api.get<ResearchGap>(`/gaps/${gapId}`);
};

export const getGapPapers = async (gapId: string): Promise<Paper[]> => {
  return await api.get<Paper[]>(`/gaps/${gapId}/papers`);
};

export const getGapEvidence = async (gapId: string): Promise<any> => {
  return await api.get<any>(`/gaps/${gapId}/evidence`);
};
