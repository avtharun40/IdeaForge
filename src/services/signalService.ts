import { api } from './api';

export interface ResearchSignal {
  signal_id: string;
  signal_type: 'frequency' | 'cooccurrence' | 'trend' | 'cross-domain' | 'bridge';
  entity_id: string;
  entity_name: string;
  score: number;
  confidence: number;
  paper_count: number;
  cooccurrence_count?: number;
  trend?: string;
  year_data?: Record<number, number>;
  supporting_papers: string[];
  supporting_relationships: string[];
  metadata?: any;
}

export interface CooccurrenceSignal {
  entity_a_id: string;
  entity_a_name: string;
  entity_a_type: string;
  entity_b_id: string;
  entity_b_name: string;
  entity_b_type: string;
  cooccurrence_count: number;
  paper_count: number;
  pmi: number;
  npmi: number;
}

export interface TemporalTrend {
  entity_id: string;
  entity_name: string;
  type: string;
  total_paper_count: number;
  recent_count: number;
  first_appearance: number;
  latest_appearance: number;
  slope: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'EMERGING' | 'DECLINING' | 'INSUFFICIENT_DATA';
  score: number;
  year_data: Record<number, number>;
}

export interface CrossDomainSignal {
  entity_id: string;
  entity_name: string;
  type: string;
  domain_count: number;
  paper_count: number;
  relationship_count: number;
  domains: string[];
}

export interface BridgeEntitySignal {
  entity_id: string;
  entity_name: string;
  type: string;
  degree: number;
  domain_count: number;
  diversity: number;
  score: number;
}

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

export const getSignals = async (params: any = {}): Promise<ResearchSignal[]> => {
  const query = buildQueryString(params);
  return await api.get<ResearchSignal[]>(`/signals${query}`);
};

export const getEntitySignals = async (entityId: string): Promise<ResearchSignal[]> => {
  return await api.get<ResearchSignal[]>(`/signals/entities/${entityId}`);
};

export const getTrends = async (params: any = {}): Promise<TemporalTrend[]> => {
  const query = buildQueryString(params);
  return await api.get<TemporalTrend[]>(`/signals/trends${query}`);
};

export const getCooccurrences = async (params: any = {}): Promise<CooccurrenceSignal[]> => {
  const query = buildQueryString(params);
  return await api.get<CooccurrenceSignal[]>(`/signals/cooccurrence${query}`);
};

export const getCrossDomains = async (): Promise<CrossDomainSignal[]> => {
  return await api.get<CrossDomainSignal[]>('/signals/cross-domain');
};
