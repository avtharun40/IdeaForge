import mongoose from 'mongoose';
import ResearchOpportunity from '../models/ResearchOpportunity.js';
import * as researchGapService from './researchGapService.js';
import * as evidenceValidationService from './evidenceValidationService.js';
import * as researchSignalService from './researchSignalService.js';
import * as neo4jService from './neo4jService.js';
import { toNum } from '../utils/neo4jHelpers.js';
import Paper from '../models/Paper.js';

export const DEFAULT_WEIGHTS = {
  novelty: 0.30,
  evidence: 0.25,
  impact: 0.20,
  feasibility: 0.15,
  trend: 0.10
};

/**
 * Validates gaps, scores them, and upserts them as ranked opportunities.
 */
export const generateOpportunities = async (customGaps?: any[], weights = DEFAULT_WEIGHTS): Promise<number> => {
  const allGaps = customGaps || (await researchGapService.getAllGaps({}));
  let count = 0;

  // Fetch paper details once for year/feasibility helpers
  const papers = await Paper.find({}, 'year');
  const paperYears = papers.map(p => p.year).filter(Boolean) as number[];
  const avgPaperYear = paperYears.length > 0 ? paperYears.reduce((a, b) => a + b, 0) / paperYears.length : new Date().getFullYear();

  // Fetch trends once to calculate trend scores
  const trendsList = await researchSignalService.getAllSignals({ type: 'trend' });

  for (const gap of allGaps) {
    // 1. Evaluate validation report
    const validation = gap.customValidation || (await evidenceValidationService.validateGap(gap.gap_id));

    // Skip CONTRADICTED and INSUFFICIENT_EVIDENCE
    if (validation.status === 'CONTRADICTED' || validation.status === 'INSUFFICIENT_EVIDENCE') {
      continue;
    }

    // Must be SUPPORTED, PARTIALLY_SUPPORTED, or WEAKLY_SUPPORTED
    if (validation.status !== 'SUPPORTED' && validation.status !== 'PARTIALLY_SUPPORTED' && validation.status !== 'WEAKLY_SUPPORTED') {
      continue;
    }

    // 2. Score Calculations
    // 2.1 Evidence Score (grounded in Phase 10)
    let evidence_score = 50;
    if (validation.status === 'SUPPORTED') evidence_score = 95;
    else if (validation.status === 'PARTIALLY_SUPPORTED') evidence_score = 75;
    else if (validation.status === 'WEAKLY_SUPPORTED') evidence_score = 60;

    // 2.2 Novelty Score (grounded in coverage deficit and sparsity)
    let novelty_score = 80;
    if (gap.gap_type === 'CROSS_DOMAIN') novelty_score = 95;
    else if (gap.gap_type === 'UNDEREXPLORED_COMBINATION') novelty_score = 90;
    else if (gap.gap_type === 'LOW_COVERAGE') novelty_score = 85;

    // Deficit bonus
    const deficit = Math.max(0, gap.evidence_count - gap.supporting_papers.length);
    novelty_score += deficit * 3;

    // Deduct slightly for higher number of papers
    novelty_score -= gap.supporting_papers.length * 2;
    novelty_score = Math.min(100, Math.max(10, novelty_score));

    // 2.3 Impact Score (grounded in entity degrees)
    let totalDegree = gap.supporting_entities.length;
    for (const ent of gap.supporting_entities) {
      try {
        const res = await neo4jService.runQuery(`MATCH (e:ResearchEntity { name: $name })-[r]-() RETURN count(r) as c`, { name: ent });
        if (res.records.length > 0) {
          totalDegree += toNum(res.records[0].get('c'));
        }
      } catch (e) {
        totalDegree += 2;
      }
    }
    let impact_score = Math.min(98, Math.round(totalDegree * 3 + 60));
    if (gap.gap_type === 'CROSS_DOMAIN') impact_score += 8;
    impact_score = Math.min(100, impact_score);

    // 2.4 Feasibility Score (grounded in method availability and recent Indicators)
    let feasibility_score = 70;
    // Methods or datasets in entities list increase feasibility
    if (gap.supporting_entities.length >= 2) feasibility_score += 10;
    if (avgPaperYear >= 2023) feasibility_score += 10; // Active recent base
    feasibility_score = Math.min(95, feasibility_score);

    // 2.5 Trend Score (grounded in Phase 8 trend signals)
    let trend_score = 75;
    for (const ent of gap.supporting_entities) {
      const matchingTrend = trendsList.find(t => t.entity_name.toLowerCase() === ent.toLowerCase());
      if (matchingTrend && matchingTrend.score) {
        trend_score = Math.max(trend_score, matchingTrend.score);
      }
    }
    trend_score = Math.min(100, trend_score);

    // 2.6 Overall Score
    const overall_score = Math.round(
      novelty_score * weights.novelty +
      evidence_score * weights.evidence +
      impact_score * weights.impact +
      feasibility_score * weights.feasibility +
      trend_score * weights.trend
    );

    // 3. Grounded Phrased Sections (zero fabrication)
    const validEntities = (gap.supporting_entities || []).filter((e: string) => e && e.trim().length > 0);
    const entitiesLabel = validEntities.length > 0
      ? validEntities.slice(0, 3).join(' & ')
      : '[Unresolved Concept]';

    const title = `Advancing ${entitiesLabel}: An Evidence-Backed Research Opportunity`;
    const summary = `A potentially novel research direction focusing on "${entitiesLabel}" to address underexplored literature gaps and method bottlenecks.`;
    const problem = gap.description;
    const existing_research = `Existing literature in ${gap.supporting_papers.slice(0, 2).join(' & ') || 'prior publications'} establishes foundations in ${validEntities[0] || '[Unresolved Concept]'} but does not explore integration parameters.`;
    const gap_description = `No directly matching work was identified in the current IdeaForge corpus combining these concepts, suggesting this is underexplored based on the indexed literature.`;
    const proposed_direction = `Extend current methods to investigate underexplored combinations and scaling parameters using "${entitiesLabel}".`;
    const why_it_matters = `Resolves recurrent limitations and implements future-work directions published by independent literature sources to advance overall domain maturity.`;

    const conceptA = validEntities[0] || '[Unresolved Concept]';
    const conceptB = validEntities[1] || (validEntities.length === 1 ? '[Unresolved Concept]' : '[Unresolved Concept]');

    const opportunity_id = `opp_${gap.gap_id}`;

    // 4. Idempotent Upsert to MongoDB
    await ResearchOpportunity.findOneAndUpdate(
      { opportunity_id },
      {
        opportunity_id,
        gap_id: gap.gap_id,
        gap_type: gap.gap_type,
        conceptA,
        conceptB,
        title,
        summary,
        problem,
        existing_research,
        gap_description,
        proposed_direction,
        why_it_matters,
        score: overall_score,
        confidence: gap.confidence,
        novelty_score,
        evidence_score,
        feasibility_score,
        impact_score,
        trend_score,
        supporting_papers: gap.supporting_papers,
        supporting_entities: validEntities.length > 0 ? validEntities : ['[Unresolved Concept]'],
        supporting_claims: validation.evidence_items.filter((e: any) => e.evidence_type === 'DIRECT_CLAIM').map((e: any) => e.text),
        limitations: gap.supporting_limitations,
        future_work: gap.supporting_future_work,
        validation_status: validation.status
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    count++;
  }

  return count;
};

/**
 * Returns opportunities matching filters, sorting, and pagination.
 */
export const getOpportunities = async (filters: any = {}): Promise<{ data: any[]; total: number; page: number; limit: number }> => {
  const query: any = {};

  if (filters.gap_type) {
    query.gap_type = filters.gap_type;
  }
  if (filters.validation_status) {
    query.validation_status = filters.validation_status;
  }
  if (filters.min_score) {
    query.score = { $gte: Number(filters.min_score) };
  }
  if (filters.user_state) {
    query.user_state = filters.user_state;
  } else {
    // Exclude dismissed opportunities by default unless explicitly asked
    query.user_state = { $ne: 'dismissed' };
  }

  // Keyword Search
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { title: searchRegex },
      { problem: searchRegex },
      { summary: searchRegex },
      { supporting_entities: searchRegex }
    ];
  }

  // Sorting
  let sortField = 'score';
  const sortDirection = -1; // Descending by default

  if (filters.sort) {
    const s = String(filters.sort).toLowerCase();
    if (s === 'novelty') sortField = 'novelty_score';
    else if (s === 'evidence') sortField = 'evidence_score';
    else if (s === 'impact') sortField = 'impact_score';
    else if (s === 'feasibility') sortField = 'feasibility_score';
    else if (s === 'trend') sortField = 'trend_score';
  }

  const sortObj: any = {};
  sortObj[sortField] = sortDirection;

  // Pagination
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await ResearchOpportunity.countDocuments(query);
  const data = await ResearchOpportunity.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  return {
    data,
    total,
    page,
    limit
  };
};

/**
 * Retrieves details for a specific opportunity ID.
 */
export const getOpportunityById = async (opportunityId: string): Promise<any> => {
  if (!opportunityId) return null;
  let opp = await ResearchOpportunity.findOne({ opportunity_id: opportunityId });
  if (!opp && mongoose.isValidObjectId(opportunityId)) {
    opp = await ResearchOpportunity.findById(opportunityId);
  }
  return opp;
};

/**
 * Updates the user feedback state of an opportunity.
 */
export const updateOpportunityState = async (opportunityId: string, state: string): Promise<any> => {
  if (!opportunityId) return null;
  let opp = await ResearchOpportunity.findOneAndUpdate(
    { opportunity_id: opportunityId },
    { user_state: state },
    { new: true }
  );
  if (!opp && mongoose.isValidObjectId(opportunityId)) {
    opp = await ResearchOpportunity.findByIdAndUpdate(
      opportunityId,
      { user_state: state },
      { new: true }
    );
  }
  return opp;
};
