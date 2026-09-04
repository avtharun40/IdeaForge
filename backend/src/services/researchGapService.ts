import * as neo4jService from './neo4jService.js';
import * as researchSignalService from './researchSignalService.js';
import Paper from '../models/Paper.js';
import { toNum } from '../utils/neo4jHelpers.js';

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

/**
 * Calculates a standard Jaccard word overlap to group/cluster strings (e.g. limitations, future work).
 */
const getWordOverlap = (str1: string, str2: string): number => {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4); // Filter out short stop-words/connectors

  const w1 = new Set(normalize(str1));
  const w2 = new Set(normalize(str2));
  if (w1.size === 0 || w2.size === 0) return 0;

  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return intersection.size / union.size;
};

/**
 * Helper to fetch paper title/info from MongoDB by ID.
 */
const getPaperDetailsMap = async () => {
  const papers = await Paper.find({}, '_id title researchArea year');
  const detailsMap = new Map<string, { title: string; domain: string; year?: number }>();
  papers.forEach(p => {
    detailsMap.set(p._id.toString(), {
      title: p.title || 'Untitled Paper',
      domain: p.researchArea || 'General',
      year: p.year
    });
  });
  return detailsMap;
};

/**
 * 1. Detect Low Coverage Gaps
 */
export const detectLowCoverageGaps = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (e:ResearchEntity)
    OPTIONAL MATCH (p:Paper)-[r]->(e)
    WITH e, count(distinct p) as paper_count, count(r) as degree
    WHERE degree >= 2 AND paper_count <= 2
    RETURN e.entity_id as entity_id, e.name as entity_name, e.type as type, paper_count, degree
    ORDER BY degree DESC
  `;
  const result = await neo4jService.runQuery(query);
  const gaps: ResearchGap[] = [];

  for (const rec of result.records) {
    const entity_id = rec.get('entity_id');
    const name = rec.get('entity_name');
    const type = rec.get('type');
    const paper_count = toNum(rec.get('paper_count'));
    const degree = toNum(rec.get('degree'));

    // Find supporting papers
    const papersQuery = `
      MATCH (p:Paper)-[]->(e:ResearchEntity { entity_id: $entity_id })
      RETURN p.paper_id as paper_id
    `;
    const papersRes = await neo4jService.runQuery(papersQuery, { entity_id });
    const supporting_papers: string[] = papersRes.records.map((r: any) => {
      const pId = r.get('paper_id');
      return papersMap.get(pId)?.title || pId;
    });

    const deficit = degree - paper_count;
    const score = Math.min(100, Math.round(deficit * 20 + 35));
    const confidence = Math.min(0.95, 0.7 + (degree * 0.05));

    gaps.push({
      gap_id: `gap_low_cov_${entity_id}`,
      gap_type: 'LOW_COVERAGE',
      title: `Low literature coverage of established ${type.toLowerCase()} "${name}"`,
      description: `The research concept "${name}" has a high degree of integration inside the literature graph (degree: ${degree}) but has been directly investigated in only ${paper_count} paper(s). This indicates a significant coverage deficit where the concept is frequently referenced as context but rarely studied as a primary subject.`,
      score,
      confidence,
      supporting_entities: [name],
      supporting_papers,
      supporting_signals: [`sig_freq_${entity_id}`],
      supporting_limitations: [],
      supporting_future_work: [],
      evidence_count: degree,
      created_at: new Date().toISOString()
    });
  }

  return gaps;
};

/**
 * 2. Detect Underexplored Combinations
 */
export const detectUnderexploredCombinations = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (e1:ResearchEntity)-[]-(e3:ResearchEntity)-[]-(e2:ResearchEntity)
    WHERE e1.entity_id < e2.entity_id
      AND e1.type IN ['CONCEPT', 'METHOD', 'DATASET']
      AND e2.type IN ['CONCEPT', 'METHOD', 'DATASET']
    OPTIONAL MATCH (p1:Paper)-[]->(e1)
    WITH e1, e2, e3, count(distinct p1) as e1_papers
    OPTIONAL MATCH (p2:Paper)-[]->(e2)
    WITH e1, e2, e3, e1_papers, count(distinct p2) as e2_papers
    OPTIONAL MATCH (p3:Paper) WHERE (p3)-[]->(e1) AND (p3)-[]->(e2)
    WITH e1, e2, e3, e1_papers, e2_papers, count(distinct p3) as cooccur_papers
    WHERE cooccur_papers = 0 AND e1_papers >= 2 AND e2_papers >= 2
    RETURN e1.entity_id as e1_id, e1.name as e1_name, e1.type as e1_type, e1_papers,
           e2.entity_id as e2_id, e2.name as e2_name, e2.type as e2_type, e2_papers,
           e3.entity_id as bridge_id, e3.name as bridge_name
    LIMIT 20
  `;
  const result = await neo4jService.runQuery(query);
  const gaps: ResearchGap[] = [];

  for (const rec of result.records) {
    const e1_id = rec.get('e1_id');
    const e1_name = rec.get('e1_name');
    const e1_papers = toNum(rec.get('e1_papers'));
    const e2_id = rec.get('e2_id');
    const e2_name = rec.get('e2_name');
    const e2_papers = toNum(rec.get('e2_papers'));
    const bridge_name = rec.get('bridge_name');

    // Expected papers associated with either
    const papersQuery = `
      MATCH (p:Paper)-[]->(e)
      WHERE e.entity_id IN [$e1_id, $e2_id]
      RETURN DISTINCT p.paper_id as paper_id
    `;
    const papersRes = await neo4jService.runQuery(papersQuery, { e1_id, e2_id });
    const supporting_papers = papersRes.records.map((r: any) => {
      const pId = r.get('paper_id');
      return papersMap.get(pId)?.title || pId;
    });

    const average_activity = (e1_papers + e2_papers) / 2;
    const score = Math.min(100, Math.round(average_activity * 12 + 45));
    const confidence = 0.85;

    gaps.push({
      gap_id: `gap_comb_${e1_id}_${e2_id}`,
      gap_type: 'UNDEREXPLORED_COMBINATION',
      title: `Underexplored combination: "${e1_name}" and "${e2_name}"`,
      description: `Both "${e1_name}" (${e1_papers} papers) and "${e2_name}" (${e2_papers} papers) display active individual research within the literature graph, sharing a common connection point through "${bridge_name}". However, they have zero direct same-paper co-occurrences, representing a prime candidate for underexplored conceptual synthesis.`,
      score,
      confidence,
      supporting_entities: [e1_name, e2_name, bridge_name],
      supporting_papers,
      supporting_signals: [`sig_freq_${e1_id}`, `sig_freq_${e2_id}`],
      supporting_limitations: [],
      supporting_future_work: [],
      evidence_count: e1_papers + e2_papers,
      created_at: new Date().toISOString()
    });
  }

  return gaps;
};

