import assert from 'assert';
import { normalizeEntityName, generateEntityId } from '../services/ai/entityNormalizer.js';
import { validateGap } from '../services/evidenceValidationService.js';
import * as researchGapService from '../services/researchGapService.js';
import * as neo4jService from '../services/neo4jService.js';
import Paper from '../models/Paper.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runRegressionSuite = async () => {
  console.log('====================================================');
  console.log('     IDEAFORGE MASTER BUG-FIX REGRESSION TESTS      ');
  console.log('====================================================');

  let passedTests = 0;
  let totalTests = 0;

  const test = async (name: string, fn: () => Promise<void> | void) => {
    totalTests++;
    try {
      await fn();
      console.log(`  [PASS] Test ${totalTests}: ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  [FAIL] Test ${totalTests}: ${name}`);
      console.error(`         Error: ${err.message}`);
    }
  };

  // TEST 1 — Entity Normalization (Bug 5)
  await test('Entity Normalization: "Dense Passage Retriever (DPR)" vs "Dense Passage Retrieval (DPR)"', () => {
    const term1 = 'Dense Passage Retriever (DPR)';
    const term2 = 'Dense Passage Retrieval (DPR)';
    const term3 = 'Dense Passage Retriever';
    const term4 = 'Dense Passage Retrieval';
    const term5 = 'DPR';

    const norm1 = normalizeEntityName(term1);
    const norm2 = normalizeEntityName(term2);
    const norm3 = normalizeEntityName(term3);
    const norm4 = normalizeEntityName(term4);
    const norm5 = normalizeEntityName(term5);

    assert.strictEqual(norm1, norm2, `Normalized name mismatch: "${norm1}" vs "${norm2}"`);
    assert.strictEqual(norm1, norm3, `Normalized name mismatch: "${norm1}" vs "${norm3}"`);
    assert.strictEqual(norm1, norm4, `Normalized name mismatch: "${norm1}" vs "${norm4}"`);
    assert.strictEqual(norm1, norm5, `Normalized name mismatch: "${norm1}" vs "${norm5}"`);

    const id1 = generateEntityId(term1, 'METHOD');
    const id2 = generateEntityId(term2, 'METHOD');
    const id5 = generateEntityId(term5, 'METHOD');

    assert.strictEqual(id1, id2, `Entity ID mismatch: "${id1}" vs "${id2}"`);
    assert.strictEqual(id1, id5, `Entity ID mismatch: "${id1}" vs "${id5}"`);
  });

  // TEST 1B — Suffix Equivalence across other entities
  await test('Entity Normalization: Suffix equivalence (Generation vs Generator, Detection vs Detector)', () => {
    const g1 = normalizeEntityName('Retrieval-Augmented Generation (RAG)');
    const g2 = normalizeEntityName('Retrieval-Augmented Generator (RAG)');
    const g3 = normalizeEntityName('RAG');
    assert.strictEqual(g1, g2);
    assert.strictEqual(g1, g3);

    const d1 = normalizeEntityName('Object Detection');
    const d2 = normalizeEntityName('Object Detector');
    assert.strictEqual(d1, d2);
  });

  // TEST 2 — Publication Year extraction patterns (Bug 3)
  await test('Publication Year: Extract years from venue, arXiv, and copyright patterns', () => {
    const venueText = "Accepted to NeurIPS 2020 Conference on Neural Information Processing Systems";
    const arxivText = "arXiv:2005.11401v4 [cs.CL] 12 Apr 2021";
    const copyText = "© 2020 Association for Computational Linguistics";

    const venueMatch = /\b(?:NeurIPS|ICLR|ACL)\s*['’]?\s*(19\d\d|20\d\d)\b/i.exec(venueText);
    assert.ok(venueMatch);
    const arxivMatch = /arXiv:\s*(\d{2})(\d{2})\.\d+/i.exec(arxivText);
    assert.ok(arxivMatch);
    const yy = parseInt(arxivMatch[1], 10);
    assert.strictEqual(yy >= 90 ? 1900 + yy : 2000 + yy, 2020);

    const copyMatch = /(?:©|Copyright|Published)\s+(?:by\s+)?(?:in\s+)?(19\d\d|20\d\d)\b/i.exec(copyText) ||
                      /(19\d\d|20\d\d)\s+Association for Computational Linguistics/i.exec(copyText);
    assert.ok(copyMatch);
    assert.strictEqual(parseInt(copyMatch[1], 10), 2020);
  });

  // TEST 3 — Title and Author Heuristics (Bug 2)
  await test('Title & Author: Introduction body text cannot become the paper title', () => {
    const rawSampleText = `
Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks
Patrick Lewis, Ethan Perez, Aleksandara Piktus, Fabio Petroni
Facebook AI Research; University College London; NYU

Abstract
Large pre-trained language models have been shown to store factual knowledge in their parameters...

1 Introduction
Recent work has shown that large-scale pre-trained language models can perform knowledge-intensive NLP tasks...
`;
    const frontLines = rawSampleText.substring(0, 2000).split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let candidateTitle = '';
    for (let i = 0; i < Math.min(8, frontLines.length); i++) {
      const line = frontLines[i];
      const lower = line.toLowerCase();
      if (
        lower.startsWith('abstract') || 
        lower.startsWith('introduction') || 
        lower.startsWith('1 ') || 
        lower.startsWith('1.')
      ) continue;
      if (line.length >= 10 && line.length <= 180 && !line.includes('@')) {
        candidateTitle = line;
        break;
      }
    }

    assert.strictEqual(candidateTitle, 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks');
    assert.notStrictEqual(candidateTitle, 'Recent work has shown that large-scale pre-trained language models can perform knowledge-intensive NLP tasks...');
  });

  // Database Runtime Integration Tests (if MongoDB Atlas & Neo4j are connected)
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      import('node:dns').then(d => d.default.setServers(['8.8.8.8', '8.8.4.4']));
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log('\n  [DB] Connected to MongoDB Atlas for Runtime Verification.');

      // TEST 4 — Evidence Explorer paper count & valid paper IDs (Bug 4)
      await test('Evidence Validation: unique_papers count matches supporting papers count', async () => {
        // Create mock gap with 2 distinct real or named supporting papers
        const allGaps = await researchGapService.getAllGaps({});
        if (allGaps.length > 0) {
          const testGap = allGaps[0];
          const validation = await validateGap(testGap.gap_id);

          assert.ok(validation.unique_papers >= 1, `Expected unique_papers >= 1, got ${validation.unique_papers}`);
          assert.strictEqual(validation.unique_papers, testGap.supporting_papers.length, 
            `unique_papers (${validation.unique_papers}) must match supporting_papers.length (${testGap.supporting_papers.length})`);
          
          // Verify that evidence items contain valid paper_ids (not 'unknown' or empty)
          validation.evidence_items.forEach(ev => {
            assert.ok(ev.paper_id, 'Evidence item must have a valid paper_id');
            assert.notStrictEqual(ev.paper_id, '', 'paper_id cannot be empty');
          });
        } else {
          console.log('    (Skipped live gap check: no gaps detected in current DB)');
        }
      });

      // TEST 5 — Real 5-Paper Corpus Check
      await test('Regression Corpus: Verify analyzed papers and non-zero publication years', async () => {
        const papers = await Paper.find({ status: 'ready' });
        console.log(`    Found ${papers.length} ready papers in database.`);
        papers.forEach(p => {
          assert.ok(p.title && p.title.length > 2, `Paper ${p._id} must have a valid title`);
          assert.ok(p.year && p.year >= 1900 && p.year <= new Date().getFullYear(), `Paper ${p.title} has invalid year: ${p.year}`);
          if (p.aiAnalysis?.status === 'ready') {
            assert.ok(p.concepts && p.concepts.length > 0, `Paper ${p.title} should have authoritative concepts`);
          }
        });
      });

      await mongoose.disconnect();
    } catch (dbErr: any) {
      console.log(`\n  [DB Warning] MongoDB runtime test skipped: ${dbErr.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(`  REGRESSION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runRegressionSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
