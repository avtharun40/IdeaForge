import * as neo4jService from './neo4jService.js';
import Paper from '../models/Paper.js';
import { toNum } from '../utils/neo4jHelpers.js';

export interface EntityFrequency {
  entity_id: string;
  entity_name: string;
  label: string;
  type: string;
  paper_count: number;
  occurrence_count: number;
}

export interface CooccurrenceSignal {
  entity_a_id: string;
  entity_a_name: string;
  entity_a_type: string;
  entity_b_id: string;
  entity_b_name: string;
  entity_b_type: string;
  cooccurrence_count: number;
  paper_count: number;
  pmi: number;
  npmi: number;
}

export interface TemporalTrend {
  entity_id: string;
  entity_name: string;
  type: string;
  total_paper_count: number;
  recent_count: number;
  first_appearance: number;
  latest_appearance: number;
  slope: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'EMERGING' | 'DECLINING' | 'INSUFFICIENT_DATA';
  score: number;
  year_data: Record<number, number>;
}

export interface CrossDomainSignal {
  entity_id: string;
  entity_name: string;
  type: string;
  domain_count: number;
  paper_count: number;
  relationship_count: number;
  domains: string[];
}

export interface BridgeEntitySignal {
  entity_id: string;
  entity_name: string;
  type: string;
  degree: number;
  domain_count: number;
  diversity: number;
  score: number;
}

export interface ResearchSignal {
  signal_id: string;
  signal_type: 'frequency' | 'cooccurrence' | 'trend' | 'cross-domain' | 'bridge';
  entity_id: string;
  entity_name: string;
  score: number;
  confidence: number;
  paper_count: number;
  cooccurrence_count?: number;
  trend?: string;
  year_data?: Record<number, number>;
  supporting_papers: string[];
  supporting_relationships: string[];
  metadata?: any;
}

/**
 * Calculates linear regression slope for count vs year.
 */
export const calculateSlope = (yearData: Record<number, number>): number => {
  const years = Object.keys(yearData).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return 0;
  
  const n = years.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  years.forEach(year => {
    const count = yearData[year];
    sumX += year;
    sumY += count;
    sumXY += year * count;
    sumXX += year * year;
  });
  
  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
};

/**
 * Helper to fetch a map of Paper ID -> researchArea & year from MongoDB.
 */
const getMongoPapersMap = async () => {
  const papers = await Paper.find({}, '_id researchArea year title');
  const papersMap = new Map<string, { domain: string; year: number; title: string }>();
  papers.forEach(p => {
    papersMap.set(p._id.toString(), {
      domain: p.researchArea || 'General',
      year: p.year || new Date().getFullYear(),
      title: p.title
    });
  });
  return papersMap;
};

/**
 * 1. Calculates Entity Frequencies with filtering options.
 */
