import assert from 'node:assert';
import * as neo4jService from '../services/neo4jService.js';
import * as opportunityEngineService from '../services/opportunityEngineService.js';
import Paper from '../models/Paper.js';
import ResearchOpportunity from '../models/ResearchOpportunity.js';

// Mocks setup
const originalPaperFind = Paper.find;
const originalFindOneAndUpdate = ResearchOpportunity.findOneAndUpdate;
const originalCountDocuments = ResearchOpportunity.countDocuments;
const originalFind = ResearchOpportunity.find;
const originalFindOne = ResearchOpportunity.findOne;

let mockPaperFindResults: any[] = [];
const storedOpportunities: any[] = [];

const setupMocks = () => {
  neo4jService.setMockQueryHandler(async () => {
    return { records: [] };
  });

  (Paper as any).find = async () => {
    return mockPaperFindResults;
  };

  // Mongoose Opportunity mocks
  (ResearchOpportunity as any).findOneAndUpdate = async (query: any, update: any, options: any) => {
    const oppId = query.opportunity_id;
    const existingIdx = storedOpportunities.findIndex(o => o.opportunity_id === oppId);
    
    let doc = existingIdx >= 0 ? storedOpportunities[existingIdx] : { user_state: 'none' };
    
    // Apply updates
    doc = {
      ...doc,
      ...update,
      opportunity_id: oppId
    };

    if (existingIdx >= 0) {
      storedOpportunities[existingIdx] = doc;
    } else {
      storedOpportunities.push(doc);
    }
    return doc;
  };

  (ResearchOpportunity as any).countDocuments = async (query: any) => {
    return storedOpportunities.length;
  };

  (ResearchOpportunity as any).findOne = async (query: any) => {
    return storedOpportunities.find(o => o.opportunity_id === query.opportunity_id) || null;
  };

  (ResearchOpportunity as any).find = () => {
    const builder = {
      sort: () => builder,
      skip: () => builder,
      limit: (n: number) => {
        return storedOpportunities.slice(0, n);
      }
    };
    return builder as any;
  };
};

const restoreMocks = () => {
  neo4jService.setMockQueryHandler(null);
  (Paper as any).find = originalPaperFind;
  ResearchOpportunity.findOneAndUpdate = originalFindOneAndUpdate;
  ResearchOpportunity.countDocuments = originalCountDocuments;
  ResearchOpportunity.find = originalFind;
  ResearchOpportunity.findOne = originalFindOne;
};

// Test Runner
const runAllTests = async () => {
  console.log('--- STARTING OPPORTUNITY ENGINE TESTS ---');
  setupMocks();

  try {
    // Setup gap with customValidation attached
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
      supporting_future_work: ['Extend decentralized protocols to larger nodes'],
      evidence_count: 5,
      customValidation: {
        gap_id: 'gap_test_1',
        status: 'SUPPORTED',
        evidence_count: 4,
        unique_papers: 2,
        confidence: 0.9,
        evidence_items: [
          { evidence_type: 'DIRECT_CLAIM', text: 'Differential privacy works', confidence: 0.9, relevance_score: 95 }
        ],
        contradictions: []
      }
    };

    mockPaperFindResults = [{ _id: 'paper_a', title: 'Paper Title A', year: 2024 }];

    // 1. Test Opportunity Generation and Scoring
    console.log('Testing generateOpportunities and score calculations...');
    storedOpportunities.length = 0; // Clear stored
    const generatedCount = await opportunityEngineService.generateOpportunities([mockGap]);
    assert.strictEqual(generatedCount, 1, 'Should process 1 validated gap');
    assert.strictEqual(storedOpportunities.length, 1, 'Should store 1 opportunity record');

    const opp = storedOpportunities[0];
    assert.strictEqual(opp.validation_status, 'SUPPORTED');
    assert.ok(opp.score >= 0 && opp.score <= 100, 'Score is bounded between 0-100');
    assert.ok(opp.novelty_score >= 0 && opp.novelty_score <= 100);
    assert.ok(opp.evidence_score >= 0 && opp.evidence_score <= 100);
    assert.ok(opp.impact_score >= 0 && opp.impact_score <= 100);
    assert.ok(opp.feasibility_score >= 0 && opp.feasibility_score <= 100);
    assert.ok(opp.trend_score >= 0 && opp.trend_score <= 100);
    assert.strictEqual(opp.user_state, 'none', 'Initially set feedback state to none');

    // 2. Test status exclusions (skip CONTRADICTED)
    console.log('Testing skip index (CONTRADICTED status exclusion)...');
    mockGap.customValidation.status = 'CONTRADICTED';
    storedOpportunities.length = 0;
    const skippedCount = await opportunityEngineService.generateOpportunities([mockGap]);
    assert.strictEqual(skippedCount, 0, 'Skips contradicted gap candidates');
    assert.strictEqual(storedOpportunities.length, 0, 'No opportunity created');

    // Restore status to SUPPORTED
    mockGap.customValidation.status = 'SUPPORTED';

    // 3. Test Idempotency (preserve user state)
    console.log('Testing generation idempotency and state retention...');
    storedOpportunities.length = 0;
    await opportunityEngineService.generateOpportunities([mockGap]);
    // Simulate user saving the opportunity
    storedOpportunities[0].user_state = 'saved';
    
    // Regenerate
    await opportunityEngineService.generateOpportunities([mockGap]);
    assert.strictEqual(storedOpportunities.length, 1, 'Upsert does not duplicate opportunity');
    assert.strictEqual(storedOpportunities[0].user_state, 'saved', 'Regeneration preserves saved feedback state');

    // 4. Test state updates
    console.log('Testing updateOpportunityState...');
    const updated = await opportunityEngineService.updateOpportunityState('opp_gap_test_1', 'dismissed');
    assert.strictEqual(updated.user_state, 'dismissed', 'Opportunity marked as dismissed');
    
    // Find it
    const found = await opportunityEngineService.getOpportunityById('opp_gap_test_1');
    assert.strictEqual(found.user_state, 'dismissed');

    console.log('--- ALL OPPORTUNITY ENGINE TESTS PASSED ---');
  } catch (error) {
    console.error('--- OPPORTUNITY ENGINE TESTS FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    restoreMocks();
  }
};

runAllTests();
