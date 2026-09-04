export type PaperStatus = 'Ready' | 'Processing' | 'Failed';

export interface PaperAuthor {
  name: string;
}

export interface PaperConcept {
  id: string;
  name: string;
  description: string;
}

export interface PaperDataset {
  id: string;
  name: string;
  description?: string;
}

export interface PaperMethod {
  id: string;
  name: string;
  description?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: PaperAuthor[];
  year: number;
  researchArea: string;
  conceptCount: number;
  status: PaperStatus;
  dateAdded: string;
  abstract?: string;
  concepts?: PaperConcept[];
  methods?: PaperMethod[];
  datasets?: PaperDataset[];
  limitations?: string[];
  futureWork?: string[];
  relatedPapers?: string[]; // titles of related papers
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  detectedSections?: { heading: string; text: string }[];
  processingStage?: 'queued' | 'uploaded' | 'extracting' | 'analyzing' | 'building_graph' | 'finalizing' | 'completed' | 'failed';
  processingProgress?: number;
  processingMessage?: string;
  processingError?: string;
  processedAt?: string;
  aiAnalysis?: PaperAIAnalysisInfo;
}

export type AIAnalysisStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface AIAnalysisConcept {
  name: string;
  description: string | null;
  confidence: number;
}

export interface AIAnalysisMethod {
  name: string;
  description: string | null;
  confidence: number;
}

export interface AIAnalysisDataset {
  name: string;
  purpose: string | null;
  confidence: number;
}

export interface AIAnalysisFinding {
  statement: string;
  evidence: string | null;
  confidence: number;
}

export interface AIAnalysisClaim {
  claim: string;
  evidence: string | null;
}

export interface PaperAnalysis {
  researchProblem: string | null;
  researchObjectives: string[];
  researchQuestions: string[];
  domain: string | null;
  subdomains: string[];
  concepts: AIAnalysisConcept[];
  methods: AIAnalysisMethod[];
  datasets: AIAnalysisDataset[];
  findings: AIAnalysisFinding[];
  contributions: string[];
  limitations: string[];
  futureWork: string[];
  claims: AIAnalysisClaim[];
}

export interface PaperAIAnalysisInfo {
  status: AIAnalysisStatus;
  provider: string;
  model: string;
  version: string;
  analyzedAt: string | null;
  error: string | null;
  result: PaperAnalysis | null;
}

export interface ResearchSignal {
  name: string;
  value: number; // 0 to 100 percentage
}

export interface ResearchOpportunity {
  id: string;
  conceptA?: string;
  conceptB?: string;
  evidenceScore?: number;
  evidenceTier?: 'HIGH' | 'MEDIUM' | 'LOW';
  signals?: ResearchSignal[];
  
  opportunity_id: string;
  gap_id: string;
  gap_type: string;
  title: string;
  summary: string;
  problem: string;
  existing_research: string;
  gap_description: string;
  proposed_direction: string;
  why_it_matters: string;
  score: number;
  confidence: number;
  novelty_score: number;
  evidence_score: number;
  feasibility_score: number;
  impact_score: number;
  trend_score: number;
  supporting_papers: string[];
  supporting_entities: string[];
  supporting_claims: string[];
  limitations: string[];
  future_work: string[];
  validation_status: string;
  user_state: 'none' | 'saved' | 'dismissed' | 'interesting' | 'not_relevant';
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  papersAnalyzed: number;
  conceptsDiscovered: number;
  graphNodes: number;
  potentialOpportunities: number;
  highEvidenceOpportunities: number;
}

export interface RecentPaper {
  id: string;
  title: string;
  year: number;
  conceptCount: number;
  status: PaperStatus;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

export interface ResearchArea {
  id: string;
  name: string;
  count: number;
}

export interface ResearchGap {
  gap_id: string;
  gap_type: 'LOW_COVERAGE' | 'CROSS_DOMAIN' | 'UNDEREXPLORED_COMBINATION' | 'REPEATED_LIMITATION' | 'UNRESOLVED_FUTURE_WORK' | 'METHOD_GAP' | 'DATASET_GAP' | 'APPLICATION_GAP';
  title: string;
  description: string;
  score: number;
  confidence: number;
  supporting_entities: string[];
  supporting_papers: string[];
  supporting_signals: string[];
  supporting_limitations: string[];
  supporting_future_work: string[];
  evidence_count: number;
  created_at: string;
}

export type GapValidationStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'WEAKLY_SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';

export interface EvidenceItem {
  evidence_id: string;
  gap_id: string;
  paper_id: string;
  source_chunk_id: string | null;
  evidence_type: 'DIRECT_CLAIM' | 'MULTIPLE_PAPER_SUPPORT' | 'LIMITATION_SUPPORT' | 'FUTURE_WORK_SUPPORT' | 'GRAPH_STRUCTURAL_SUPPORT' | 'TEMPORAL_SUPPORT' | 'COOCCURRENCE_SUPPORT' | 'SEMANTIC_SUPPORT';
  text: string;
  confidence: number;
  source_type: string;
  year: number;
  relevance_score: number;
}

export interface GapValidationContradiction {
  paper_a: string;
  claim_a: string;
  paper_b: string;
  claim_b: string;
  entity: string;
}

export interface GapValidation {
  gap_id: string;
  status: GapValidationStatus;
  evidence_items: EvidenceItem[];
  evidence_count: number;
  unique_papers: number;
  confidence: number;
  contradictions: GapValidationContradiction[];
  validated_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  properties: any;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  properties?: any;
}

export interface PaperSubgraph {
  paper_id: string;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface GraphStats {
  papers: number;
  nodes: number;
  relationships: number;
  concepts: number;
  methods: number;
  datasets: number;
  claims: number;
}