export const getEntityFrequency = async (filters: any = {}): Promise<EntityFrequency[]> => {
  const { type, entity, domain, year } = filters;

  const whereClauses: string[] = ['(n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork)'];
  const params: any = {};

  if (type) {
    const typeUpper = String(type).toUpperCase();
    if (['CONCEPT', 'METHOD', 'DATASET', 'PROBLEM', 'MODEL', 'DOMAIN'].includes(typeUpper)) {
      whereClauses.push('n.type = $type');
      params.type = typeUpper;
    } else {
      whereClauses.push('labels(n)[0] = $label');
      params.label = type;
    }
  }

  if (entity) {
    whereClauses.push('(toLower(n.name) CONTAINS toLower($entity) OR toLower(n.text) CONTAINS toLower($entity))');
    params.entity = entity;
  }

  let paperMatch = 'OPTIONAL MATCH (p:Paper)-[r]->(n)';
  const paperWhere: string[] = [];

  if (year) {
    paperWhere.push('p.year = $year');
    params.year = Number(year);
  }

  if (domain) {
    const matchingPapers = await Paper.find({ researchArea: new RegExp(String(domain), 'i') }, '_id');
    const paperIds = matchingPapers.map(p => p._id.toString());
    paperWhere.push('p.paper_id IN $paperIds');
    params.paperIds = paperIds;
  }

  if (paperWhere.length > 0) {
    paperMatch = `MATCH (p:Paper)-[r]->(n) WHERE ${paperWhere.join(' AND ')}`;
  }

  const query = `
    MATCH (n)
    WHERE ${whereClauses.join(' AND ')}
    ${paperMatch}
    RETURN coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as entity_id,
           coalesce(n.name, n.text) as entity_name,
           labels(n)[0] as label,
           coalesce(n.type, labels(n)[0]) as type,
           count(distinct p) as paper_count,
           count(r) as occurrence_count
    ORDER BY paper_count DESC, occurrence_count DESC
  `;

  const result = await neo4jService.runQuery(query, params);
  return result.records.map((rec: any) => ({
    entity_id: rec.get('entity_id'),
    entity_name: rec.get('entity_name') || 'Unnamed Entity',
    label: rec.get('label'),
    type: rec.get('type') || 'Unknown',
    paper_count: toNum(rec.get('paper_count')),
    occurrence_count: toNum(rec.get('occurrence_count'))
  }));
};

/**
 * 2. Calculates Entity Co-occurrence with PMI & NPMI.
 */
export const getCooccurrences = async (filters: any = {}): Promise<CooccurrenceSignal[]> => {
  const { year, domain, limit } = filters;

  // Fetch N
  const totalPapersRes = await neo4jService.runQuery('MATCH (p:Paper) RETURN count(p) as total');
  const N = totalPapersRes.records.length > 0 ? toNum(totalPapersRes.records[0].get('total')) : 0;

  if (N === 0) return [];

  // Fetch individual frequencies to compute probabilities
  const freqs = await getEntityFrequency(filters);
  const freqMap = new Map<string, number>();
  freqs.forEach(f => freqMap.set(f.entity_id, f.paper_count));

  let paperFilter = '';
  const params: any = {};

  if (year) {
    paperFilter += ' AND p.year = $year';
    params.year = Number(year);
  }

  if (domain) {
    const matchingPapers = await Paper.find({ researchArea: new RegExp(String(domain), 'i') }, '_id');
    const paperIds = matchingPapers.map(p => p._id.toString());
    paperFilter += ' AND p.paper_id IN $paperIds';
    params.paperIds = paperIds;
  }

  const query = `
    MATCH (p:Paper)-[]->(n1)
    MATCH (p)-[]->(n2)
    WHERE (n1:ResearchEntity OR n1:Claim OR n1:Limitation OR n1:FutureWork)
      AND (n2:ResearchEntity OR n2:Claim OR n2:Limitation OR n2:FutureWork)
      AND coalesce(n1.entity_id, n1.claim_id, n1.limitation_id, n1.future_work_id) < coalesce(n2.entity_id, n2.claim_id, n2.limitation_id, n2.future_work_id)
      ${paperFilter}
    RETURN coalesce(n1.entity_id, n1.claim_id, n1.limitation_id, n1.future_work_id) as entity_a_id,
           coalesce(n1.name, n1.text) as entity_a_name,
           coalesce(n1.type, labels(n1)[0]) as entity_a_type,
           coalesce(n2.entity_id, n2.claim_id, n2.limitation_id, n2.future_work_id) as entity_b_id,
           coalesce(n2.name, n2.text) as entity_b_name,
           coalesce(n2.type, labels(n2)[0]) as entity_b_type,
           count(distinct p) as cooccurrence_count
    ORDER BY cooccurrence_count DESC
  `;

  const result = await neo4jService.runQuery(query, params);
  const signals: CooccurrenceSignal[] = [];

  result.records.forEach((rec: any) => {
    const entity_a_id = rec.get('entity_a_id');
    const entity_b_id = rec.get('entity_b_id');
    const cooccurrence_count = toNum(rec.get('cooccurrence_count'));

    const freqA = freqMap.get(entity_a_id) || cooccurrence_count;
    const freqB = freqMap.get(entity_b_id) || cooccurrence_count;

    // Probability calculations with Laplace-style safety
    const pA = freqA / N;
    const pB = freqB / N;
    const pAB = cooccurrence_count / N;

    let pmi = 0;
    let npmi = -1;

    if (pA > 0 && pB > 0 && pAB > 0) {
      pmi = Math.log2(pAB / (pA * pB));
      const denominator = -Math.log2(pAB);
      if (denominator === 0) {
        npmi = pmi > 0 ? 1 : -1;
      } else {
        npmi = pmi / denominator;
      }
      npmi = Math.max(-1, Math.min(1, npmi));
    }

    signals.push({
      entity_a_id,
      entity_a_name: rec.get('entity_a_name') || 'Unnamed Entity',
      entity_a_type: rec.get('entity_a_type') || 'Unknown',
      entity_b_id,
      entity_b_name: rec.get('entity_b_name') || 'Unnamed Entity',
      entity_b_type: rec.get('entity_b_type') || 'Unknown',
      cooccurrence_count,
      paper_count: cooccurrence_count,
      pmi: Number.isFinite(pmi) ? pmi : 0,
      npmi: Number.isFinite(npmi) ? npmi : 0
    });
  });

  const parsedLimit = Number(limit);
  if (parsedLimit > 0) {
    return signals.slice(0, parsedLimit);
  }
  return signals;
};

