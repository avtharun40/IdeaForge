import Paper from '../models/Paper.js';
import * as neo4jService from './neo4jService.js';
import * as normalizer from './ai/entityNormalizer.js';

export interface GraphBuildResult {
  paper_id: string;
  status: string;
  nodes_created: number;
  relationships_created: number;
}

/**
 * Builds or updates the queryable Knowledge Graph in Neo4j for a given paper.
 * Executes all updates transactionally to guarantee data integrity.
 */
export const buildPaperGraph = async (paperId: string): Promise<GraphBuildResult> => {
  // 1. Fetch paper from MongoDB
  const paper = await Paper.findById(paperId);
  if (!paper) {
    throw new Error(`Paper with ID ${paperId} not found in MongoDB.`);
  }

  // 2. Validate that Phase 6 AI analysis is complete and valid
  if (!paper.aiAnalysis || paper.aiAnalysis.status !== 'ready' || !paper.aiAnalysis.result) {
    throw new Error(`AI analysis has not successfully run for paper "${paper.title}". Please run AI analysis first.`);
  }

  const analysis = paper.aiAnalysis.result;
  const chunks = paper.chunks || [];
  let nodesCreated = 0;
  let relationshipsCreated = 0;

  // Helper to execute queries inside transactions and aggregate creation metrics
  const runTxQuery = async (tx: any, cypher: string, params: any) => {
    const res = await tx.run(cypher, params);
    const counters = res.summary.counters;
    nodesCreated += (counters.updates().nodesCreated || 0);
    relationshipsCreated += (counters.updates().relationshipsCreated || 0);
    return res;
  };

  console.log(`[Neo4j] Building graph transaction for paper: "${paper.title}" (${paperId})...`);

  // Execute graph operations inside a database transaction block
  await neo4jService.runTransaction(async (tx) => {
    // 1. MERGE Paper node
    await runTxQuery(tx, `
      MERGE (p:Paper { paper_id: $paper_id })
      SET p.title = $title, p.year = $year
    `, {
      paper_id: paperId,
      title: paper.title,
      year: paper.year !== undefined && paper.year !== null ? paper.year : null
    });

    // 2. Process Concepts
    if (analysis.concepts) {
      for (const concept of analysis.concepts) {
        if (!concept.name) continue;
        const entity_id = normalizer.generateEntityId(concept.name, 'CONCEPT');
        const normalized_name = normalizer.normalizeEntityName(concept.name);
        const source_chunk_id = normalizer.findSourceChunkId(concept.description, chunks);

        // Merge Concept node with alias preservation
        await runTxQuery(tx, `
          MERGE (e:ResearchEntity { entity_id: $entity_id })
          ON CREATE SET e.name = $name, e.normalized_name = $normalized_name, e.type = 'CONCEPT', e.aliases = [$name]
          ON MATCH SET e.aliases = CASE WHEN NOT $name IN coalesce(e.aliases, []) THEN coalesce(e.aliases, []) + [$name] ELSE e.aliases END
        `, {
          entity_id,
          name: concept.name,
          normalized_name
        });

        // Merge relationship Paper -> MENTIONS -> Concept
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (e:ResearchEntity { entity_id: $entity_id })
          MERGE (p)-[r:MENTIONS { paper_id: $paper_id }]->(e)
          SET r.confidence = $confidence, r.source_chunk_id = $source_chunk_id, r.source_type = 'LLM_EXTRACTION'
        `, {
          paper_id: paperId,
          entity_id,
          confidence: concept.confidence,
          source_chunk_id
        });
      }
    }

    // 3. Process Methods
    if (analysis.methods) {
      for (const method of analysis.methods) {
        if (!method.name) continue;
        const entity_id = normalizer.generateEntityId(method.name, 'METHOD');
        const normalized_name = normalizer.normalizeEntityName(method.name);
        const source_chunk_id = normalizer.findSourceChunkId(method.description, chunks);

        // Merge Method node with alias preservation
        await runTxQuery(tx, `
          MERGE (e:ResearchEntity { entity_id: $entity_id })
          ON CREATE SET e.name = $name, e.normalized_name = $normalized_name, e.type = 'METHOD', e.aliases = [$name]
          ON MATCH SET e.aliases = CASE WHEN NOT $name IN coalesce(e.aliases, []) THEN coalesce(e.aliases, []) + [$name] ELSE e.aliases END
        `, {
          entity_id,
          name: method.name,
          normalized_name
        });

        // Merge relationship Paper -> USES_METHOD -> Method
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (e:ResearchEntity { entity_id: $entity_id })
          MERGE (p)-[r:USES_METHOD { paper_id: $paper_id }]->(e)
          SET r.confidence = $confidence, r.source_chunk_id = $source_chunk_id, r.source_type = 'LLM_EXTRACTION'
        `, {
          paper_id: paperId,
          entity_id,
          confidence: method.confidence,
          source_chunk_id
        });
      }
    }

    // 4. Process Datasets
    if (analysis.datasets) {
      for (const dataset of analysis.datasets) {
        if (!dataset.name) continue;
        const entity_id = normalizer.generateEntityId(dataset.name, 'DATASET');
        const normalized_name = normalizer.normalizeEntityName(dataset.name);
        const source_chunk_id = normalizer.findSourceChunkId(dataset.purpose, chunks);

        // Merge Dataset node with alias preservation
        await runTxQuery(tx, `
          MERGE (e:ResearchEntity { entity_id: $entity_id })
          ON CREATE SET e.name = $name, e.normalized_name = $normalized_name, e.type = 'DATASET', e.aliases = [$name]
          ON MATCH SET e.aliases = CASE WHEN NOT $name IN coalesce(e.aliases, []) THEN coalesce(e.aliases, []) + [$name] ELSE e.aliases END
        `, {
          entity_id,
          name: dataset.name,
          normalized_name
        });

        // Merge relationship Paper -> USES_DATASET -> Dataset
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (e:ResearchEntity { entity_id: $entity_id })
          MERGE (p)-[r:USES_DATASET { paper_id: $paper_id }]->(e)
          SET r.confidence = $confidence, r.source_chunk_id = $source_chunk_id, r.source_type = 'LLM_EXTRACTION'
        `, {
          paper_id: paperId,
          entity_id,
          confidence: dataset.confidence,
          source_chunk_id
        });
      }
    }

    // 5. Interconnect Entities based on co-occurrence in the paper (Methods, Concepts, Datasets)
    // Connecting Method -> EVALUATED_ON -> Dataset
    if (analysis.methods && analysis.datasets) {
      for (const method of analysis.methods) {
        for (const dataset of analysis.datasets) {
          const methodId = normalizer.generateEntityId(method.name, 'METHOD');
          const datasetId = normalizer.generateEntityId(dataset.name, 'DATASET');
          const confidence = Math.min(method.confidence, dataset.confidence);

          await runTxQuery(tx, `
            MATCH (m:ResearchEntity { entity_id: $methodId })
            MATCH (d:ResearchEntity { entity_id: $datasetId })
            MERGE (m)-[r:EVALUATED_ON { paper_id: $paper_id }]->(d)
            SET r.confidence = $confidence, r.source_type = 'HEURISTIC_CO_OCCURRENCE'
          `, {
            methodId,
            datasetId,
            paper_id: paperId,
            confidence
          });
        }
      }
    }

    // Connecting Method -> USES -> Concept
    if (analysis.methods && analysis.concepts) {
      for (const method of analysis.methods) {
        for (const concept of analysis.concepts) {
          const methodId = normalizer.generateEntityId(method.name, 'METHOD');
          const conceptId = normalizer.generateEntityId(concept.name, 'CONCEPT');
          const confidence = Math.min(method.confidence, concept.confidence);

          await runTxQuery(tx, `
            MATCH (m:ResearchEntity { entity_id: $methodId })
            MATCH (c:ResearchEntity { entity_id: $conceptId })
            MERGE (m)-[r:USES { paper_id: $paper_id }]->(c)
            SET r.confidence = $confidence, r.source_type = 'HEURISTIC_CO_OCCURRENCE'
          `, {
            methodId,
            conceptId,
            paper_id: paperId,
            confidence
          });
        }
      }
    }

    // 6. Process Claims
    if (analysis.claims) {
      for (const claim of analysis.claims) {
        if (!claim.claim) continue;
        const claim_id = normalizer.generateClaimId(paperId, claim.claim);
        const source_chunk_id = normalizer.findSourceChunkId(claim.evidence, chunks);

        // Merge Claim node
        await runTxQuery(tx, `
          MERGE (c:Claim { claim_id: $claim_id })
          SET c.text = $text, c.paper_id = $paper_id, c.source_chunk_id = $source_chunk_id
        `, {
          claim_id,
          text: claim.claim,
          paper_id: paperId,
          source_chunk_id
        });

        // Merge relationship Paper -> MAKES_CLAIM -> Claim
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (c:Claim { claim_id: $claim_id })
          MERGE (p)-[r:MAKES_CLAIM { paper_id: $paper_id }]->(c)
        `, {
          paper_id: paperId,
          claim_id
        });
      }
    }

    // 7. Process Limitations
    if (analysis.limitations) {
      for (const limit of analysis.limitations) {
        if (!limit) continue;
        const limitation_id = normalizer.generateLimitationId(paperId, limit);
        const source_chunk_id = normalizer.findSourceChunkId(limit, chunks);

        // Merge Limitation node
        await runTxQuery(tx, `
          MERGE (l:Limitation { limitation_id: $limitation_id })
          SET l.text = $text, l.paper_id = $paper_id, l.source_chunk_id = $source_chunk_id
        `, {
          limitation_id,
          text: limit,
          paper_id: paperId,
          source_chunk_id
        });

        // Merge relationship Paper -> HAS_LIMITATION -> Limitation
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (l:Limitation { limitation_id: $limitation_id })
          MERGE (p)-[r:HAS_LIMITATION { paper_id: $paper_id }]->(l)
        `, {
          paper_id: paperId,
          limitation_id
        });
      }
    }

    // 8. Process Future Work
    if (analysis.futureWork) {
      for (const work of analysis.futureWork) {
        if (!work) continue;
        const future_work_id = normalizer.generateFutureWorkId(paperId, work);
        const source_chunk_id = normalizer.findSourceChunkId(work, chunks);

        // Merge FutureWork node
        await runTxQuery(tx, `
          MERGE (f:FutureWork { future_work_id: $future_work_id })
          SET f.text = $text, f.paper_id = $paper_id, f.source_chunk_id = $source_chunk_id
        `, {
          future_work_id,
          text: work,
          paper_id: paperId,
          source_chunk_id
        });

        // Merge relationship Paper -> HAS_FUTURE_WORK -> FutureWork
        await runTxQuery(tx, `
          MATCH (p:Paper { paper_id: $paper_id })
          MATCH (f:FutureWork { future_work_id: $future_work_id })
          MERGE (p)-[r:HAS_FUTURE_WORK { paper_id: $paper_id }]->(f)
        `, {
          paper_id: paperId,
          future_work_id
        });
      }
    }
  });

  return {
    paper_id: paperId,
    status: 'COMPLETED',
    nodes_created: nodesCreated,
    relationships_created: relationshipsCreated
  };
};
