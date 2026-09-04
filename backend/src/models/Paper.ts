import mongoose, { Document, Schema } from 'mongoose';

export interface IPaperAuthor {
  name: string;
}

export interface IPaperConcept {
  name: string;
  description: string;
}

export interface IPaperDataset {
  name: string;
  description?: string;
}

export interface IPaperMethod {
  name: string;
  description?: string;
}

export interface IPaperSections {
  abstract: string | null;
  introduction: string | null;
  relatedWork: string | null;
  methodology: string | null;
  results: string | null;
  discussion: string | null;
  conclusion: string | null;
  limitations: string | null;
  futureWork: string | null;
  references: string | null;
}

export interface IPaperChunk {
  chunkIndex: number;
  text: string;
  startPosition: number;
  endPosition: number;
}

export interface IPaperProcessingInfo {
  pageCount: number;
  characterCount: number;
  wordCount: number;
  processedAt: Date;
  extractionVersion: string;
}

export interface IAIPaperConcept {
  name: string;
  description: string | null;
  confidence: number;
}

export interface IAIPaperMethod {
  name: string;
  description: string | null;
  confidence: number;
}

export interface IAIPaperDataset {
  name: string;
  purpose: string | null;
  confidence: number;
}

export interface IAIPaperFinding {
  statement: string;
  evidence: string | null;
  confidence: number;
}

export interface IAIPaperClaim {
  claim: string;
  evidence: string | null;
}

export interface IAIPaperAnalysis {
  researchProblem: string | null;
  researchObjectives: string[];
  researchQuestions: string[];
  domain: string | null;
  subdomains: string[];
  concepts: IAIPaperConcept[];
  methods: IAIPaperMethod[];
  datasets: IAIPaperDataset[];
  findings: IAIPaperFinding[];
  contributions: string[];
  limitations: string[];
  futureWork: string[];
  claims: IAIPaperClaim[];
}

export interface IPaperAIAnalysisInfo {
  status: 'pending' | 'processing' | 'ready' | 'failed';
  provider: string;
  model: string;
  version: string;
  analyzedAt: Date | null;
  error: string | null;
  result: IAIPaperAnalysis | null;
}