/**
 * 3. Calculates Temporal Research Trends.
 */
export const getTrends = async (filters: any = {}): Promise<TemporalTrend[]> => {
  const currentYear = new Date().getFullYear();

  // Query all paper-entity pairs by year
  const query = `
    MATCH (p:Paper)-[]->(n)
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as entity_id,
           coalesce(n.name, n.text) as entity_name,
           coalesce(n.type, labels(n)[0]) as type,
           p.year as year,
           count(distinct p) as count
  `;

  const result = await neo4jService.runQuery(query);
  const groupings = new Map<string, { name: string; type: string; data: Record<number, number> }>();
  const allYears = new Set<number>();

  result.records.forEach((rec: any) => {
    const id = rec.get('entity_id');
    const name = rec.get('entity_name');
    const type = rec.get('type');
    const year = toNum(rec.get('year'), currentYear);
    const count = toNum(rec.get('count'));

    allYears.add(year);

    if (!groupings.has(id)) {
      groupings.set(id, { name, type, data: {} });
    }
    groupings.get(id)!.data[year] = count;
  });

  const trends: TemporalTrend[] = [];

  groupings.forEach((val, id) => {
    // Fill in zeros for missing years
    const year_data: Record<number, number> = {};
    allYears.forEach(y => {
      year_data[y] = val.data[y] || 0;
    });

    const activeYears = Object.keys(val.data).map(Number).filter(y => val.data[y] > 0);
    const total_paper_count = activeYears.reduce((sum, y) => sum + (val.data[y] || 0), 0);

    const first_appearance = activeYears.length > 0 ? Math.min(...activeYears) : currentYear;
    const latest_appearance = activeYears.length > 0 ? Math.max(...activeYears) : currentYear;

    // Linear regression slope
    const slope = calculateSlope(year_data);

    // Recent count (last 3 years)
    const recent_count = Object.keys(year_data)
      .map(Number)
      .filter(y => y >= currentYear - 2)
      .reduce((sum, y) => sum + year_data[y], 0);

    // Trend classification
    let trend: TemporalTrend['trend'] = 'STABLE';
    if (total_paper_count < 3 || activeYears.length < 2) {
      trend = 'INSUFFICIENT_DATA';
    } else if (slope > 0.15 && first_appearance >= currentYear - 1) {
      trend = 'EMERGING';
    } else if (slope < -0.15 && latest_appearance < currentYear - 1) {
      trend = 'DECLINING';
    } else if (slope > 0.15) {
      trend = 'INCREASING';
    } else if (slope < -0.15) {
      trend = 'DECREASING';
    }

    // Transparent Trend Score Formula
    // score = (recent_count * 5) + (slope * 15) + (total_paper_count * 2)
    const rawScore = (recent_count * 5) + (slope * 15) + (total_paper_count * 2);
    const score = trend === 'INSUFFICIENT_DATA' ? 0 : Math.max(0, Math.min(100, Math.round(rawScore)));

    trends.push({
      entity_id: id,
      entity_name: val.name || 'Unnamed Entity',
      type: val.type || 'Unknown',
      total_paper_count,
      recent_count,
      first_appearance,
      latest_appearance,
      slope,
      trend,
      score,
      year_data
    });
  });

  return trends.sort((a, b) => b.score - a.score);
};

