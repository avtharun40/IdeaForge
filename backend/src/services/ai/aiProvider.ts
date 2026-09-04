import { GeminiProvider } from './geminiProvider.js';
import { OpenAIProvider } from './openaiProvider.js';

export interface PaperAnalysisInput {
  title: string;
  abstract: string;
  contextText: string; // The selected text chunks/sections for LLM context
}

export interface ResearchConcept {
  name: string;
  description: string | null;
  confidence: number;
}

export interface ResearchMethod {
  name: string;
  description: string | null;
  confidence: number;
}

export interface ResearchDataset {
  name: string;
  purpose: string | null;
  confidence: number;
}

export interface ResearchFinding {
  statement: string;
  evidence: string | null;
  confidence: number;
}

export interface ResearchClaim {
  claim: string;
  evidence: string | null;
}

export interface PaperAnalysisResult {
  researchProblem: string | null;
  researchObjectives: string[];
  researchQuestions: string[];
  domain: string | null;
  subdomains: string[];
  concepts: ResearchConcept[];
  methods: ResearchMethod[];
  datasets: ResearchDataset[];
  findings: ResearchFinding[];
  contributions: string[];
  limitations: string[];
  futureWork: string[];
  claims: ResearchClaim[];
}

export interface AIProvider {
  analyzePaper(input: PaperAnalysisInput): Promise<PaperAnalysisResult>;
}

/**
 * Factory function to retrieve the configured AI provider based on environment variables.
 */
export const getAIProvider = (): AIProvider => {
  const provider = process.env.AI_PROVIDER || 'gemini';
  
  if (provider === 'gemini') {
    return new GeminiProvider();
  }
  
  if (provider === 'openai') {
    return new OpenAIProvider();
  }
  
  throw new Error(`Unsupported AI Provider configuration: "${provider}"`);
};
