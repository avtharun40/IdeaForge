import assert from 'node:assert';
import * as neo4jService from '../services/neo4jService.js';
import * as researchSignalService from '../services/researchSignalService.js';
import Paper from '../models/Paper.js';

// Simple Mocking Framework
const originalPaperFind = Paper.find;

let mockRunQueryResults: any[] = [];
let mockPaperFindResults: any[] = [];

const setupMocks = () => {
  neo4jService.setMockQueryHandler(async (cypher: string, params: any) => {
    // Return mock results sequentially or based on query patterns
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

// Test Suite
const runAllTests = async () => {
  console.log('--- STARTING SIGNAL SERVICE TESTS ---');
  setupMocks();

  try {
    // 1. Test linear regression slope helper
    console.log('Testing calculateSlope...');
    const slope1 = researchSignalService.calculateSlope({ 2022: 1, 2023: 2, 2024: 3 });
    assert.strictEqual(slope1, 1, 'Slope should be 1');

    const slope2 = researchSignalService.calculateSlope({ 2022: 10, 2023: 10, 2024: 10 });
    assert.strictEqual(slope2, 0, 'Slope should be 0 for flat line');

    const slope3 = researchSignalService.calculateSlope({ 2022: 10 });
    assert.strictEqual(slope3, 0, 'Slope should be 0 for single data point');

    // 2. Test Co-occurrence PMI & NPMI Calculations
    console.log('Testing getCooccurrences math calculations...');
    // Mock Paper count query
    mockRunQueryResults.push({
      records: [{ get: (key: string) => 10 }] // Total N = 10
    });
    // Mock getEntityFrequency results
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_a';
            if (key === 'paper_count') return 5; // freq(A) = 5
            return 1;
          }
        },
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_b';
            if (key === 'paper_count') return 2; // freq(B) = 2
            return 1;
          }
        }
      ]
    });
    // Mock cooccurrence query results
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_a_id') return 'ent_a';
            if (key === 'entity_b_id') return 'ent_b';
            if (key === 'cooccurrence_count') return 2; // cooccur = 2
            return 'Mocked';
          }
        }
      ]
    });

    const cooccurResult = await researchSignalService.getCooccurrences();
    assert.strictEqual(cooccurResult.length, 1, 'Should return 1 co-occurrence signal');
    const pair = cooccurResult[0];
    
    // pA = 5/10 = 0.5, pB = 2/10 = 0.2, pAB = 2/10 = 0.2
    // PMI = log2(0.2 / (0.5 * 0.2)) = log2(2) = 1
    // NPMI = 1 / -log2(0.2) = 1 / 2.321928 = 0.43067
    assert.ok(Math.abs(pair.pmi - 1.0) < 0.001, `PMI should be 1.0, got ${pair.pmi}`);
    assert.ok(Math.abs(pair.npmi - 0.43067) < 0.001, `NPMI should be ~0.43, got ${pair.npmi}`);

    // 3. Test Zero-probabilities handling in PMI/NPMI
    console.log('Testing co-occurrence calculations with zero occurrences...');
    mockRunQueryResults.push({
      records: [{ get: (key: string) => 10 }] // Total N = 10
    });
    mockRunQueryResults.push({
      records: [] // Frequency list is empty
    });
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_a_id') return 'ent_a';
            if (key === 'entity_b_id') return 'ent_b';
            if (key === 'cooccurrence_count') return 0; // cooccur = 0
            return 'Mocked';
          }
        }
      ]
    });
    const zeroCooccur = await researchSignalService.getCooccurrences();
    assert.strictEqual(zeroCooccur.length, 1, 'Should return 1 co-occurrence signal');
    assert.strictEqual(zeroCooccur[0].pmi, 0, 'PMI should handle zero cooccurrence count safely as 0');
    assert.strictEqual(zeroCooccur[0].npmi, -1, 'NPMI should handle zero count safely as -1');

    // 4. Test Trends calculation & classification rules
    console.log('Testing getTrends calculation & classification...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_trends';
            if (key === 'year') return 2024;
            if (key === 'count') return 1;
            return 'Mocked';
          }
        },
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_trends';
            if (key === 'year') return 2025;
            if (key === 'count') return 5;
            return 'Mocked';
          }
        }
      ]
    });

    const trends = await researchSignalService.getTrends();
    assert.strictEqual(trends.length, 1, 'Should return 1 trend');
    const t = trends[0];
    assert.strictEqual(t.total_paper_count, 6, 'Total count should be 6');
    assert.strictEqual(t.trend, 'INCREASING', 'Trend should be INCREASING');
    assert.ok(t.score > 0, `Trend score should be positive, got ${t.score}`);

    // 5. Test insufficient data in trends
    console.log('Testing trends with insufficient data...');
    mockRunQueryResults.push({
      records: [
        {
          get: (key: string) => {
            if (key === 'entity_id') return 'ent_insufficient';
            if (key === 'year') return 2025;
            if (key === 'count') return 1;
            return 'Mocked';
          }
        }
      ]
    });
    const insufficientTrends = await researchSignalService.getTrends();
    assert.strictEqual(insufficientTrends[0].trend, 'INSUFFICIENT_DATA', 'Should return INSUFFICIENT_DATA');
    assert.strictEqual(insufficientTrends[0].score, 0, 'Trend score should be 0 for insufficient data');

    console.log('--- ALL SIGNAL SERVICE TESTS PASSED ---');
  } catch (error) {
    console.error('--- SIGNAL SERVICE TESTS FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    restoreMocks();
  }
};

runAllTests();
