import assert from 'node:assert';
import * as neo4jService from '../services/neo4jService.js';
import * as researchGapService from '../services/researchGapService.js';
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
  console.log('--- STARTING GAP SERVICE TESTS ---');
  setupMocks();

  try {
    const papersMap = new Map();
    papersMap.set('paper_1', { title: 'Paper One Title', domain: 'Domain A', year: 2024 });
    papersMap.set('paper_2', { title: 'Paper Two Title', domain: 'Domain B', year: 2024 });

    // Mock Paper find in MongoDB for getPaperDetailsMap inside getAllGaps
    mockPaperFindResults = [
      { _id: 'paper_1', title: 'Paper One Title', researchArea: 'Domain A', year: 2024 },
      { _id: 'paper_2', title: 'Paper Two Title', researchArea: 'Domain B', year: 2024 }
    ];

    // 1. Test Low Coverage detection
    console.log('Testing detectLowCoverageGaps...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_1';
            if (key === 'entity_name') return 'Latent Concept';
            if (key === 'type') return 'CONCEPT';
            if (key === 'paper_count') return 1;
            if (key === 'degree') return 4;
            return 'Mocked';
          }
        }
      ]
    });
    // supporting papers list
    mockRunQueryResults.push({
      records: [{ get: () => 'paper_1' }]
    });

    const lowCovGaps = await researchGapService.detectLowCoverageGaps(papersMap);
    assert.strictEqual(lowCovGaps.length, 1, 'Should find 1 low coverage gap');
    assert.strictEqual(lowCovGaps[0].gap_type, 'LOW_COVERAGE');
    assert.strictEqual(lowCovGaps[0].supporting_entities[0], 'Latent Concept');
    assert.strictEqual(lowCovGaps[0].score, 95, 'Score should calculate correct deficit mapping');

    // 2. Test Underexplored Combination detection
    console.log('Testing detectUnderexploredCombinations...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'e1_id') return 'ent_a';
            if (key === 'e1_name') return 'Method A';
            if (key === 'e1_papers') return 3;
            if (key === 'e2_id') return 'ent_b';
            if (key === 'e2_name') return 'Concept B';
            if (key === 'e2_papers') return 4;
            if (key === 'bridge_name') return 'Shared Bridge';
            return 'Mocked';
          }
        }
      ]
    });
    // expected papers list
    mockRunQueryResults.push({
      records: [{ get: () => 'paper_1' }, { get: () => 'paper_2' }]
    });

    const combGaps = await researchGapService.detectUnderexploredCombinations(papersMap);
    assert.strictEqual(combGaps.length, 1, 'Should find 1 combination gap');
    assert.strictEqual(combGaps[0].gap_type, 'UNDEREXPLORED_COMBINATION');
    assert.strictEqual(combGaps[0].score, 87, 'Score calculation average check');

    // 3. Test Cross-Domain Gaps detection
    console.log('Testing detectCrossDomainGaps...');
    // getCrossDomains runs two queries inside researchSignalService
    // 1st query: get entities linking papers
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'xdom_1';
            if (key === 'entity_name') return 'Cross Concept';
            if (key === 'type') return 'CONCEPT';
            if (key === 'paper_ids') return ['paper_1', 'paper_2'];
            if (key === 'paper_count') return 2;
            return 'Mocked';
          }
        }
      ]
    });
    // 2nd query: get degrees
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'xdom_1';
            if (key === 'degree') return 4;
            return 'Mocked';
          }
        }
      ]
    });
    // 3rd query: papers list in detectCrossDomainGaps
    mockRunQueryResults.push({
      records: [
        { get: () => 'paper_1' },
        { get: () => 'paper_2' }
      ]
    });

    const xdomGaps = await researchGapService.detectCrossDomainGaps(papersMap);
    assert.strictEqual(xdomGaps.length, 1, 'Should find 1 cross-domain gap');
    assert.strictEqual(xdomGaps[0].gap_type, 'CROSS_DOMAIN');
    assert.strictEqual(xdomGaps[0].supporting_entities[0], 'Cross Concept');
    assert.strictEqual(xdomGaps[0].score, 86, 'Cross-domain score calculated correctly');

    // 4. Test Repeated Limitations detection
    console.log('Testing detectRepeatedLimitations...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'id') return 'lim_1';
            if (key === 'text') return 'High memory requirements when scaling model parameter weights';
            if (key === 'paper_id') return 'paper_1';
            return 'Mocked';
          }
        },
        {
          get: (key: string) => {
            if (key === 'id') return 'lim_2';
            if (key === 'text') return 'Significant memory overhead and constraints during model training';
            if (key === 'paper_id') return 'paper_2';
            return 'Mocked';
          }
        }
      ]
    });

    const limGaps = await researchGapService.detectRepeatedLimitations(papersMap);
    assert.strictEqual(limGaps.length, 1, 'Should cluster limitations with word overlaps');
    assert.strictEqual(limGaps[0].gap_type, 'REPEATED_LIMITATION');
    assert.strictEqual(limGaps[0].evidence_count, 2);

    // 5. Test Unresolved Future Work detection
    console.log('Testing detectUnresolvedFutureWork...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'id') return 'fw_1';
            if (key === 'text') return 'Investigating decentralized differential privacy';
            if (key === 'paper_id') return 'paper_1';
            if (key === 'year') return 2023;
            return 'Mocked';
          }
        }
      ]
    });
    // match counts subsequent (0 means unresolved)
    mockRunQueryResults.push({
      records: [{ get: () => 0 }]
    });

    const fwGaps = await researchGapService.detectUnresolvedFutureWork(papersMap);
    assert.strictEqual(fwGaps.length, 1, 'Should identify unresolved future work');
    assert.strictEqual(fwGaps[0].gap_type, 'UNRESOLVED_FUTURE_WORK');
    assert.strictEqual(fwGaps[0].score, 90, 'Score reflects years unresolved');

    // 6. Test Empty Graph Handling
    console.log('Testing empty graph safety...');
    mockRunQueryResults.push({
      records: [{ get: () => 0 }] // Total N = 0
    });
    const emptyResult = await researchGapService.getAllGaps();
    assert.strictEqual(emptyResult.length, 0, 'Empty graph returns empty list');

    console.log('--- ALL GAP SERVICE TESTS PASSED ---');
  } catch (error) {
    console.error('--- GAP SERVICE TESTS FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    restoreMocks();
  }
};

runAllTests();