export interface IPaper extends Document {
  title: string;
  authors: IPaperAuthor[];
  year?: number;
  researchArea?: string;
  abstract?: string;
  concepts: IPaperConcept[];
  methods: IPaperMethod[];
  datasets: IPaperDataset[];
  limitations: string[];
  futureWork: string[];
  status: 'processing' | 'ready' | 'failed';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  detectedSections?: { heading: string; text: string }[];
  processing?: IPaperProcessingInfo;
  sections?: IPaperSections;
  chunks?: IPaperChunk[];
  processingStage?: 'queued' | 'uploaded' | 'extracting' | 'analyzing' | 'building_graph' | 'finalizing' | 'completed' | 'failed';
  processingProgress?: number;
  processingMessage?: string;
  processingError?: string | null;
  processedAt?: Date;
  aiAnalysis?: IPaperAIAnalysisInfo;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorSchema = new Schema<IPaperAuthor>({
  name: { type: String, required: true }
}, { _id: false });

const ConceptSchema = new Schema<IPaperConcept>({
  name: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const DatasetSchema = new Schema<IPaperDataset>({
  name: { type: String, required: true },
  description: { type: String }
}, { _id: false });

const MethodSchema = new Schema<IPaperMethod>({
  name: { type: String, required: true },
  description: { type: String }
}, { _id: false });

const AIPaperConceptSchema = new Schema<IAIPaperConcept>({
  name: { type: String, required: true },
  description: { type: String, default: null },
  confidence: { type: Number, required: true }
}, { _id: false });

const AIPaperMethodSchema = new Schema<IAIPaperMethod>({
  name: { type: String, required: true },
  description: { type: String, default: null },
  confidence: { type: Number, required: true }
}, { _id: false });

const AIPaperDatasetSchema = new Schema<IAIPaperDataset>({
  name: { type: String, required: true },
  purpose: { type: String, default: null },
  confidence: { type: Number, required: true }
}, { _id: false });

const AIPaperFindingSchema = new Schema<IAIPaperFinding>({
  statement: { type: String, required: true },
  evidence: { type: String, default: null },
  confidence: { type: Number, required: true }
}, { _id: false });

const AIPaperClaimSchema = new Schema<IAIPaperClaim>({
  claim: { type: String, required: true },
  evidence: { type: String, default: null }
}, { _id: false });

const AIPaperAnalysisSchema = new Schema<IAIPaperAnalysis>({
  researchProblem: { type: String, default: null },
  researchObjectives: { type: [String], default: [] },
  researchQuestions: { type: [String], default: [] },
  domain: { type: String, default: null },
  subdomains: { type: [String], default: [] },
  concepts: { type: [AIPaperConceptSchema], default: [] },
  methods: { type: [AIPaperMethodSchema], default: [] },
  datasets: { type: [AIPaperDatasetSchema], default: [] },
  findings: { type: [AIPaperFindingSchema], default: [] },
  contributions: { type: [String], default: [] },
  limitations: { type: [String], default: [] },
  futureWork: { type: [String], default: [] },
  claims: { type: [AIPaperClaimSchema], default: [] }
}, { _id: false });

const PaperAIAnalysisInfoSchema = new Schema<IPaperAIAnalysisInfo>({
  status: { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'pending' },
  provider: { type: String, default: 'gemini' },
  model: { type: String, default: 'gemini-1.5-flash' },
  version: { type: String, default: '1.0.0' },
  analyzedAt: { type: Date, default: null },
  error: { type: String, default: null },
  result: { type: AIPaperAnalysisSchema, default: null }
}, { _id: false });

const PaperSchema = new Schema<IPaper>({
  title: { type: String, required: true, trim: true },
  authors: { type: [AuthorSchema], default: [] },
  year: { type: Number },
  researchArea: { type: String, trim: true },
  abstract: { type: String },
  concepts: { type: [ConceptSchema], default: [] },
  methods: { type: [MethodSchema], default: [] },
  datasets: { type: [DatasetSchema], default: [] },
  limitations: { type: [String], default: [] },
  futureWork: { type: [String], default: [] },
  status: { 
    type: String, 
    enum: ['processing', 'ready', 'failed'], 
    default: 'processing' 
  },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  pageCount: { type: Number },
  wordCount: { type: Number },
  characterCount: { type: Number },
  detectedSections: {
    type: [{
      heading: { type: String, required: true },
      text: { type: String, required: true }
    }],
    default: []
  },
  processing: {
    pageCount: { type: Number },
    characterCount: { type: Number },
    wordCount: { type: Number },
    processedAt: { type: Date },
    extractionVersion: { type: String }
  },
  sections: {
    abstract: { type: String, default: null },
    introduction: { type: String, default: null },
    relatedWork: { type: String, default: null },
    methodology: { type: String, default: null },
    results: { type: String, default: null },
    discussion: { type: String, default: null },
    conclusion: { type: String, default: null },
    limitations: { type: String, default: null },
    futureWork: { type: String, default: null },
    references: { type: String, default: null }
  },
  chunks: {
    type: [{
      chunkIndex: { type: Number, required: true },
      text: { type: String, required: true },
      startPosition: { type: Number, required: true },
      endPosition: { type: Number, required: true }
    }],
    default: []
  },
  processingStage: { 
    type: String, 
    enum: ['queued', 'uploaded', 'extracting', 'analyzing', 'building_graph', 'finalizing', 'completed', 'failed'], 
    default: 'queued' 
  },
  processingProgress: { type: Number, default: 0 },
  processingMessage: { type: String, default: null },
  processingError: { type: String, default: null },
  processedAt: { type: Date },
  aiAnalysis: {
    type: PaperAIAnalysisInfoSchema,
    default: () => ({
      status: 'pending',
      provider: process.env.AI_PROVIDER || 'gemini',
      model: process.env.AI_MODEL || 'gemini-1.5-flash',
      version: '1.0.0',
      analyzedAt: null,
      error: null,
      result: null
    })
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      const retAny = ret as any;
      retAny.id = retAny._id.toString();
      delete retAny._id;
      delete retAny.__v;
      return retAny;
    }
  }
});

export const Paper = mongoose.model<IPaper>('Paper', PaperSchema);
export default Paper;
