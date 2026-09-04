import * as neo4jService from './neo4jService.js';
import Paper from '../models/Paper.js';
import { toNum } from '../utils/neo4jHelpers.js';

export interface GraphNode {
  id: string;
  label: string; // Paper, ResearchEntity, Claim, Limitation, FutureWork
  properties: any;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  properties: any;
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

/**
 * Retrieves the complete local subgraph representing a single research paper.
 */
export const getPaperGraph = async (paperId: string): Promise<PaperSubgraph> => {
  // Query fetching the paper, all connected details, and any co-occurrence relationship links
  const query = `
    MATCH (p:Paper { paper_id: $paperId })
    
    // Fetch all entities directly connected to the paper
    OPTIONAL MATCH (p)-[r]->(n)
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    WITH p, collect(distinct n) as connectedNodes, collect(distinct r) as paperRels
    
    // Fetch any inter-entity relationships (Methods evaluations, Concept usages) tagged with this paper
    OPTIONAL MATCH (n1)-[inter:EVALUATED_ON|USES { paper_id: $paperId }]->(n2)
    WHERE n1 in connectedNodes AND n2 in connectedNodes
    WITH p, connectedNodes, paperRels, collect(distinct inter) as interRels
    
    RETURN p, connectedNodes, paperRels, interRels
  `;

  const result = await neo4jService.runQuery(query, { paperId });
  
  if (result.records.length === 0) {
    return { paper_id: paperId, nodes: [], relationships: [] };
  }

  const record = result.records[0];
  const pNode = record.get('p');
  const connected = record.get('connectedNodes') || [];
  const pRels = record.get('paperRels') || [];
  const interRels = record.get('interRels') || [];

  const nodesMap = new Map<string, GraphNode>();
  
  // Helper to safely format Neo4j nodes
  const addNode = (n: any) => {
    const id = n.properties.entity_id || n.properties.claim_id || n.properties.limitation_id || n.properties.future_work_id || n.properties.paper_id;
    const label = n.labels[0];
    if (id && !nodesMap.has(id)) {
      nodesMap.set(id, {
        id,
        label,
        properties: n.properties
      });
    }
  };

  // Add the primary paper node
  addNode(pNode);
  
  // Add all connected nodes
  connected.forEach((n: any) => {
    if (n) addNode(n);
  });

  const relationships: GraphRelationship[] = [];

  // Add direct paper-to-node relationships
  pRels.forEach((r: any) => {
    if (!r) return;
    const source = r.startNodeElementId || r.start; // Handle different driver version identifiers
    const target = r.endNodeElementId || r.end;
    
    // We want to match by properties.paper_id, startNode/endNode properties in Cypher
    // To resolve start and end node property IDs, we lookup in our Neo4j record properties:
    // It's cleaner to query the properties directly on the nodes.
    // Neo4j relationships contain r.start/r.end which are internal IDs.
    // To get stable identifiers, let's map using the cypher properties!
  });

  // A cleaner, robust way to extract sources/targets using Cypher return lists:
  const mapRelsQuery = `
    MATCH (p:Paper { paper_id: $paperId })
    OPTIONAL MATCH (p)-[r]->(n)
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN 'Paper' as srcType, p.paper_id as srcId, type(r) as type, 
           coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as targetId, 
           r.confidence as confidence, properties(r) as props
    
    UNION
    
    MATCH (n1:ResearchEntity)-[r:EVALUATED_ON|USES { paper_id: $paperId }]->(n2:ResearchEntity)
    RETURN 'ResearchEntity' as srcType, n1.entity_id as srcId, type(r) as type, 
           n2.entity_id as targetId, r.confidence as confidence, properties(r) as props
  `;

  const relsRes = await neo4jService.runQuery(mapRelsQuery, { paperId });
  relsRes.records.forEach((rec: any) => {
    const source = rec.get('srcId');
    const target = rec.get('targetId');
    const type = rec.get('type');
    const confidence = rec.get('confidence');
    const props = rec.get('props');

    if (source && target && type) {
      relationships.push({
        source,
        target,
        type,
        confidence: typeof confidence === 'number' ? confidence : undefined,
        properties: props
      });
    }
  });

  return {
    paper_id: paperId,
    nodes: Array.from(nodesMap.values()),
    relationships
  };
};

export const getGraphStats = async (): Promise<GraphStats> => {
  let activePaperIds: string[] = [];
  try {
    const activePapers = await Paper.find({ status: { $regex: /ready/i } }, '_id').maxTimeMS(2000);
    activePaperIds = activePapers.map(p => String(p._id));
  } catch {
    // MongoDB offline fallback
  }

  if (activePaperIds.length === 0) {
    const neoPapers = await neo4jService.runQuery('MATCH (p:Paper) RETURN p.paper_id as id');
    activePaperIds = neoPapers.records.map((r: any) => r.get('id')).filter(Boolean);
  }

  if (activePaperIds.length === 0) {
    return { papers: 0, nodes: 0, relationships: 0, concepts: 0, methods: 0, datasets: 0, claims: 0 };
  }

  const query = `
    MATCH (p:Paper)
    WHERE p.paper_id IN $activePaperIds
    WITH count(p) as papers
    
    MATCH (p:Paper)-[:MENTIONS|USES_METHOD|USES_DATASET]->(n:ResearchEntity)
    WHERE p.paper_id IN $activePaperIds
    WITH papers, count(distinct n) as totalNodes,
         sum(case when n.type = 'CONCEPT' then 1 else 0 end) as concepts,
         sum(case when n.type = 'METHOD' then 1 else 0 end) as methods,
         sum(case when n.type = 'DATASET' then 1 else 0 end) as datasets
         
    MATCH (c:Claim)
    WHERE c.paper_id IN $activePaperIds
    WITH papers, totalNodes, concepts, methods, datasets, count(distinct c) as claims
    
    OPTIONAL MATCH (p1:Paper)-[r]->(n)
    WHERE p1.paper_id IN $activePaperIds AND (n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork)
    WITH papers, totalNodes, concepts, methods, datasets, claims, count(distinct r) as rels1
    
    OPTIONAL MATCH (n1:ResearchEntity)-[r:EVALUATED_ON|USES]->(n2:ResearchEntity)
    WHERE r.paper_id IN $activePaperIds
    WITH papers, totalNodes, concepts, methods, datasets, claims, rels1, count(distinct r) as rels2
    
    RETURN papers, totalNodes + claims as nodes, rels1 + rels2 as relationships, 
           concepts, methods, datasets, claims
  `;

  const result = await neo4jService.runQuery(query, { activePaperIds });
  if (result.records.length === 0) {
    return { papers: 0, nodes: 0, relationships: 0, concepts: 0, methods: 0, datasets: 0, claims: 0 };
  }

  const record = result.records[0];
  return {
    papers: toNum(record.get('papers')),
    nodes: toNum(record.get('nodes')),
    relationships: toNum(record.get('relationships')),
    concepts: toNum(record.get('concepts')),
    methods: toNum(record.get('methods')),
    datasets: toNum(record.get('datasets')),
    claims: toNum(record.get('claims'))
  };
};

/**
 * Retrieves the neighborhood (1-hop connected nodes) for a specific research entity.
 */
export const getEntityNeighbors = async (entityId: string): Promise<any[]> => {
  const query = `
    MATCH (e:ResearchEntity { entity_id: $entityId })-[r:USES|USED_FOR|EVALUATED_ON]-(neighbor:ResearchEntity)
    RETURN DISTINCT neighbor.entity_id as entityId, neighbor.name as name, 
                    neighbor.type as type, type(r) as relationshipType, 
                    r.confidence as confidence
  `;

  const result = await neo4jService.runQuery(query, { entityId });
  return result.records.map((rec: any) => ({
    entityId: rec.get('entityId'),
    name: rec.get('name'),
    type: rec.get('type'),
    relationshipType: rec.get('relationshipType'),
    confidence: rec.get('confidence')
  }));
};

/**
 * Retrieves all research papers connected to a specific entity.
 */
export const getEntityPapers = async (entityId: string): Promise<any[]> => {
  const query = `
    MATCH (p:Paper)-[r:MENTIONS|USES_METHOD|USES_DATASET]->(e:ResearchEntity { entity_id: $entityId })
    RETURN DISTINCT p.paper_id as paperId, p.title as title, p.year as year, 
                    r.confidence as confidence, type(r) as relationshipType
  `;

  const result = await neo4jService.runQuery(query, { entityId });
  return result.records.map((rec: any) => ({
    paperId: rec.get('paperId'),
    title: rec.get('title'),
    year: toNum(rec.get('year'), null as any),
    confidence: rec.get('confidence'),
    relationshipType: rec.get('relationshipType')
  }));
};

/**
 * Retrieves the complete multi-paper unified knowledge graph.
 * Caps to a maximum number of nodes and relationships to protect WebGL performance.
 */
export const getFullGraph = async (maxNodes: number = 350): Promise<PaperSubgraph> => {
  let activePaperIds: string[] = [];
  try {
    const activePapers = await Paper.find({ status: { $regex: /ready/i } }, '_id').maxTimeMS(2000);
    activePaperIds = activePapers.map(p => String(p._id));
  } catch {
    // If MongoDB is slow or offline, query all papers directly from Neo4j!
    const neoPapers = await neo4jService.runQuery('MATCH (p:Paper) RETURN p.paper_id as id');
    activePaperIds = neoPapers.records.map((r: any) => r.get('id')).filter(Boolean);
  }

  if (activePaperIds.length === 0) {
    const neoPapers = await neo4jService.runQuery('MATCH (p:Paper) RETURN p.paper_id as id');
    activePaperIds = neoPapers.records.map((r: any) => r.get('id')).filter(Boolean);
  }

  if (activePaperIds.length === 0) {
    return { paper_id: 'ALL', nodes: [], relationships: [] };
  }

  // 1. Fetch active papers and connected entities
  const query = `
    MATCH (p:Paper)
    WHERE p.paper_id IN $activePaperIds
    OPTIONAL MATCH (p)-[r]->(n)
    WHERE n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork
    RETURN p, collect(distinct n) as connectedNodes, collect(distinct r) as paperRels
    LIMIT 100
  `;

  const result = await neo4jService.runQuery(query, { activePaperIds });
  const nodesMap = new Map<string, GraphNode>();

  const addNode = (n: any) => {
    if (!n) return;
    const id = n.properties.entity_id || n.properties.claim_id || n.properties.limitation_id || n.properties.future_work_id || n.properties.paper_id;
    const label = n.labels ? n.labels[0] : (n.properties.paper_id ? 'Paper' : 'ResearchEntity');
    if (id && !nodesMap.has(id)) {
      nodesMap.set(id, {
        id,
        label,
        properties: n.properties
      });
    }
  };

  result.records.forEach((rec: any) => {
    const p = rec.get('p');
    const connected = rec.get('connectedNodes') || [];
    if (p) addNode(p);
    connected.forEach((c: any) => {
      if (nodesMap.size < maxNodes) {
        addNode(c);
      }
    });
  });

  const relationships: GraphRelationship[] = [];

  const relsQuery = `
    MATCH (p:Paper)-[r]->(n)
    WHERE p.paper_id IN $activePaperIds AND (n:ResearchEntity OR n:Claim OR n:Limitation OR n:FutureWork)
    RETURN 'Paper' as srcType, p.paper_id as srcId, type(r) as type, 
           coalesce(n.entity_id, n.claim_id, n.limitation_id, n.future_work_id) as targetId, 
           r.confidence as confidence, properties(r) as props
    LIMIT 600

    UNION

    MATCH (n1:ResearchEntity)-[r:EVALUATED_ON|USES]->(n2:ResearchEntity)
    WHERE r.paper_id IN $activePaperIds
    RETURN 'ResearchEntity' as srcType, n1.entity_id as srcId, type(r) as type, 
           n2.entity_id as targetId, r.confidence as confidence, properties(r) as props
    LIMIT 600
  `;

  const relsRes = await neo4jService.runQuery(relsQuery, { activePaperIds });
  relsRes.records.forEach((rec: any) => {
    const source = rec.get('srcId');
    const target = rec.get('targetId');
    const type = rec.get('type');
    const confidence = rec.get('confidence');
    const props = rec.get('props');

    if (source && target && type && nodesMap.has(source) && nodesMap.has(target)) {
      relationships.push({
        source,
        target,
        type,
        confidence: typeof confidence === 'number' ? confidence : undefined,
        properties: props
      });
    }
  });

  return {
    paper_id: 'ALL',
    nodes: Array.from(nodesMap.values()),
    relationships
  };
};