/**
 * 3. Detect Cross-Domain Gaps
 */
export const detectCrossDomainGaps = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const xdomains = await researchSignalService.getCrossDomains();
  const gaps: ResearchGap[] = [];

  // Filter cross-domain bridges with low coverage
  const candidates = xdomains.filter(cd => cd.paper_count <= 3);

  for (const cd of candidates) {
    const { entity_id, entity_name, type, domains, paper_count, relationship_count } = cd;

    const papersQuery = `
      MATCH (p:Paper)-[]->(e:ResearchEntity { entity_id: $entity_id })
      RETURN p.paper_id as paper_id
    `;
    const papersRes = await neo4jService.runQuery(papersQuery, { entity_id });
    const supporting_papers = papersRes.records.map((r: any) => {
      const pId = r.get('paper_id');
      return papersMap.get(pId)?.title || pId;
    });

    const score = Math.min(100, Math.round((5 - paper_count) * 12 + 50));
    const confidence = 0.8;

    gaps.push({
      gap_id: `gap_xdom_${entity_id}`,
      gap_type: 'CROSS_DOMAIN',
      title: `Underexplored cross-domain bridge of "${entity_name}"`,
      description: `The ${type.toLowerCase()} "${entity_name}" functions as a connection point across multiple research domains (${domains.join(', ')}), but contains low direct literature coverage (found in only ${paper_count} paper(s) with ${relationship_count} graph connections). This represents an underexplored cross-domain connection candidate.`,
      score,
      confidence,
      supporting_entities: [entity_name],
      supporting_papers,
      supporting_signals: [`sig_xdom_${entity_id}`],
      supporting_limitations: [],
      supporting_future_work: [],
      evidence_count: domains.length,
      created_at: new Date().toISOString()
    });
  }

  return gaps;
};

/**
 * 4. Detect Repeated Limitations
 */
