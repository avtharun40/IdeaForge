import assert from 'node:assert';
import * as neo4jService from '../services/neo4jService.js';
import * as evidenceValidationService from '../services/evidenceValidationService.js';
import Paper from '../models/Paper.js';

// Mocking setup
const originalPaperFind = Paper.find;

let mockRunQueryResults: any[] = [];
let mockPaperFindResults: any[] = [];

const setupMocks = () => {
  neo4jService.setMockQueryHandler(async (cypher: string, params: any) => {
    const nextMock = mockRunQueryResults.shift();
    if (!nextMock) return { records: [] };
    return nextMock;
  });

  (Paper as any).find = async () => {
    return mockPaperFindResults;
  };
};

const restoreMocks = () => {
  neo4jService.setMockQueryHandler(null);
  (Paper as any).find = originalPaperFind;
};

// Test Runner
const runAllTests = async () => {
  console.log('--- STARTING EVIDENCE VALIDATION TESTS ---');
  setupMocks();

  try {
    // Standard mock gap
    const mockGap = {
      gap_id: 'gap_test_1',
      gap_type: 'LOW_COVERAGE',
      title: 'Decentralized privacy trade-offs',
      description: 'Trade-offs between decentralization and differential privacy accuracy',
      score: 85,
      confidence: 0.8,
      supporting_entities: ['differential privacy'],
      supporting_papers: ['Paper Title A', 'Paper Title B'],
      supporting_limitations: ['Scalability issues under high dimension'],
      supporting_future_work: ['Extend decentralized protocols to larger nodes']
    };

    // Mock Mongo Paper model mapping
    mockPaperFindResults = [
      { _id: 'paper_a', title: 'Paper Title A', year: 2023 },
      { _id: 'paper_b', title: 'Paper Title B', year: 2024 }
    ];

    // 1. Test Strong Evidence (Supported status)
    console.log('Testing SUPPORTED validation (strong evidence)...');
    // We expect Neo4j queries:
    // - Limitation text match
    mockRunQueryResults.push({
      records: [{ get: (k: string) => k === 'paper_id' ? 'paper_a' : 'chunk_123' }]
    });
    // - FutureWork text match
    mockRunQueryResults.push({
      records: [{ get: (k: string) => k === 'paper_id' ? 'paper_b' : 'chunk_456' }]
    });
    // - Claims text matches (contains "differential privacy")
    mockRunQueryResults.push({
      records: [
        {
          get: (k: string) => {
            if (k === 'claim_id') return 'c_1';
            if (k === 'text') return 'Direct claim: Differential privacy accuracy is high';
            if (k === 'paper_id') return 'paper_a';
            return 'chunk_789';
          }
        }
      ]
    });
    // - Graph degree match for "differential privacy"
    mockRunQueryResults.push({
      records: [{ get: () => 5 }]
    });
    // - Contradiction claims query
    mockRunQueryResults.push({
      records: [
        {
          get: (k: string) => k === 'text' ? 'Differential privacy accuracy is high' : 'paper_a'
        }
      ]
    });

    const valStrong = await evidenceValidationService.validateGap('gap_test_1', mockGap);
    assert.strictEqual(valStrong.status, 'SUPPORTED', 'Status should be SUPPORTED');
    assert.ok(valStrong.evidence_count >= 4, 'Should gather 4 or more evidence items');
    assert.strictEqual(valStrong.unique_papers, 2, 'Should verify unique papers counts');

    // Reset mocks for next test
    mockPaperFindResults = [
      { _id: 'paper_a', title: 'Paper Title A', year: 2023 }
    ];

    // 2. Test Weak Evidence (Partially / Weakly Supported)
    console.log('Testing WEAKLY_SUPPORTED validation (weak evidence)...');
    // - Limitation text query (not found)
    const weakGap = {
      ...mockGap,
      supporting_limitations: [],
      supporting_future_work: [],
      supporting_papers: ['Paper Title A']
    };

    // For weakGap, only 3 queries are executed (Claims, Degree, Contradictions)
    // - Claims query (returns nothing)
    mockRunQueryResults.push({ records: [] });
    // - Graph degree query (degree = 1)
    mockRunQueryResults.push({
      records: [{ get: () => 1 }]
    });
    // - Contradiction claims query
    mockRunQueryResults.push({ records: [] });

    const valWeak = await evidenceValidationService.validateGap('gap_test_1', weakGap);
    assert.strictEqual(valWeak.status, 'WEAKLY_SUPPORTED', 'Status should be WEAKLY_SUPPORTED');
    assert.strictEqual(valWeak.evidence_count, 1, 'Should find only 1 item');

    // 3. Test Insufficient Evidence
    console.log('Testing INSUFFICIENT_EVIDENCE validation...');
    // - Claims query (returns nothing)
    mockRunQueryResults.push({ records: [] });
    // - Graph degree query (degree = 0)
    mockRunQueryResults.push({
      records: [{ get: () => 0 }]
    });
    // - Contradiction claims query
    mockRunQueryResults.push({ records: [] });

    const valInsuf = await evidenceValidationService.validateGap('gap_test_1', weakGap);
    assert.strictEqual(valInsuf.status, 'INSUFFICIENT_EVIDENCE', 'Status should be INSUFFICIENT_EVIDENCE');

    // Reset mocks for next test
    mockPaperFindResults = [
      { _id: 'paper_a', title: 'Paper Title A', year: 2023 },
      { _id: 'paper_b', title: 'Paper Title B', year: 2024 }
    ];

    // 4. Test Conflicting Claims (Contradictory status)
    console.log('Testing CONTRADICTED validation...');
    // - Limitation text
    mockRunQueryResults.push({ records: [] });
    // - FutureWork text
    mockRunQueryResults.push({ records: [] });
    // - Claims match (empty)
    mockRunQueryResults.push({ records: [] });
    // - Graph degree (empty)
    mockRunQueryResults.push({ records: [] });
    // - Contradiction claims (returns positive claim from paper_a and negative claim from paper_b)
    mockRunQueryResults.push({
      records: [
        {
          get: (k: string) => k === 'text' ? 'Differential privacy improves accuracy scaling' : 'paper_a'
        },
        {
          get: (k: string) => k === 'text' ? 'Differential privacy does not improve accuracy scaling' : 'paper_b'
        }
      ]
    });

    const valContra = await evidenceValidationService.validateGap('gap_test_1', mockGap);
    assert.strictEqual(valContra.status, 'CONTRADICTED', 'Status should be CONTRADICTED');
    assert.strictEqual(valContra.contradictions.length, 1, 'Should find 1 contradiction');
    assert.strictEqual(valContra.contradictions[0].entity, 'differential privacy');

    // 5. Test Missing Source Chunk safety
    console.log('Testing missing source chunk safety...');
    // - Limitation text match (returns null source chunk)
    mockRunQueryResults.push({
      records: [{ get: (k: string) => k === 'paper_id' ? 'paper_a' : null }]
    });
    // - Future work (not found)
    mockRunQueryResults.push({ records: [] });
    // - Claims (not found)
    mockRunQueryResults.push({ records: [] });
    // - Graph degree (0)
    mockRunQueryResults.push({ records: [] });
    // - Contradiction (empty)
    mockRunQueryResults.push({ records: [] });

    const valMissingChunk = await evidenceValidationService.validateGap('gap_test_1', mockGap);
    assert.strictEqual(valMissingChunk.evidence_items[0].source_chunk_id, null, 'Handles missing chunk gracefully');

    // 6. Test Validation Idempotency
    console.log('Testing validation idempotency...');
    // Setup identical queries for two sequential runs
    // Run 1
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    // Run 2
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });
    mockRunQueryResults.push({ records: [] });

    const valRun1 = await evidenceValidationService.validateGap('gap_test_1', mockGap);
    const valRun2 = await evidenceValidationService.validateGap('gap_test_1', mockGap);

    assert.strictEqual(valRun1.status, valRun2.status, 'Validation status matches between sequential runs');
    assert.strictEqual(valRun1.evidence_count, valRun2.evidence_count, 'Evidence item counts match');

    console.log('--- ALL EVIDENCE VALIDATION TESTS PASSED ---');
  } catch (error) {
    console.error('--- EVIDENCE VALIDATION TESTS FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    restoreMocks();
  }
};

runAllTests();
