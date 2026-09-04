import { api } from './api';

export interface DashboardStats {
  stats: {
    papersAnalyzed: number;
    conceptsDiscovered: number;
    graphNodes: number;
    potentialOpportunities: number;
    savedOpportunities: number;
    researchGapsCount: number;
  };
  opportunities: any[];
  domains: { name: string; value: number }[];
  signals: { name: string; value: number }[];
  activities: { date: string; action: string; details: string }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return await api.get<DashboardStats>('/dashboard/stats');
};
