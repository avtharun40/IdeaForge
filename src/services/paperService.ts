import { api } from './api';
import type { Paper, PaperStatus } from '../types';

export interface PaperQueryFilters {
  search?: string;
  status?: string;
  researchArea?: string;
  year?: string;
}

export const getPapers = async (filters?: PaperQueryFilters): Promise<Paper[]> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status && filters.status !== 'All') {
    params.append('status', filters.status.toLowerCase());
  }
  if (filters?.researchArea && filters.researchArea !== 'All') {
    params.append('researchArea', filters.researchArea);
  }
  if (filters?.year && filters.year !== 'All') {
    params.append('year', filters.year);
  }

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get<any>(`/papers${queryStr}`);
  
  let papersList: any[] = [];
  if (Array.isArray(response)) {
    papersList = response;
  } else if (response && Array.isArray(response.data)) {
    papersList = response.data;
  } else if (response && typeof response === 'object' && Array.isArray(response.papers)) {
    papersList = response.papers;
  }

  return papersList.map(mapPaperStatus);
};

export const getPaperById = async (id: string): Promise<Paper> => {
  const paper = await api.get<any>(`/papers/${id}`);
  return mapPaperStatus(paper);
};

export const uploadPaper = async (
  file: File,
  metadata: { title?: string; authors?: string; year?: string; researchArea?: string }
): Promise<Paper> => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.authors) formData.append('authors', metadata.authors);
  if (metadata.year) formData.append('year', metadata.year);
  if (metadata.researchArea) formData.append('researchArea', metadata.researchArea);

  const paper = await api.post<any>('/papers/upload', formData, true);
  return mapPaperStatus(paper);
};

export const deletePaper = async (id: string): Promise<void> => {
  await api.delete(`/papers/${id}`);
};

export const deleteAllPapers = async (): Promise<void> => {
  await api.delete('/papers/all');
};

export const getPaperStatus = async (id: string): Promise<{ 
  id: string; 
  status: PaperStatus; 
  processingStage?: string; 
  processingProgress?: number; 
  processingMessage?: string; 
  processingError?: string 
}> => {
  const result = await api.get<any>(`/papers/${id}/status`);
  let mappedStatus: PaperStatus = 'Processing';
  if (result.status === 'ready') mappedStatus = 'Ready';
  if (result.status === 'failed') mappedStatus = 'Failed';
  if (result.status === 'processing') mappedStatus = 'Processing';
  
  return {
    id: result.id,
    status: mappedStatus,
    processingStage: result.processingStage,
    processingProgress: result.processingProgress,
    processingMessage: result.processingMessage,
    processingError: result.processingError
  };
};

export const getPaperAnalysisStatus = async (
  id: string
): Promise<{ paperId: string; status: any; provider: string; model: string; error?: string; analyzedAt?: string }> => {
  const result = await api.get<any>(`/papers/${id}/analysis/status`);
  return {
    paperId: result.paperId,
    status: result.status,
    provider: result.provider,
    model: result.model,
    error: result.error || undefined,
    analyzedAt: result.analyzedAt || undefined
  };
};

export const analyzePaper = async (id: string): Promise<{ paperId: string; status: string }> => {
  const result = await api.post<any>(`/papers/${id}/analyze`, {});
  return {
    paperId: result.paperId,
    status: result.status
  };
};

export const retryPaperProcessing = async (id: string): Promise<{ id: string; status: PaperStatus }> => {
  const result = await api.post<any>(`/papers/${id}/process`, {});
  let mappedStatus: PaperStatus = 'Processing';
  if (result.status === 'ready') mappedStatus = 'Ready';
  if (result.status === 'failed') mappedStatus = 'Failed';
  if (result.status === 'processing') mappedStatus = 'Processing';

  return {
    id: result.id,
    status: mappedStatus
  };
};