/**
 * 4. Identifies entities connecting multiple research domains.
 */
export const getCrossDomains = async (): Promise<CrossDomainSignal[]> => {
  const papersMap = await getMongoPapersMap();

  // Find all entity-to-paper links
  const query = `
    MATCH (p:Paper)-[]->(n)
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as entity_id,
           coalesce(n.name, n.text) as entity_name,
           coalesce(n.type, labels(n)[0]) as type,
           collect(distinct p.paper_id) as paper_ids,
           count(distinct p) as paper_count
  `;

  const result = await neo4jService.runQuery(query);

  // Fetch degree/relationship counts for entities
  const degreeRes = await neo4jService.runQuery(`
    MATCH (n)-[r]-()
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as entity_id,
           count(r) as degree
  `);
  
  const degreeMap = new Map<string, number>();
  degreeRes.records.forEach((rec: any) => {
    degreeMap.set(rec.get('entity_id'), toNum(rec.get('degree')));
  });

  const crossDomains: CrossDomainSignal[] = [];

  result.records.forEach((rec: any) => {
    const id = rec.get('entity_id');
    const paperIds: string[] = rec.get('paper_ids');
    const paper_count = toNum(rec.get('paper_count'));

    // Map paper IDs to domains
    const domainsSet = new Set<string>();
    paperIds.forEach(pid => {
      const pInfo = papersMap.get(pid);
      if (pInfo) domainsSet.add(pInfo.domain);
    });

    const domains = Array.from(domainsSet);
    const domain_count = domains.length;

    if (domain_count >= 2) {
      crossDomains.push({
        entity_id: id,
        entity_name: rec.get('entity_name') || 'Unnamed Entity',
        type: rec.get('type') || 'Unknown',
        domain_count,
        paper_count,
        relationship_count: degreeMap.get(id) || 0,
        domains
      });
    }
  });

  return crossDomains.sort((a, b) => b.domain_count - a.domain_count);
};

/**
 * 5. Identifies Bridge Entities connecting otherwise separate areas of the graph.
 */
