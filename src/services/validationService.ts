import { api } from './api';
import type { GapValidation, EvidenceItem } from '../types';

export const getGapValidation = async (gapId: string): Promise<GapValidation> => {
  return await api.get<GapValidation>(`/gaps/${gapId}/validation`);
};

export const triggerGapValidation = async (gapId: string): Promise<GapValidation> => {
  return await api.post<GapValidation>(`/gaps/${gapId}/validate`, {});
};

export const getEvidenceDetails = async (evidenceId: string): Promise<EvidenceItem> => {
  return await api.get<EvidenceItem>(`/evidence/${evidenceId}`);
};

export const getEvidenceByPaper = async (paperId: string): Promise<EvidenceItem[]> => {
  return await api.get<EvidenceItem[]>(`/evidence/paper/${paperId}`);
};