// Helper: map backend lower-case status strings to frontend types
function mapPaperStatus(paper: any): Paper {
  if (!paper) {
    return {
      id: 'unknown',
      title: 'Untitled Paper',
      authors: [],
      year: new Date().getFullYear(),
      researchArea: 'General',
      conceptCount: 0,
      status: 'Processing',
      dateAdded: new Date().toISOString().split('T')[0]
    };
  }

  let mappedStatus: PaperStatus = 'Processing';
  if (paper.status === 'ready') mappedStatus = 'Ready';
  if (paper.status === 'failed') mappedStatus = 'Failed';
  if (paper.status === 'processing') mappedStatus = 'Processing';
  
  let dateStr = new Date().toISOString().split('T')[0];
  if (paper.createdAt) {
    try {
      const d = new Date(paper.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    } catch {
      // keep fallback
    }
  }

  // Parse Authors safely
  let authors: { name: string }[] = [];
  if (Array.isArray(paper.authors)) {
    authors = paper.authors.map((a: any) => typeof a === 'string' ? { name: a } : { name: a.name || 'Unknown Author' });
  } else if (typeof paper.authors === 'string') {
    authors = paper.authors.split(',').map((s: string) => ({ name: s.trim() }));
  }

  // Map sections object in strict display order
  const detectedSections: { heading: string; text: string }[] = [];
  if (paper.sections && typeof paper.sections === 'object') {
    const sectionKeysInOrder = [
      { key: 'abstract', heading: 'Abstract' },
      { key: 'introduction', heading: 'Introduction' },
      { key: 'relatedWork', heading: 'Related Work' },
      { key: 'methodology', heading: 'Methodology' },
      { key: 'results', heading: 'Results' },
      { key: 'discussion', heading: 'Discussion' },
      { key: 'conclusion', heading: 'Conclusion' },
      { key: 'limitations', heading: 'Limitations' },
      { key: 'futureWork', heading: 'Future Work' },
      { key: 'references', heading: 'References' }
    ];

    sectionKeysInOrder.forEach(({ key, heading }) => {
      const val = paper.sections[key];
      if (val !== undefined && val !== null) {
        detectedSections.push({ heading, text: String(val) });
      }
    });
  } else if (Array.isArray(paper.detectedSections)) {
    detectedSections.push(...paper.detectedSections);
  }

  // Get statistics from new processing sub-object or fall back to top-level fields
  const pageCount = paper.processing?.pageCount !== undefined ? paper.processing.pageCount : paper.pageCount;
  const wordCount = paper.processing?.wordCount !== undefined ? paper.processing.wordCount : paper.wordCount;
  const characterCount = paper.processing?.characterCount !== undefined ? paper.processing.characterCount : paper.characterCount;
  
  let processedAt: string | undefined = undefined;
  const rawProcessed = paper.processing?.processedAt || paper.processedAt;
  if (rawProcessed) {
    try {
      const d = new Date(rawProcessed);
      if (!isNaN(d.getTime())) {
        processedAt = d.toISOString();
      }
    } catch {
      // keep undefined
    }
  }

  // Extract authoritative metadata from AI analysis if ready, or fall back to top-level fields
  const aiResult = paper.aiAnalysis?.status === 'ready' && paper.aiAnalysis?.result ? paper.aiAnalysis.result : null;
  
  const rawConcepts = (aiResult?.concepts && Array.isArray(aiResult.concepts) && aiResult.concepts.length > 0) 
    ? aiResult.concepts 
    : (Array.isArray(paper.concepts) ? paper.concepts : []);
  const concepts = rawConcepts.map((c: any, idx: number) => ({
    id: c.id || `c-${idx}`,
    name: c.name || (typeof c === 'string' ? c : 'Unnamed Concept'),
    description: c.description || ''
  }));

  const rawMethods = (aiResult?.methods && Array.isArray(aiResult.methods) && aiResult.methods.length > 0) 
    ? aiResult.methods 
    : (Array.isArray(paper.methods) ? paper.methods : []);
  const methods = rawMethods.map((m: any, idx: number) => ({
    id: m.id || `m-${idx}`,
    name: m.name || (typeof m === 'string' ? m : 'Unnamed Method'),
    description: m.description || ''
  }));

  const rawDatasets = (aiResult?.datasets && Array.isArray(aiResult.datasets) && aiResult.datasets.length > 0) 
    ? aiResult.datasets 
    : (Array.isArray(paper.datasets) ? paper.datasets : []);
  const datasets = rawDatasets.map((d: any, idx: number) => ({
    id: d.id || `d-${idx}`,
    name: d.name || (typeof d === 'string' ? d : 'Unnamed Dataset'),
    description: d.description || d.purpose || ''
  }));

  const limitations = (aiResult?.limitations && Array.isArray(aiResult.limitations)) 
    ? aiResult.limitations 
    : (Array.isArray(paper.limitations) ? paper.limitations : []);

  const futureWork = (aiResult?.futureWork && Array.isArray(aiResult.futureWork)) 
    ? aiResult.futureWork 
    : (Array.isArray(paper.futureWork) ? paper.futureWork : []);

  return {
    id: paper.id || paper._id,
    title: paper.title || 'Untitled Paper',
    authors,
    year: paper.year !== undefined && paper.year !== null && !isNaN(Number(paper.year)) ? Number(paper.year) : new Date().getFullYear(),
    researchArea: paper.researchArea || 'General',
    conceptCount: concepts.length || paper.conceptCount || 0,
    status: mappedStatus,
    dateAdded: dateStr,
    abstract: paper.abstract,
    concepts,
    methods,
    datasets,
    limitations,
    futureWork,
    relatedPapers: Array.isArray(paper.relatedPapers) ? paper.relatedPapers : [],
    pageCount,
    wordCount,
    characterCount,
    detectedSections,
    processingStage: paper.processingStage,
    processingProgress: paper.processingProgress !== undefined ? paper.processingProgress : (paper.status === 'ready' ? 100 : 0),
    processingMessage: paper.processingMessage,
    processingError: paper.processingError,
    processedAt,
    aiAnalysis: paper.aiAnalysis
  };
}

export const simulateUpload = uploadPaper;
export const updatePaperStatus = (_id: string, _status: PaperStatus) => {}; // No-op in real API mode