export const detectRepeatedLimitations = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (l:Limitation)
    OPTIONAL MATCH (p:Paper { paper_id: l.paper_id })-[:MENTIONS|USES_METHOD|USES_DATASET]->(e:ResearchEntity)
    RETURN l.limitation_id as id, l.text as text, l.paper_id as paper_id,
           collect(distinct { name: e.name, normalized_name: e.normalized_name, type: e.type }) as entities
  `;
  const result = await neo4jService.runQuery(query);
  const limitations = result.records.map((rec: any) => {
    const rawEntities = rec.get('entities');
    const entities = Array.isArray(rawEntities) ? rawEntities.filter((e: any) => e && e.name) : [];
    return {
      id: rec.get('id'),
      text: rec.get('text'),
      paper_id: rec.get('paper_id'),
      entities
    };
  });

  const clusters: typeof limitations[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < limitations.length; i++) {
    if (visited.has(limitations[i].id)) continue;
    const currentCluster = [limitations[i]];
    visited.add(limitations[i].id);

    for (let j = i + 1; j < limitations.length; j++) {
      if (visited.has(limitations[j].id)) continue;
      // If limitations share word overlap or belong to different papers and look highly similar
      const overlap = getWordOverlap(limitations[i].text, limitations[j].text);
      if (overlap >= 0.15) {
        currentCluster.push(limitations[j]);
        visited.add(limitations[j].id);
      }
    }

    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }
  }

  const gaps: ResearchGap[] = [];

  clusters.forEach((cluster, idx) => {
    const textSample = cluster[0].text;
    const paperIds: string[] = Array.from(new Set(cluster.map((c: any) => c.paper_id)));
    const supporting_papers = paperIds.map((pid: string) => papersMap.get(pid)?.title || pid);

    const score = Math.min(100, Math.round(cluster.length * 15 + 50));
    const confidence = 0.9;

    // Resolve supporting entities for limitation cluster
    const clusterTexts = cluster.map((c: any) => c.text.toLowerCase()).join(' ');
    const allEntities = cluster.flatMap((c: any) => c.entities || []);
    const uniqueEntitiesMap = new Map<string, any>();
    allEntities.forEach((e: any) => {
      if (e && e.name && !uniqueEntitiesMap.has(e.name)) {
        uniqueEntitiesMap.set(e.name, e);
      }
    });

    let supporting_entities = Array.from(uniqueEntitiesMap.values())
      .filter((e: any) =>
        clusterTexts.includes(e.name.toLowerCase()) ||
        (e.normalized_name && clusterTexts.includes(e.normalized_name.toLowerCase()))
      )
      .map((e: any) => e.name);

    if (supporting_entities.length === 0 && uniqueEntitiesMap.size > 0) {
      const sorted = Array.from(uniqueEntitiesMap.values()).sort((a: any, b: any) => {
        const typeOrder: Record<string, number> = { METHOD: 1, CONCEPT: 2, DATASET: 3 };
        return (typeOrder[a?.type] || 4) - (typeOrder[b?.type] || 4);
      });
      supporting_entities = sorted.map((e: any) => e.name).filter(Boolean).slice(0, 2);
    }

    if (supporting_entities.length === 0) {
      const paperTitles = paperIds
        .map((pid: string) => papersMap.get(pid)?.title)
        .filter((t: string | undefined) => t && !t.toLowerCase().startsWith('untitled'));
      if (paperTitles.length > 0) {
        supporting_entities = paperTitles.slice(0, 2);
      }
    }

    if (supporting_entities.length === 0) {
      supporting_entities = ['[Unresolved Concept]'];
    }

    gaps.push({
      gap_id: `gap_lim_cluster_${idx}`,
      gap_type: 'REPEATED_LIMITATION',
      title: `Repeated literature limitation: ${textSample.slice(0, 50)}...`,
      description: `A recurrent technical barrier has been independently identified across ${cluster.length} papers: "${textSample}". This points to a verified method or design constraint in the current research.`,
      score,
      confidence,
      supporting_entities,
      supporting_papers,
      supporting_signals: [],
      supporting_limitations: cluster.map((c: any) => c.text),
      supporting_future_work: [],
      evidence_count: cluster.length,
      created_at: new Date().toISOString()
    });
  });

  return gaps;
};

/**
 * 5. Detect Unresolved Future Work
 */
export const detectUnresolvedFutureWork = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (f:FutureWork)<-[:HAS_FUTURE_WORK]-(p:Paper)
    OPTIONAL MATCH (p)-[:MENTIONS|USES_METHOD|USES_DATASET]->(e:ResearchEntity)
    RETURN f.future_work_id as id, f.text as text, p.paper_id as paper_id, p.year as year,
           collect(distinct { name: e.name, normalized_name: e.normalized_name, type: e.type }) as entities
  `;
  const result = await neo4jService.runQuery(query);
  const currentYear = new Date().getFullYear();

  const futureWorks = result.records.map((rec: any) => {
    const rawYear = rec.get('year');
    const pId = rec.get('paper_id');
    const mongoYear = papersMap.get(pId)?.year;
    const yearVal = rawYear !== null && rawYear !== undefined ? toNum(rawYear, 0) : (mongoYear || 0);
    const rawEntities = rec.get('entities');
    const entities = Array.isArray(rawEntities) ? rawEntities.filter((e: any) => e && e.name) : [];
    return {
      id: rec.get('id'),
      text: rec.get('text'),
      paper_id: pId,
      year: yearVal > 0 ? yearVal : undefined,
      entities
    };
  });

  const papersWithFw = new Set(futureWorks.map((fw: any) => fw.paper_id)).size;
  // Find future work directions from papers with known past publication year (year <= currentYear - 1 and year >= 1900)
  const oldFutureWorks = futureWorks.filter((fw: any) => fw.year && fw.year >= 1900 && fw.year <= currentYear - 1);
  const excludedByYearCount = futureWorks.length - oldFutureWorks.length;

  const gaps: ResearchGap[] = [];

  for (const fw of oldFutureWorks) {
    // Extract potential concept words from the future work text
    const words = fw.text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 4);

    if (words.length === 0) continue;

    // Check if subsequent papers (year > fw.year) contain any of these keywords as matching entities
    const checkQuery = `
      MATCH (p:Paper)-[]->(e:ResearchEntity)
      WHERE p.year > $fwYear
        AND (toLower(e.name) IN $words OR toLower(e.normalized_name) IN $words)
      RETURN count(distinct p) as count
    `;
    const checkRes = await neo4jService.runQuery(checkQuery, { fwYear: fw.year, words });
    const subsequentMentions = toNum(checkRes.records[0]?.get('count'));

    // If unresolved (no or very low subsequent mentions of key terms)
    if (subsequentMentions === 0) {
      const score = Math.min(100, Math.round((currentYear - fw.year) * 10 + 60));
      const confidence = 0.85;
      const paperTitle = papersMap.get(fw.paper_id)?.title || fw.paper_id;

      // Resolve supporting entities for future work
      const textLower = fw.text.toLowerCase();
      let supporting_entities = (fw.entities || []).filter((e: any) =>
        e && e.name && (
          textLower.includes(e.name.toLowerCase()) ||
          (e.normalized_name && textLower.includes(e.normalized_name.toLowerCase()))
        )
      ).map((e: any) => e.name);

      if (supporting_entities.length === 0 && (fw.entities || []).length > 0) {
        const sorted = [...fw.entities].sort((a: any, b: any) => {
          const typeOrder: Record<string, number> = { METHOD: 1, CONCEPT: 2, DATASET: 3 };
          return (typeOrder[a?.type] || 4) - (typeOrder[b?.type] || 4);
        });
        supporting_entities = sorted.map((e: any) => e.name).filter(Boolean).slice(0, 2);
      }

      if (supporting_entities.length === 0) {
        const paperInfo = papersMap.get(fw.paper_id);
        if (paperInfo?.title && !paperInfo.title.toLowerCase().startsWith('untitled')) {
          supporting_entities = [paperInfo.title];
        } else if (paperInfo?.domain && paperInfo.domain !== 'General') {
          supporting_entities = [paperInfo.domain];
        }
      }

      if (supporting_entities.length === 0) {
        supporting_entities = ['[Unresolved Concept]'];
      }

      gaps.push({
        gap_id: `gap_fw_${fw.id}`,
        gap_type: 'UNRESOLVED_FUTURE_WORK',
        title: `Unresolved future-work direction from ${fw.year}`,
        description: `The future-work direction "${fw.text}" was proposed in the ${fw.year} paper "${paperTitle}". An analysis of subsequent publications indicates a lack of direct conceptual exploration or resolved follow-ups, leaving this research path unresolved.`,
        score,
        confidence,
        supporting_entities,
        supporting_papers: [paperTitle],
        supporting_signals: [],
        supporting_limitations: [],
        supporting_future_work: [fw.text],
        evidence_count: 1,
        created_at: new Date().toISOString()
      });
    }
  }

  console.log(`[ResearchGap Diagnostics] FutureWork nodes: ${futureWorks.length}, papers with FutureWork: ${papersWithFw}, excluded by year: ${excludedByYearCount}, detected unresolved future work gaps: ${gaps.length}`);

  return gaps;
};

