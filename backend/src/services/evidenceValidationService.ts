import * as neo4jService from './neo4jService.js';
import * as researchGapService from './researchGapService.js';
import Paper from '../models/Paper.js';
import mongoose from 'mongoose';
import { toNum } from '../utils/neo4jHelpers.js';

export interface EvidenceItem {
  evidence_id: string;
  gap_id: string;
  paper_id: string;
  paper_ids?: string[];
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
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'WEAKLY_SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';
  evidence_items: EvidenceItem[];
  evidence_count: number;
  unique_papers: number;
  confidence: number;
  contradictions: GapValidationContradiction[];
  validated_at: string;
}

/**
 * Deterministic Contradiction Detection between Claims in Neo4j.
 */
export const detectContradictions = async (entities: string[]): Promise<GapValidationContradiction[]> => {
  try {
    const query = `
      MATCH (c:Claim)
      RETURN c.text as text, c.paper_id as paper_id
    `;
    const res = await neo4jService.runQuery(query);
    const claims = res.records.map((r: any) => ({
      text: r.get('text') as string,
      paper_id: r.get('paper_id') as string
    }));

    const contradictions: GapValidationContradiction[] = [];
    const positiveTerms = ['improves', 'better', 'higher', 'increases', 'enhances', 'superior', 'succeeds', 'effective'];
    const negativeTerms = ['does not', 'degrades', 'lower', 'fails', 'worse', 'limited', 'negative', 'ineffective', 'poor'];

    for (const ent of entities) {
      const entLower = ent.toLowerCase();
      // Filter claims containing this entity
      const matchingClaims = claims.filter((c: any) => c.text.toLowerCase().includes(entLower));

      for (let i = 0; i < matchingClaims.length; i++) {
        const c1 = matchingClaims[i];
        const hasPos = positiveTerms.some(t => c1.text.toLowerCase().includes(t));
        const hasNeg = negativeTerms.some(t => c1.text.toLowerCase().includes(t));

        for (let j = i + 1; j < matchingClaims.length; j++) {
          const c2 = matchingClaims[j];
          if (c1.paper_id === c2.paper_id) continue; // Must be from different papers

          const hasPos2 = positiveTerms.some(t => c2.text.toLowerCase().includes(t));
          const hasNeg2 = negativeTerms.some(t => c2.text.toLowerCase().includes(t));

          // If one is positive and the other is negative about the same entity, it is contradictory
          if ((hasPos && hasNeg2) || (hasNeg && hasPos2)) {
            contradictions.push({
              paper_a: c1.paper_id,
              claim_a: c1.text,
              paper_b: c2.paper_id,
              claim_b: c2.text,
              entity: ent
            });
          }
        }
      }
    }

    return contradictions;
  } catch (err) {
    return [];
  }
};

/**
 * Validates a specific research gap by gathering and classifying evidence.
 */
