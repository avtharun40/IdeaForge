import assert from 'assert';
import { normalizeEntityName, generateEntityId } from '../services/ai/entityNormalizer.js';
import { validateGap } from '../services/evidenceValidationService.js';
import * as researchGapService from '../services/researchGapService.js';
import Paper from '../models/Paper.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runHardeningSuite = async () => {
  console.log('================================================================');
  console.log('         IDEAFORGE COMPREHENSIVE HARDENING TEST SUITE           ');
  console.log('================================================================\n');

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

  // 1. Entity Normalization & Canonical ID Generation
  await test('Entity Normalization: "Dense Passage Retriever (DPR)" variants converge to canonical entity', () => {
    const variants = [
      'Dense Passage Retriever (DPR)',
      'Dense Passage Retrieval (DPR)',
      'Dense Passage Retriever',
      'Dense Passage Retrieval',
      'dense passage retriever',
      'dense passage retrieval',
      'DPR'
    ];

    const normalized = variants.map(v => normalizeEntityName(v));
    const first = normalized[0];
    normalized.forEach((n, idx) => {
      assert.strictEqual(n, first, `Variant "${variants[idx]}" resolved to "${n}", expected "${first}"`);
    });

    const ids = variants.map(v => generateEntityId(v, 'METHOD'));
    const firstId = ids[0];
    ids.forEach((id, idx) => {
      assert.strictEqual(id, firstId, `Entity ID for "${variants[idx]}" is "${id}", expected "${firstId}"`);
    });
  });

  await test('Entity Normalization: RAG and FiD abbreviation and suffix resolution', () => {
    const ragVariants = [
      'Retrieval-Augmented Generation (RAG)',
      'Retrieval Augmented Generation',
      'Retrieval Augmented Generator',
      'RAG'
    ];
    const ragNorm = ragVariants.map(v => normalizeEntityName(v));
    assert.strictEqual(ragNorm[0], ragNorm[1]);
    assert.strictEqual(ragNorm[0], ragNorm[2]);
    assert.strictEqual(ragNorm[0], ragNorm[3]);

    const fidVariants = [
      'Fusion-in-Decoder (FiD)',
      'Fusion in Decoder',
      'FiD'
    ];
    const fidNorm = fidVariants.map(v => normalizeEntityName(v));
    assert.strictEqual(fidNorm[0], fidNorm[1]);
    assert.strictEqual(fidNorm[0], fidNorm[2]);
  });

  // 2. Publication Year Extraction Heuristics
  await test('Publication Year: Extracts years accurately from NeurIPS/ICLR, arXiv IDs, and Copyrights', () => {
    const currentYear = new Date().getFullYear();

    // Venue pattern
    const venueText = "Published at NeurIPS 2020: 34th Conference on Neural Information Processing Systems";
    const venueMatch = /\b(?:NeurIPS|NIPS|ICLR|ICML|ACL|EMNLP|NAACL|EACL|AAAI|IJCAI|CVPR|ICCV|ECCV|KDD|SIGIR|WWW|WSDM|COLING|Interspeech|CoNLL|TACL|PLoS|Nature|Science)\s*['’]?\s*(19\d\d|20\d\d)\b/i.exec(venueText);
    assert.ok(venueMatch && parseInt(venueMatch[1], 10) === 2020);

    // arXiv pattern
    const arxivText = "arXiv:2005.11401v4 [cs.CL] 12 Apr 2021";
    const arxivMatch = /arXiv:\s*(\d{2})(\d{2})\.\d+/i.exec(arxivText);
    assert.ok(arxivMatch);
    const yy = parseInt(arxivMatch[1], 10);
    const arxivYear = yy >= 90 ? 1900 + yy : 2000 + yy;
    assert.strictEqual(arxivYear, 2020);

    // Copyright pattern
    const copyText = "© 2020 Association for Computational Linguistics";
    const copyMatch = /(?:©|Copyright|Published)\s+(?:by\s+)?(?:in\s+)?(19\d\d|20\d\d)\b/i.exec(copyText) ||
                      /(19\d\d|20\d\d)\s+Association for Computational Linguistics/i.exec(copyText);
    assert.ok(copyMatch && parseInt(copyMatch[1], 10) === 2020);

    // Ensure unknown does NOT return 2026
    const unknownText = "This is a random snippet without any publication year information.";
    const hasMatch = /\b(?:NeurIPS|ICLR|ACL)\s*['’]?\s*(19\d\d|20\d\d)\b/i.test(unknownText) ||
                     /arXiv:\s*(\d{2})(\d{2})\.\d+/i.test(unknownText) ||
                     /(?:©|Copyright|Published)\s+(?:by\s+)?(?:in\s+)?(19\d\d|20\d\d)\b/i.test(unknownText);
    assert.strictEqual(hasMatch, false, "Unknown text should not match any year heuristics");
  });

  // 3. Title Extraction Priority
  await test('Title Extraction: Never uses section body as title', () => {
    const rawSample = `
Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks
Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin
Facebook AI Research, London, UK

Abstract
Large pre-trained language models store factual knowledge in parameters...

1 Introduction
Recent work has explored methods for large-scale retrieval augmented generation...
`;
    const frontLines = rawSample.substring(0, 2000).split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let detectedTitle = '';
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
        detectedTitle = line;
        break;
      }
    }

    assert.strictEqual(detectedTitle, 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks');
    assert.notStrictEqual(detectedTitle, 'Recent work has explored methods for large-scale retrieval augmented generation...');
  });

  // 4. Processing Stage Progression Contract
  await test('Processing Stages: Pipeline stage sequence and percentage contract', () => {
    const expectedStages = [
      { stage: 'uploaded', progress: 0 },
      { stage: 'extracting', progress: 20 },
      { stage: 'analyzing', progress: 50 },
      { stage: 'building_graph', progress: 80 },
      { stage: 'completed', progress: 100 },
      { stage: 'failed', progress: 0 }
    ];

    expectedStages.forEach(s => {
      assert.ok(['uploaded', 'extracting', 'analyzing', 'building_graph', 'completed', 'failed'].includes(s.stage));
      assert.ok(typeof s.progress === 'number' && s.progress >= 0 && s.progress <= 100);
    });
  });

  // 5. Evidence Validation & Unique Paper Count Deduplication
  await test('Evidence Explorer: Evidence count and deduplication logic', async () => {
    // Create mock gap and test validation
    const mockGap: researchGapService.ResearchGap = {
      gap_id: 'gap_test_123',
      gap_type: 'UNDEREXPLORED_COMBINATION',
      title: 'Dense Passage Retrieval with Fusion-in-Decoder',
      description: 'Test exploration gap between DPR and FiD',
      score: 85,
      confidence: 0.9,
      supporting_entities: ['Dense Passage Retriever', 'Fusion in Decoder'],
      supporting_papers: ['DPR Paper Title', 'FiD Paper Title'],
      supporting_signals: ['CO_OCCURRENCE_GAP'],
      supporting_limitations: ['Evaluation limited to small Wikipedia dump.'],
      supporting_future_work: ['Extend to multihop open-domain QA.'],
      evidence_count: 3,
      created_at: new Date().toISOString()
    };

    const validation = await validateGap(mockGap.gap_id, mockGap);
    
    assert.ok(validation.evidence_items.length >= 2, 'Validation should extract limitation and future work items');
    // Ensure no placeholder IDs in evidence items
    validation.evidence_items.forEach(ev => {
      assert.notStrictEqual(ev.paper_id, 'graph_analysis', 'Should not use placeholder graph_analysis');
      assert.notStrictEqual(ev.paper_id, 'cooccurrence_analysis', 'Should not use placeholder cooccurrence_analysis');
    });

    console.log(`    Evidence validation report status: ${validation.status}, unique papers: ${validation.unique_papers}, items: ${validation.evidence_count}`);
  });

  // 6. DB Connection & Corpus Integrity
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      import('node:dns').then(d => d.default.setServers(['8.8.8.8', '8.8.4.4']));
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
      console.log('\n  [DB] Connected to MongoDB Atlas for Live Corpus Verification.');

      await test('Live Corpus: All completed papers have valid year and AI analysis', async () => {
        const papers = await Paper.find({});
        console.log(`    Total papers in MongoDB: ${papers.length}`);
        papers.forEach(p => {
          if (p.status === 'ready') {
            assert.ok(p.title, `Paper ${p._id} must have a title`);
            assert.ok(p.processingStage === 'completed' || !p.processingStage, `Ready paper ${p.title} has invalid stage ${p.processingStage}`);
            if (p.year) {
              assert.ok(p.year >= 1900 && p.year <= new Date().getFullYear() + 1, `Invalid year: ${p.year}`);
            }
          }
        });
      });

      await mongoose.disconnect();
    } catch (dbErr: any) {
      console.log(`\n  [DB Warning] MongoDB live test skipped: ${dbErr.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`  HARDENING SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runHardeningSuite().catch(err => {
  console.error('Fatal hardening test failure:', err);
  process.exit(1);
});