/**
 * 6. Detect Method Gaps
 */
export const detectMethodGaps = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (p:Paper)-[:USES_METHOD]->(m:ResearchEntity { type: 'METHOD' })
    RETURN m.entity_id as method_id, m.name as method_name, collect(distinct p.paper_id) as paper_ids
  `;
  const result = await neo4jService.runQuery(query);
  const gaps: ResearchGap[] = [];

  for (const rec of result.records) {
    const method_id = rec.get('method_id');
    const name = rec.get('method_name');
    const paperIds: string[] = rec.get('paper_ids');

    const domains = paperIds.map(pid => papersMap.get(pid)?.domain).filter(Boolean);
    const domainCounts = new Map<string, number>();
    domains.forEach(d => domainCounts.set(d, (domainCounts.get(d) || 0) + 1));

    // If method is popular in domain A but completely absent in domain B
    const activeDomains = Array.from(domainCounts.entries()).filter(([_, count]) => count >= 2);
    if (activeDomains.length > 0) {
      const allDomainsList = Array.from(new Set(Array.from(papersMap.values()).map(p => p.domain).filter(Boolean))) as string[];
      const missingDomains = allDomainsList.filter(d => !domainCounts.has(d));

      if (missingDomains.length > 0) {
        const sourceDomain = activeDomains[0][0];
        const targetDomain = missingDomains[0];

        // Supporting papers in active domain
        const supporting_papers = paperIds
          .filter(pid => papersMap.get(pid)?.domain === sourceDomain)
          .map(pid => papersMap.get(pid)?.title || pid);

        gaps.push({
          gap_id: `gap_method_${method_id}_${targetDomain.replace(/\s+/g, '_')}`,
          gap_type: 'METHOD_GAP',
          title: `Application of "${name}" to the "${targetDomain}" domain`,
          description: `The method "${name}" is actively applied in the "${sourceDomain}" research domain, appearing in multiple works. However, it remains completely absent in the "${targetDomain}" literature, suggesting a methodological gap that could be bridged.`,
          score: 75,
          confidence: 0.8,
          supporting_entities: [name],
          supporting_papers,
          supporting_signals: [`sig_freq_${method_id}`],
          supporting_limitations: [],
          supporting_future_work: [],
          evidence_count: paperIds.length,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  return gaps;
};

/**
 * 7. Detect Dataset Gaps
 */
export const detectDatasetGaps = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (p:Paper)-[:USES_DATASET]->(d:ResearchEntity { type: 'DATASET' })
    RETURN d.entity_id as dataset_id, d.name as dataset_name, collect(distinct p.paper_id) as paper_ids
  `;
  const result = await neo4jService.runQuery(query);
  const gaps: ResearchGap[] = [];

  for (const rec of result.records) {
    const dataset_id = rec.get('dataset_id');
    const name = rec.get('dataset_name');
    const paperIds: string[] = rec.get('paper_ids');

    const domains = paperIds.map(pid => papersMap.get(pid)?.domain).filter(Boolean);
    const domainCounts = new Map<string, number>();
    domains.forEach(d => domainCounts.set(d, (domainCounts.get(d) || 0) + 1));

    const activeDomains = Array.from(domainCounts.entries()).filter(([_, count]) => count >= 2);
    if (activeDomains.length > 0) {
      const allDomainsList = Array.from(new Set(Array.from(papersMap.values()).map(p => p.domain).filter(Boolean))) as string[];
      const missingDomains = allDomainsList.filter(d => !domainCounts.has(d));

      if (missingDomains.length > 0) {
        const sourceDomain = activeDomains[0][0];
        const targetDomain = missingDomains[0];

        const supporting_papers = paperIds
          .filter(pid => papersMap.get(pid)?.domain === sourceDomain)
          .map(pid => papersMap.get(pid)?.title || pid);

        gaps.push({
          gap_id: `gap_dataset_${dataset_id}_${targetDomain.replace(/\s+/g, '_')}`,
          gap_type: 'DATASET_GAP',
          title: `Validation of "${targetDomain}" methods using "${name}" dataset`,
          description: `The benchmark dataset "${name}" is heavily utilized in the "${sourceDomain}" domain, but is completely missing in the "${targetDomain}" literature, suggesting a validation dataset gap.`,
          score: 70,
          confidence: 0.75,
          supporting_entities: [name],
          supporting_papers,
          supporting_signals: [`sig_freq_${dataset_id}`],
          supporting_limitations: [],
          supporting_future_work: [],
          evidence_count: paperIds.length,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  return gaps;
};

/**
 * 8. Detect Application Gaps
 */
export const detectApplicationGaps = async (papersMap: Map<string, any>): Promise<ResearchGap[]> => {
  const query = `
    MATCH (e:ResearchEntity)
    OPTIONAL MATCH (p:Paper)-[r]->(e)
    WITH e, count(distinct p) as paper_count, count(r) as degree
    WHERE degree >= 3 AND e.type IN ['CONCEPT', 'METHOD']
    RETURN e.entity_id as entity_id, e.name as name, e.type as type, paper_count, degree
    ORDER BY degree DESC
  `;
  const result = await neo4jService.runQuery(query);
  const gaps: ResearchGap[] = [];

  for (const rec of result.records) {
    const entity_id = rec.get('entity_id');
    const name = rec.get('name');
    const type = rec.get('type');
    const paper_count = toNum(rec.get('paper_count'));
    const degree = toNum(rec.get('degree'));

    // Check if the papers are heavily theoretical (no domain application terms)
    const papersQuery = `
      MATCH (p:Paper)-[]->(e:ResearchEntity { entity_id: $entity_id })
      RETURN p.paper_id as paper_id
    `;
    const papersRes = await neo4jService.runQuery(papersQuery, { entity_id });
    const pIds: string[] = papersRes.records.map((r: any) => r.get('paper_id'));

    const domains = pIds.map(pid => papersMap.get(pid)?.domain || 'General');
    const isTheoretical = domains.every(d => d.toLowerCase().includes('theory') || d.toLowerCase().includes('general') || d.toLowerCase().includes('computer science'));

    if (isTheoretical && pIds.length >= 2) {
      const supporting_papers = pIds.map(pid => papersMap.get(pid)?.title || pid);

      gaps.push({
        gap_id: `gap_app_${entity_id}`,
        gap_type: 'APPLICATION_GAP',
        title: `Practical application of theoretical ${type.toLowerCase()} "${name}"`,
        description: `The concept "${name}" has strong technical or theoretical representation in the graph (degree: ${degree}), but has not been directly applied in practical or industry-specific domain papers. This indicates a gap between theoretical framework design and field deployment.`,
        score: 65,
        confidence: 0.7,
        supporting_entities: [name],
        supporting_papers,
        supporting_signals: [`sig_freq_${entity_id}`],
        supporting_limitations: [],
        supporting_future_work: [],
        evidence_count: degree,
        created_at: new Date().toISOString()
      });
    }
  }

  return gaps;
};

/**
 * Main function: Collects all detected research gaps and returns them sorted by score.
 */
export const getAllGaps = async (filters: any = {}): Promise<ResearchGap[]> => {
  const totalPapersRes = await neo4jService.runQuery('MATCH (p:Paper) RETURN count(p) as total');
  const N = totalPapersRes.records.length > 0 ? toNum(totalPapersRes.records[0].get('total')) : 0;

  if (N === 0) return [];

  const papersMap = await getPaperDetailsMap();

  const [lowCov, underexplored, crossDom, repeatedLim, unresolvedFw, methodGaps, datasetGaps, appGaps] = await Promise.all([
    detectLowCoverageGaps(papersMap),
    detectUnderexploredCombinations(papersMap),
    detectCrossDomainGaps(papersMap),
    detectRepeatedLimitations(papersMap),
    detectUnresolvedFutureWork(papersMap),
    detectMethodGaps(papersMap),
    detectDatasetGaps(papersMap),
    detectApplicationGaps(papersMap)
  ]);

  const allGaps = [
    ...lowCov,
    ...underexplored,
    ...crossDom,
    ...repeatedLim,
    ...unresolvedFw,
    ...methodGaps,
    ...datasetGaps,
    ...appGaps
  ];

  // Apply filters
  let filtered = allGaps;

  if (filters.type) {
    filtered = filtered.filter(g => g.gap_type === filters.type);
  }

  if (filters.entity) {
    const q = String(filters.entity).toLowerCase();
    filtered = filtered.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.supporting_entities.some(e => e.toLowerCase().includes(q))
    );
  }

  if (filters.min_score) {
    const minS = Number(filters.min_score);
    filtered = filtered.filter(g => g.score >= minS);
  }

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  // Pagination
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const startIdx = (page - 1) * limit;

  return filtered.slice(startIdx, startIdx + limit);
};