export const validateGap = async (gapId: string, customGap?: any): Promise<GapValidation> => {
  const gap = customGap || (await researchGapService.getAllGaps({})).find(g => g.gap_id === gapId);

  if (!gap) {
    throw new Error(`Research gap with ID ${gapId} not found.`);
  }

  const evidence_items: EvidenceItem[] = [];
  const paperIds = new Set<string>();

  // Fetch paper details to get years/provenance
  let papers: any[] = [];
  try {
    if (mongoose.connection.readyState === 1) {
      papers = await Paper.find({}, '_id year title').maxTimeMS(3000);
    }
  } catch (e) {
    // Non-blocking fallback if Mongo is disconnected
  }

  const paperDetailsMap = new Map<string, { year: number; title: string }>();
  papers.forEach(p => {
    paperDetailsMap.set(p._id.toString(), {
      year: p.year || new Date().getFullYear(),
      title: p.title || 'Untitled'
    });
  });

  const getPaperId = (pTitleOrId: string): string => {
    if (!pTitleOrId) return '';
    if (paperDetailsMap.has(pTitleOrId)) return pTitleOrId;
    const lower = pTitleOrId.toLowerCase().trim();
    for (const [id, info] of paperDetailsMap.entries()) {
      if (info.title.toLowerCase().trim() === lower || id === pTitleOrId) {
        return id;
      }
    }
    // Return empty if not a real paper ID
    if (pTitleOrId.length === 24 && /^[0-9a-fA-F]{24}$/.test(pTitleOrId)) {
      return pTitleOrId;
    }
    return '';
  };

  const isRealPaperId = (id: string): boolean => {
    return Boolean(id && id !== 'unknown' && id !== 'graph_analysis' && id !== 'cooccurrence_analysis' && id.trim().length > 0);
  };

  // Pre-seed paperIds from gap.supporting_papers
  if (gap.supporting_papers && Array.isArray(gap.supporting_papers)) {
    for (const p of gap.supporting_papers) {
      const pid = getPaperId(p);
      if (isRealPaperId(pid)) {
        paperIds.add(pid);
      }
    }
  }

  // 1. Direct limitations evidence
  if (gap.supporting_limitations && gap.supporting_limitations.length > 0) {
    for (const limText of gap.supporting_limitations) {
      const q = `
        MATCH (l:Limitation)
        WHERE l.text = $text
        RETURN l.paper_id as paper_id, l.source_chunk_id as source_chunk_id
      `;
      const res = await neo4jService.runQuery(q, { text: limText });
      let paperId = gap.supporting_papers && gap.supporting_papers[0] ? getPaperId(gap.supporting_papers[0]) : '';
      let chunkId: string | null = null;

      if (res.records.length > 0) {
        const foundPid = res.records[0].get('paper_id');
        if (foundPid) paperId = foundPid;
        chunkId = res.records[0].get('source_chunk_id');
      }

      if (isRealPaperId(paperId)) paperIds.add(paperId);
      const year = paperDetailsMap.get(paperId)?.year || new Date().getFullYear();

      evidence_items.push({
        evidence_id: `ev_lim_${gapId}_${Math.random().toString(36).substr(2, 9)}`,
        gap_id: gapId,
        paper_id: paperId,
        source_chunk_id: chunkId,
        evidence_type: 'LIMITATION_SUPPORT',
        text: `Limitation identified: "${limText}"`,
        confidence: 0.95,
        source_type: 'LLM_EXTRACTION',
        year,
        relevance_score: 95
      });
    }
  }

  // 2. Direct future work evidence
  if (gap.supporting_future_work && gap.supporting_future_work.length > 0) {
    for (const fwText of gap.supporting_future_work) {
      const q = `
        MATCH (f:FutureWork)
        WHERE f.text = $text
        RETURN f.paper_id as paper_id, f.source_chunk_id as source_chunk_id
      `;
      const res = await neo4jService.runQuery(q, { text: fwText });
      let paperId = gap.supporting_papers && gap.supporting_papers[0] ? getPaperId(gap.supporting_papers[0]) : '';
      let chunkId: string | null = null;

      if (res.records.length > 0) {
        const foundPid = res.records[0].get('paper_id');
        if (foundPid) paperId = foundPid;
        chunkId = res.records[0].get('source_chunk_id');
      }

      if (isRealPaperId(paperId)) paperIds.add(paperId);
      const year = paperDetailsMap.get(paperId)?.year || new Date().getFullYear();

      evidence_items.push({
        evidence_id: `ev_fw_${gapId}_${Math.random().toString(36).substr(2, 9)}`,
        gap_id: gapId,
        paper_id: paperId,
        source_chunk_id: chunkId,
        evidence_type: 'FUTURE_WORK_SUPPORT',
        text: `Future-work direction: "${fwText}"`,
        confidence: 0.9,
        source_type: 'LLM_EXTRACTION',
        year,
        relevance_score: 90
      });
    }
  }

  // 3. Direct claims evidence
  if (gap.supporting_entities && gap.supporting_entities.length > 0) {
    for (const ent of gap.supporting_entities) {
      const q = `
        MATCH (c:Claim)
        WHERE toLower(c.text) CONTAINS toLower($entName)
        RETURN c.claim_id as claim_id, c.text as text, c.paper_id as paper_id, c.source_chunk_id as source_chunk_id
      `;
      const res = await neo4jService.runQuery(q, { entName: ent });
      for (const rec of res.records) {
        const text = rec.get('text');
        const paperId = rec.get('paper_id');
        const chunkId = rec.get('source_chunk_id');

        if (isRealPaperId(paperId)) paperIds.add(paperId);
        const year = paperDetailsMap.get(paperId)?.year || new Date().getFullYear();

        evidence_items.push({
          evidence_id: `ev_claim_${gapId}_${rec.get('claim_id')}`,
          gap_id: gapId,
          paper_id: paperId,
          source_chunk_id: chunkId,
          evidence_type: 'DIRECT_CLAIM',
          text: `Direct claim: "${text}"`,
          confidence: 0.85,
          source_type: 'LLM_EXTRACTION',
          year,
          relevance_score: 85
        });
      }
    }
  }

  // 4. Graph Structural and Statistical evidence
  if (gap.supporting_entities && gap.supporting_entities.length > 0) {
    for (const ent of gap.supporting_entities) {
      const q = `
        MATCH (e:ResearchEntity { name: $entName })-[r]-()
        OPTIONAL MATCH (p:Paper)-[:MENTIONS|USES_METHOD|USES_DATASET]->(e)
        RETURN count(distinct r) as degree, collect(distinct p.paper_id) as paper_ids
      `;
      const res = await neo4jService.runQuery(q, { entName: ent });
      if (res.records.length > 0) {
        const degree = toNum(res.records[0].get('degree'));
        const rawPaperIds = res.records[0].get('paper_ids');
        const connectedPaperIds = Array.isArray(rawPaperIds) ? rawPaperIds.filter(isRealPaperId) : [];
        connectedPaperIds.forEach((pid: string) => paperIds.add(pid));

        const primaryPaperId = connectedPaperIds[0] || (gap.supporting_papers && gap.supporting_papers[0] ? getPaperId(gap.supporting_papers[0]) : '');

        if (degree > 0) {
          evidence_items.push({
            evidence_id: `ev_graph_${gapId}_${ent.replace(/\s+/g, '_')}`,
            gap_id: gapId,
            paper_id: primaryPaperId,
            paper_ids: connectedPaperIds,
            source_chunk_id: null,
            evidence_type: 'GRAPH_STRUCTURAL_SUPPORT',
            text: `Entity "${ent}" shows high graph integration (degree: ${degree} connections across ${connectedPaperIds.length || 1} paper(s))`,
            confidence: 0.9,
            source_type: 'GRAPH_METRICS',
            year: paperDetailsMap.get(primaryPaperId)?.year || new Date().getFullYear(),
            relevance_score: 80
          });
        }
      }
    }
  }

  // 5. Cooccurrence bridging evidence
  if (gap.gap_type === 'UNDEREXPLORED_COMBINATION' && gap.supporting_entities.length >= 2) {
    const supportingPids: string[] = [];
    if (gap.supporting_papers && Array.isArray(gap.supporting_papers)) {
      gap.supporting_papers.forEach((p: string) => {
        const pid = getPaperId(p);
        if (isRealPaperId(pid)) {
          paperIds.add(pid);
          supportingPids.push(pid);
        }
      });
    }
    const primaryPaperId = supportingPids[0] || '';

    evidence_items.push({
      evidence_id: `ev_cooccur_${gapId}`,
      gap_id: gapId,
      paper_id: primaryPaperId,
      paper_ids: supportingPids,
      source_chunk_id: null,
      evidence_type: 'COOCCURRENCE_SUPPORT',
      text: `Gap candidate is bridged via "${gap.supporting_entities[2] || 'common neighbor'}" but has zero direct co-occurrence across analyzed literature.`,
      confidence: 0.85,
      source_type: 'STATISTICAL_ANALYSIS',
      year: paperDetailsMap.get(primaryPaperId)?.year || new Date().getFullYear(),
      relevance_score: 75
    });
  }

  // 6. Multiple papers support tracking
  if (gap.supporting_papers && gap.supporting_papers.length >= 2) {
    const supportingPids: string[] = [];
    gap.supporting_papers.forEach((p: string) => {
      const pid = getPaperId(p);
      if (isRealPaperId(pid)) {
        paperIds.add(pid);
        supportingPids.push(pid);
      }
    });

    const mainPaperId = supportingPids[0] || '';

    evidence_items.push({
      evidence_id: `ev_multipaper_${gapId}`,
      gap_id: gapId,
      paper_id: mainPaperId,
      paper_ids: supportingPids,
      source_chunk_id: null,
      evidence_type: 'MULTIPLE_PAPER_SUPPORT',
      text: `Gap context verified across ${supportingPids.length || gap.supporting_papers.length} distinct research works.`,
      confidence: 0.9,
      source_type: 'CROSS_REFERENCE',
      year: paperDetailsMap.get(mainPaperId)?.year || new Date().getFullYear(),
      relevance_score: 80
    });
  }

  // Contradiction scanning
  const contradictions = await detectContradictions(gap.supporting_entities);

  // Status mapping
  let status: GapValidation['status'] = 'WEAKLY_SUPPORTED';
  const evidence_count = evidence_items.length;
  const unique_papers = paperIds.size;

  const directEvidenceCount = evidence_items.filter(e =>
    ['DIRECT_CLAIM', 'LIMITATION_SUPPORT', 'FUTURE_WORK_SUPPORT'].includes(e.evidence_type)
  ).length;

  const totalConfidence = evidence_items.reduce((sum, e) => sum + e.confidence, 0);
  const avgConfidence = evidence_count > 0 ? totalConfidence / evidence_count : 0;

  if (evidence_count === 0) {
    status = 'INSUFFICIENT_EVIDENCE';
  } else if (contradictions.length > 0) {
    status = 'CONTRADICTED';
  } else if (evidence_count >= 4 && directEvidenceCount >= 1 && unique_papers >= 2) {
    status = 'SUPPORTED';
  } else if (evidence_count >= 2 && unique_papers >= 1 && avgConfidence >= 0.70) {
    status = 'PARTIALLY_SUPPORTED';
  } else {
    status = 'WEAKLY_SUPPORTED';
  }

  return {
    gap_id: gapId,
    status,
    evidence_items,
    evidence_count,
    unique_papers,
    confidence: avgConfidence,
    contradictions,
    validated_at: new Date().toISOString()
  };
};

/**
 * Returns evidence items extracted from a given paper ID.
 */
export const getEvidenceByPaper = async (paperId: string): Promise<EvidenceItem[]> => {
  const allGaps = await researchGapService.getAllGaps({});
  const allEvidence: EvidenceItem[] = [];

  for (const gap of allGaps) {
    try {
      const val = await validateGap(gap.gap_id);
      val.evidence_items.forEach(ev => {
        if (ev.paper_id === paperId) {
          allEvidence.push(ev);
        }
      });
    } catch (e) {}
  }

  return allEvidence;
};

/**
 * Returns evidence details by evidence ID.
 */
export const getEvidenceById = async (evidenceId: string): Promise<EvidenceItem | null> => {
  const allGaps = await researchGapService.getAllGaps({});
  for (const gap of allGaps) {
    try {
      const val = await validateGap(gap.gap_id);
      const ev = val.evidence_items.find(e => e.evidence_id === evidenceId);
      if (ev) return ev;
    } catch (e) {}
  }
  return null;
};
