import { api } from './api';
import type { PaperSubgraph, GraphStats } from '../types';

/**
 * Commands the backend to construct or update the Neo4j Knowledge Graph for a paper.
 */
export const buildPaperGraph = async (
  paperId: string
): Promise<{ paper_id: string; status: string; nodes_created: number; relationships_created: number }> => {
  return await api.post<any>(`/papers/${paperId}/graph`, {});
};

/**
 * Fetches the paper's localized knowledge subgraph.
 */
export const getPaperGraph = async (paperId: string): Promise<PaperSubgraph> => {
  return await api.get<PaperSubgraph>(`/papers/${paperId}/graph`);
};

/**
 * Fetches the multi-paper unified knowledge graph.
 */
export const getFullGraph = async (limit: number = 350): Promise<PaperSubgraph> => {
  return await api.get<PaperSubgraph>(`/graph?limit=${limit}`);
};

/**
 * Fetches global metrics of the Knowledge Graph database.
 */
export const getGraphStats = async (): Promise<GraphStats> => {
  return await api.get<GraphStats>('/graph/stats');
};

/**
 * Fetches connected neighbor concept nodes.
 */
export const getEntityNeighbors = async (entityId: string): Promise<any[]> => {
  return await api.get<any[]>(`/graph/entities/${entityId}/neighbors`);
};

/**
 * Fetches all academic papers linked to a specific research entity.
 */
export const getEntityPapers = async (entityId: string): Promise<any[]> => {
  return await api.get<any[]>(`/graph/entities/${entityId}/papers`);
};
