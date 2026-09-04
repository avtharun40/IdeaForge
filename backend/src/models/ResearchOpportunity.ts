import mongoose, { Document, Schema } from 'mongoose';

export interface IResearchOpportunity extends Document {
  opportunity_id: string;
  gap_id: string;
  gap_type: string;
  conceptA?: string;
  conceptB?: string;
  title: string;
  summary: string;
  problem: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const ResearchOpportunitySchema = new Schema<IResearchOpportunity>({
  opportunity_id: { type: String, required: true, unique: true, index: true },
  gap_id: { type: String, required: true, index: true },
  gap_type: { type: String, required: true },
  conceptA: { type: String, default: '' },
  conceptB: { type: String, default: '' },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  problem: { type: String, required: true },
  proposed_direction: { type: String, required: true },
  why_it_matters: { type: String, required: true },
  score: { type: Number, required: true },
  confidence: { type: Number, required: true },
  novelty_score: { type: Number, required: true },
  evidence_score: { type: Number, required: true },
  feasibility_score: { type: Number, required: true },
  impact_score: { type: Number, required: true },
  trend_score: { type: Number, required: true },
  supporting_papers: { type: [String], default: [] },
  supporting_entities: { type: [String], default: [] },
  supporting_claims: { type: [String], default: [] },
  limitations: { type: [String], default: [] },
  future_work: { type: [String], default: [] },
  validation_status: { type: String, required: true },
  user_state: {
    type: String,
    enum: ['none', 'saved', 'dismissed', 'interesting', 'not_relevant'],
    default: 'none'
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

export const ResearchOpportunity = mongoose.model<IResearchOpportunity>('ResearchOpportunity', ResearchOpportunitySchema);
export default ResearchOpportunity;
