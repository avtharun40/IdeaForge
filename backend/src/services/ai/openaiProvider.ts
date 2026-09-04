import { AIProvider, PaperAnalysisInput, PaperAnalysisResult } from './aiProvider.js';

/**
 * Placeholder provider for OpenAI API compatibility.
 */
export class OpenAIProvider implements AIProvider {
  async analyzePaper(_input: PaperAnalysisInput): Promise<PaperAnalysisResult> {
    throw new Error('OpenAI AI Provider is not implemented in this phase.');
  }
}
