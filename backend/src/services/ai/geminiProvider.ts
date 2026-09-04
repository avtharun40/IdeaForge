import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, PaperAnalysisInput, PaperAnalysisResult } from './aiProvider.js';
import { getSystemPrompt, getUserPrompt } from './prompts/paperAnalysisPrompt.js';

// Define the structured JSON Schema for Gemini SDK configuration
const paperAnalysisSchema: any = {
  type: 'object',
  properties: {
    researchProblem: { type: 'string', description: 'The main problem/issue the research aims to solve.' },
    researchObjectives: {
      type: 'array',
      items: { type: 'string' },
      description: 'The explicitly stated objectives/goals of this research.'
    },
    researchQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific research questions formulated or addressed in the paper.'
    },
    domain: { type: 'string', description: 'The high-level scientific or technical field (e.g. Computer Science, Bioinformatics).' },
    subdomains: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific sub-areas of the domain (e.g. Federated Learning, Differential Privacy).'
    },
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number' }
        },
        required: ['name', 'description', 'confidence']
      },
      description: 'Key research concepts and theoretical definitions.'
    },
    methods: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number' }
        },
        required: ['name', 'description', 'confidence']
      },
      description: 'Algorithms, models, architectures, or protocols proposed or used.'
    },
    datasets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          confidence: { type: 'number' }
        },
        required: ['name', 'purpose', 'confidence']
      },
      description: 'Evaluation benchmarks or data corpuses used in experiments.'
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statement: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'number' }
        },
        required: ['statement', 'evidence', 'confidence']
      },
      description: 'Key experimental results, findings, or outcomes backed by evidence text.'
    },
    contributions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Unique academic or practical contributions made by the paper.'
    },
    limitations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Flaws, boundaries, bottlenecks, or constraints acknowledged by the authors.'
    },
    futureWork: {
      type: 'array',
      items: { type: 'string' },
      description: 'Future research directions, challenges, or extensions suggested.'
    },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['claim', 'evidence']
      },
      description: 'The core assertions and claims stated, paired with supporting quotes.'
    }
  },
  required: [
    'researchProblem',
    'researchObjectives',
    'researchQuestions',
    'domain',
    'subdomains',
    'concepts',
    'methods',
    'datasets',
    'findings',
    'contributions',
    'limitations',
    'futureWork',
    'claims'
  ]
};

const generateWithTimeout = async (modelInstance: any, prompt: string, timeoutMs = 90000) => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Gemini API request timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      modelInstance.generateContent(prompt),
      timeoutPromise
    ]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
};

export class GeminiProvider implements AIProvider {
  private getClient(): { genAI: GoogleGenerativeAI; modelName: string } {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error('Gemini API connection error: GEMINI_API_KEY is not configured in backend/.env.');
    }

    return {
      genAI: new GoogleGenerativeAI(apiKey),
      modelName
    };
  }

  /**
   * Helper to validate that all required fields are present in the parsed JSON.
   */
  private validateSchema(parsed: any): PaperAnalysisResult {
    const fallback: PaperAnalysisResult = {
      researchProblem: parsed.researchProblem || null,
      researchObjectives: Array.isArray(parsed.researchObjectives) ? parsed.researchObjectives : [],
      researchQuestions: Array.isArray(parsed.researchQuestions) ? parsed.researchQuestions : [],
      domain: parsed.domain || null,
      subdomains: Array.isArray(parsed.subdomains) ? parsed.subdomains : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts.map((c: any) => ({
        name: String(c.name || ''),
        description: c.description || null,
        confidence: typeof c.confidence === 'number' ? c.confidence : 1.0
      })) : [],
      methods: Array.isArray(parsed.methods) ? parsed.methods.map((m: any) => ({
        name: String(m.name || ''),
        description: m.description || null,
        confidence: typeof m.confidence === 'number' ? m.confidence : 1.0
      })) : [],
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets.map((d: any) => ({
        name: String(d.name || ''),
        purpose: d.purpose || null,
        confidence: typeof d.confidence === 'number' ? d.confidence : 1.0
      })) : [],
      findings: Array.isArray(parsed.findings) ? parsed.findings.map((f: any) => ({
        statement: String(f.statement || ''),
        evidence: f.evidence || null,
        confidence: typeof f.confidence === 'number' ? f.confidence : 1.0
      })) : [],
      contributions: Array.isArray(parsed.contributions) ? parsed.contributions : [],
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
      futureWork: Array.isArray(parsed.futureWork) ? parsed.futureWork : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims.map((c: any) => ({
        claim: String(c.claim || ''),
        evidence: c.evidence || null
      })) : []
    };

    return fallback;
  }

  async analyzePaper(input: PaperAnalysisInput): Promise<PaperAnalysisResult> {
    const { genAI, modelName } = this.getClient();

    // Instantiate Gemini model with JSON response schema
    const modelInstance = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: getSystemPrompt(),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: paperAnalysisSchema
      }
    });

    const userPrompt = getUserPrompt(input.title, input.abstract, input.contextText);

    try {
      console.log(`[AI] Dispatching prompt to Gemini model "${modelName}"...`);
      const response = await generateWithTimeout(modelInstance, userPrompt, 90000);
      const text = response.response.text();
      
      if (!text) {
        throw new Error('Gemini API returned an empty text response.');
      }

      console.log('[AI] Parse response and validate schema...');
      const parsed = JSON.parse(text);
      return this.validateSchema(parsed);

    } catch (err: any) {
      console.warn('[AI] First analysis attempt failed or timed out. Re-trying with a corrective prompt...', err);
      
      // Secondary fallback retry loop
      try {
        const correctiveModel = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: getSystemPrompt(),
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: paperAnalysisSchema
          }
        });

        const correctivePrompt = `${userPrompt}\n\nWARNING: Your previous attempt failed to parse or was invalid JSON. Please make absolute sure to return valid JSON that conforms exactly to the schema. Do not include markdown code block syntax.`;
        const response = await generateWithTimeout(correctiveModel, correctivePrompt, 60000);
        const text = response.response.text();
        
        if (!text) {
          throw new Error('Retry attempt returned empty text.');
        }

        const parsed = JSON.parse(text);
        return this.validateSchema(parsed);
      } catch (retryErr: any) {
        console.error('[AI] Fatal: Second analysis attempt also failed. Aborting.', retryErr);
        throw new Error(`AI Analysis failed during structured parsing. Details: ${retryErr.message}`);
      }
    }
  }
}
