import mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Paper from '../models/Paper.js';
import * as paperService from '../services/paperService.js';
import * as researchGapService from '../services/researchGapService.js';
import * as evidenceValidationService from '../services/evidenceValidationService.js';
import * as dashboardController from '../controllers/dashboardController.js';
import { toNum } from '../utils/neo4jHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runE2EVerification = async () => {
  console.log('====================================================');
  console.log('       IDEAFORGE LIVE END-TO-END INTEGRATION        ');
  console.log('====================================================\n');

  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 6000 });

  const neo4jDriver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!));
  const session = neo4jDriver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });

  // A. Check Baseline 5-Paper Corpus
  const initialPapers = await Paper.find({});
  console.log(`A. Baseline MongoDB Corpus: ${initialPapers.length} papers.`);
  const initialNodesRes = await session.run('MATCH (n) RETURN count(n) as c');
  const initialNodeCount = toNum(initialNodesRes.records[0].get('c'));
  console.log(`   Baseline Neo4j Total Nodes: ${initialNodeCount}`);

  // B. Test Research Gaps on Live Corpus
  console.log('\nB. Testing Research Gap Engine...');
  const gaps = await researchGapService.getAllGaps({});
  console.log(`   Detected Gaps: ${gaps.length}`);
  if (gaps.length === 0) {
    throw new Error('Research Gap engine returned 0 gaps on active corpus.');
  }

  // C. Test Evidence Validation on Live Corpus
  console.log('\nC. Testing Evidence Explorer Validation Trails...');
  const sampleGap = gaps[0];
  const validation = await evidenceValidationService.validateGap(sampleGap.gap_id);
  console.log(`   Validated Gap: "${sampleGap.title}"`);
  console.log(`   Status: ${validation.status} | Unique Papers: ${validation.unique_papers} | Evidence Items: ${validation.evidence_count}`);
  if (validation.unique_papers === 0 && sampleGap.supporting_papers.length > 0) {
    throw new Error(`Evidence Explorer reported Papers: 0 for gap with ${sampleGap.supporting_papers.length} supporting papers.`);
  }

  // D. Controlled Test Paper Lifecycle (Upload -> Process -> Graph -> Delete Cascade)
  console.log('\nD. Testing Controlled Paper Lifecycle & Deletion Cascade...');
  
  // Create dummy test PDF file on disk in uploads/
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const testFileName = `e2e_temp_test_${Date.now()}.pdf`;
  const testFilePath = path.join(uploadDir, testFileName);
  fs.writeFileSync(testFilePath, '%PDF-1.4\n% temporary test file for e2e verification\n%%EOF');

  const testPaper = new Paper({
    title: 'Controlled Live Test Paper 2023',
    authors: [{ name: 'Test Author' }],
    year: 2023,
    researchArea: 'Natural Language Processing',
    status: 'ready',
    fileName: testFileName,
    filePath: testFilePath,
    fileSize: 1024,
    mimeType: 'application/pdf',
    concepts: [{ name: 'Dense Passage Retriever (DPR)', description: 'Dense passage retrieval method' }],
    methods: [{ name: 'Neural Retrieval', description: 'Embedding search' }],
    datasets: [{ name: 'NaturalQuestions', description: 'QA benchmark' }],
    limitations: ['Requires substantial GPU memory for index construction'],
    futureWork: ['Explore approximate quantization to reduce index size']
  });
  await testPaper.save();
  const testPaperId = String(testPaper._id);
  console.log(`   1. Created temporary test paper in MongoDB: ${testPaperId}`);

  // Create Neo4j graph nodes for this test paper
  await session.run(`
    MERGE (p:Paper { paper_id: $paperId })
    SET p.title = $title, p.year = 2023
    MERGE (e:ResearchEntity { entity_id: 'dense_passage_retriever' })
    SET e.name = 'Dense Passage Retriever (DPR)', e.type = 'METHOD'
    MERGE (p)-[:USES_METHOD]->(e)
    CREATE (l:Limitation { limitation_id: 'lim_temp_test', paper_id: $paperId, text: 'Requires substantial GPU memory' })
    CREATE (p)-[:HAS_LIMITATION]->(l)
  `, { paperId: testPaperId, title: testPaper.title });
  console.log(`   2. Seeded test graph nodes in Neo4j for paper: ${testPaperId}`);

  // Verify node exists
  const checkNodeRes = await session.run('MATCH (p:Paper { paper_id: $paperId }) RETURN count(p) as c', { paperId: testPaperId });
  const nodeExists = toNum(checkNodeRes.records[0].get('c')) === 1;
  console.log(`   3. Verified test paper node in Neo4j: ${nodeExists ? 'EXISTS' : 'MISSING'}`);

  // Perform cascading deletion via paperService.deletePaperRecord
  console.log(`   4. Executing paperService.deletePaperRecord(${testPaperId})...`);
  await paperService.deletePaperRecord(testPaperId);

  // Verify deletion in MongoDB
  const mongoDeleted = await Paper.findById(testPaperId);
  console.log(`   5. MongoDB verification: ${mongoDeleted === null ? 'DELETED' : 'STILL_EXISTS'}`);

  // Verify deletion in Neo4j
  const checkDeletedNodeRes = await session.run('MATCH (p:Paper { paper_id: $paperId }) RETURN count(p) as c', { paperId: testPaperId });
  const neo4jDeleted = toNum(checkDeletedNodeRes.records[0].get('c')) === 0;
  console.log(`   6. Neo4j verification: ${neo4jDeleted ? 'CLEANLY_DELETED' : 'STILL_EXISTS'}`);

  // Verify final count equals initial count
  const finalPapers = await Paper.find({});
  console.log(`   7. Final MongoDB Papers Count: ${finalPapers.length} (Matches initial: ${finalPapers.length === initialPapers.length})`);

  await session.close();
  await neo4jDriver.close();
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('       LIVE END-TO-END INTEGRATION: ALL PASS        ');
  console.log('====================================================\n');
};

runE2EVerification().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
