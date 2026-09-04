import mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Paper from '../models/Paper.js';
import * as researchGapService from '../services/researchGapService.js';
import * as evidenceValidationService from '../services/evidenceValidationService.js';
import * as opportunityEngineService from '../services/opportunityEngineService.js';
import { toNum } from '../utils/neo4jHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runLiveAudit = async () => {
  console.log('====================================================');
  console.log('       IDEAFORGE REAL DATABASE STATE AUDIT          ');
  console.log('====================================================\n');

  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 6000 });

  // 1. Audit MongoDB Papers
  const papers = await Paper.find({}).sort({ createdAt: -1 });
  console.log(`1. MongoDB Papers Count: ${papers.length}`);
  papers.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ID: ${p._id}`);
    console.log(`       Title: "${p.title}"`);
    console.log(`       Year: ${p.year}, Status: ${p.status}`);
    console.log(`       Authors: ${p.authors.map(a => a.name).join(', ')}`);
    console.log(`       AI Analysis Status: ${p.aiAnalysis?.status || 'none'}`);
    console.log(`       AI Result Present: ${!!p.aiAnalysis?.result}`);
    console.log(`       Concepts: ${p.concepts?.length || 0}, Methods: ${p.methods?.length || 0}, Datasets: ${p.datasets?.length || 0}`);
    console.log(`       Limitations: ${p.limitations?.length || 0}, Future Work: ${p.futureWork?.length || 0}`);
  });

  // 2. Audit Neo4j Graph
  console.log('\n2. Neo4j Knowledge Graph Counts:');
  const neo4jDriver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!));
  const session = neo4jDriver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });

  const paperNodesRes = await session.run('MATCH (p:Paper) RETURN p.paper_id as id, p.title as title, p.year as year');
  console.log(`   Neo4j Paper Nodes (${paperNodesRes.records.length}):`);
  paperNodesRes.records.forEach(r => {
    console.log(`     - [${r.get('id')}] "${r.get('title')}" (${r.get('year')})`);
  });

  const countsRes = await session.run(`
    MATCH (n)
    RETURN labels(n)[0] as label, count(n) as count
    ORDER BY count DESC
  `);
  console.log('\n   Node Distribution by Label:');
  countsRes.records.forEach(r => {
    console.log(`     - ${r.get('label')}: ${toNum(r.get('count'))}`);
  });

  const relsRes = await session.run(`
    MATCH ()-[r]->()
    RETURN type(r) as type, count(r) as count
    ORDER BY count DESC
  `);
  console.log('\n   Relationship Distribution by Type:');
  relsRes.records.forEach(r => {
    console.log(`     - [:${r.get('type')}]: ${toNum(r.get('count'))}`);
  });

  // 3. Check Consistency: MongoDB ↔ Neo4j
  console.log('\n3. Consistency Check (MongoDB Paper IDs vs Neo4j Paper IDs):');
  const mongoIds = new Set(papers.map(p => String(p._id)));
  const neo4jIds = new Set(paperNodesRes.records.map(r => String(r.get('id'))));

  const mongoMissingInNeo4j = [...mongoIds].filter(id => !neo4jIds.has(id));
  const neo4jMissingInMongo = [...neo4jIds].filter(id => !mongoIds.has(id));

  console.log(`   MongoDB papers missing in Neo4j: ${mongoMissingInNeo4j.length === 0 ? 'NONE (All synchronized!)' : mongoMissingInNeo4j.join(', ')}`);
  console.log(`   Neo4j papers missing in MongoDB: ${neo4jMissingInMongo.length === 0 ? 'NONE (No stale orphans!)' : neo4jMissingInMongo.join(', ')}`);

  // 4. Test Research Gap Detection
  console.log('\n4. Live Research Gap Detection Results:');
  const gaps = await researchGapService.getAllGaps({});
  console.log(`   Total Detected Gaps: ${gaps.length}`);
  gaps.forEach((g, idx) => {
    console.log(`   [Gap ${idx + 1}] Type: ${g.gap_type} | Score: ${g.score} | Conf: ${(g.confidence * 100).toFixed(0)}%`);
    console.log(`         Title: "${g.title}"`);
    console.log(`         Supporting Papers (${g.supporting_papers.length}): ${g.supporting_papers.join('; ')}`);
    console.log(`         Supporting Entities: ${g.supporting_entities.join(', ')}`);
    console.log(`         Supporting Limitations: ${g.supporting_limitations?.length || 0}`);
    console.log(`         Supporting Future Work: ${g.supporting_future_work?.length || 0}`);
  });

  // 5. Test Evidence Validation on all Gaps
  console.log('\n5. Live Evidence Validation Results:');
  for (let i = 0; i < Math.min(5, gaps.length); i++) {
    const g = gaps[i];
    const val = await evidenceValidationService.validateGap(g.gap_id);
    console.log(`   [Validation ${i + 1}] Gap: ${g.gap_id} (${g.gap_type})`);
    console.log(`         Status: ${val.status}`);
    console.log(`         Evidence Count: ${val.evidence_count}`);
    console.log(`         Unique Papers: ${val.unique_papers} (Expected: ${g.supporting_papers.length})`);
    console.log(`         Evidence Items Sample:`);
    val.evidence_items.slice(0, 3).forEach((ev, j) => {
      console.log(`           (${j + 1}) [${ev.evidence_type}] Paper: ${ev.paper_id} | Relevance: ${ev.relevance_score}% | Text: "${ev.text.substring(0, 70)}..."`);
    });
  }

  // 6. Test Opportunities
  console.log('\n6. Live Opportunity Engine Results:');
  const genCount = await opportunityEngineService.generateOpportunities();
  console.log(`   Generated Opportunities: ${genCount}`);
  const opps = await opportunityEngineService.getOpportunities({ limit: 5 });
  console.log(`   Total Stored Opportunities: ${opps.total}, Returned: ${opps.data.length}`);
  opps.data.forEach((opp, i) => {
    console.log(`   [Opp ${i + 1}] Score: ${opp.score} | Conf: ${(opp.confidence * 100).toFixed(0)}% | Title: "${opp.title}"`);
  });

  await session.close();
  await neo4jDriver.close();
  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('                 AUDIT COMPLETED                    ');
  console.log('====================================================\n');
};

runLiveAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