export const getBridgeEntities = async (): Promise<BridgeEntitySignal[]> => {
  const papersMap = await getMongoPapersMap();

  // Query relationships degree and types diversity in Neo4j
  const query = `
    MATCH (n)-[r]-()
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as entity_id,
           coalesce(n.name, n.text) as entity_name,
           coalesce(n.type, labels(n)[0]) as type,
           count(r) as degree,
           count(distinct type(r)) as diversity,
           collect(distinct r.paper_id) as paper_ids
  `;

  const result = await neo4jService.runQuery(query);
  const bridges: BridgeEntitySignal[] = [];

  result.records.forEach((rec: any) => {
    const id = rec.get('entity_id');
    const degree = toNum(rec.get('degree'));
    const diversity = toNum(rec.get('diversity'));
    const paperIds: string[] = rec.get('paper_ids').filter(Boolean);

    // Calculate domain count
    const domainsSet = new Set<string>();
    paperIds.forEach(pid => {
      const pInfo = papersMap.get(pid);
      if (pInfo) domainsSet.add(pInfo.domain);
    });
    const domain_count = domainsSet.size || 1;

    // Bridge Score Formula
    // score = (degree * 2) + (domain_count * 10) + (diversity * 5)
    const score = (degree * 2) + (domain_count * 10) + (diversity * 5);

    bridges.push({
      entity_id: id,
      entity_name: rec.get('entity_name') || 'Unnamed Entity',
      type: rec.get('type') || 'Unknown',
      degree,
      domain_count,
      diversity,
      score
    });
  });

  return bridges.sort((a, b) => b.score - a.score);
};

/**
 * 6. Returns a generalized list of ResearchSignal model structures.
 */
export const getAllSignals = async (filters: any = {}): Promise<ResearchSignal[]> => {
  const typeFilter = filters.type;
  
  const frequencies = await getEntityFrequency(filters);
  const trends = await getTrends(filters);
  const crossDomains = await getCrossDomains();
  const bridges = await getBridgeEntities();

  const signals: ResearchSignal[] = [];

  // 1. Add frequency signals
  frequencies.forEach(f => {
    signals.push({
      signal_id: `sig_freq_${f.entity_id}`,
      signal_type: 'frequency',
      entity_id: f.entity_id,
      entity_name: f.entity_name,
      score: f.paper_count,
      confidence: 1.0,
      paper_count: f.paper_count,
      supporting_papers: [], // Will populate below if needed
      supporting_relationships: [],
      metadata: {
        occurrence_count: f.occurrence_count,
        label: f.label,
        type: f.type
      }
    });
  });

  // 2. Add trend signals
  trends.forEach(t => {
    signals.push({
      signal_id: `sig_trend_${t.entity_id}`,
      signal_type: 'trend',
      entity_id: t.entity_id,
      entity_name: t.entity_name,
      score: t.score,
      confidence: 1.0,
      paper_count: t.total_paper_count,
      trend: t.trend,
      year_data: t.year_data,
      supporting_papers: [],
      supporting_relationships: [],
      metadata: {
        recent_count: t.recent_count,
        first_appearance: t.first_appearance,
        latest_appearance: t.latest_appearance,
        slope: t.slope,
        type: t.type
      }
    });
  });

  // 3. Add cross-domain signals
  crossDomains.forEach(cd => {
    signals.push({
      signal_id: `sig_xdom_${cd.entity_id}`,
      signal_type: 'cross-domain',
      entity_id: cd.entity_id,
      entity_name: cd.entity_name,
      score: cd.domain_count * 10,
      confidence: 0.9,
      paper_count: cd.paper_count,
      supporting_papers: [],
      supporting_relationships: [],
      metadata: {
        domains: cd.domains,
        domain_count: cd.domain_count,
        relationship_count: cd.relationship_count,
        type: cd.type
      }
    });
  });

  // 4. Add bridge signals
  bridges.forEach(b => {
    signals.push({
      signal_id: `sig_bridge_${b.entity_id}`,
      signal_type: 'bridge',
      entity_id: b.entity_id,
      entity_name: b.entity_name,
      score: b.score,
      confidence: 0.95,
      paper_count: b.domain_count,
      supporting_papers: [],
      supporting_relationships: [],
      metadata: {
        degree: b.degree,
        domain_count: b.domain_count,
        diversity: b.diversity,
        type: b.type
      }
    });
  });

  // Filter signals list based on type query
  let filtered = signals;
  if (typeFilter) {
    filtered = signals.filter(s => s.signal_type === typeFilter);
  }

  // Handle pagination limits
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const startIdx = (page - 1) * limit;

  return filtered.slice(startIdx, startIdx + limit);
};
