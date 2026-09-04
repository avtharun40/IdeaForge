import assert from 'node:assert';
import * as opportunityEngineService from '../services/opportunityEngineService.js';
import Paper from '../models/Paper.js';
import ResearchOpportunity from '../models/ResearchOpportunity.js';
import * as neo4jService from '../services/neo4jService.js';

const storedOpportunities: any[] = [];

const setupMocks = () => {
  neo4jService.setMockQueryHandler(async () => ({ records: [] }));

  (Paper as any).find = async () => [
    { _id: 'paper_1', title: 'Permutation Equivariant Neural Controlled', year: 2023 }
  ];

  (ResearchOpportunity as any).findOneAndUpdate = async (query: any, update: any) => {
    const oppId = query.opportunity_id;
    const existingIdx = storedOpportunities.findIndex(o => o.opportunity_id === oppId);
    const doc = { ...(existingIdx >= 0 ? storedOpportunities[existingIdx] : {}), ...update, opportunity_id: oppId };
    if (existingIdx >= 0) storedOpportunities[existingIdx] = doc;
    else storedOpportunities.push(doc);
    return doc;
  };
};

const runBug10Tests = async () => {
  console.log('--- STARTING BUG 10 OPPORTUNITY ENTITY NAME VERIFICATION ---');
  setupMocks();

  // TEST 1: UNRESOLVED_FUTURE_WORK with real resolved entities
  const fwGap = {
    gap_id: 'gap_fw_test_1',
    gap_type: 'UNRESOLVED_FUTURE_WORK',
    title: 'Unresolved future-work direction from 2023',
    description: 'The future-work direction was proposed in the 2023 paper.',
    score: 85,
    confidence: 0.85,
    supporting_entities: ['Neural Controlled Differential Equations (Neural CDEs)', 'Permutation Equivariance'],
    supporting_papers: ['Permutation Equivariant Neural Controlled'],
    supporting_limitations: [],
    supporting_future_work: ['Adapting advanced Euclidean CDE solvers to the graph setting'],
    evidence_count: 1,
    customValidation: {
      gap_id: 'gap_fw_test_1',
      status: 'SUPPORTED',
      evidence_count: 3,
      unique_papers: 1,
      confidence: 0.85,
      evidence_items: [
        { evidence_type: 'FUTURE_WORK_SUPPORT', text: 'Adapting advanced Euclidean CDE solvers', confidence: 0.85, relevance_score: 90 }
      ],
      contradictions: []
    }
  };

  storedOpportunities.length = 0;
  await opportunityEngineService.generateOpportunities([fwGap]);
  assert.strictEqual(storedOpportunities.length, 1, 'Generates 1 opportunity for UNRESOLVED_FUTURE_WORK');

  const opp1 = storedOpportunities[0];
  console.log('Test 1 Generated Title:', opp1.title);
  console.log('Test 1 Generated Summary:', opp1.summary);
  console.log('Test 1 ConceptA:', opp1.conceptA);
  console.log('Test 1 ConceptB:', opp1.conceptB);

  // Check title
  assert.ok(!opp1.title.includes('Advancing :'), 'Title must not be Advancing :');
  assert.strictEqual(
    opp1.title,
    'Advancing Neural Controlled Differential Equations (Neural CDEs) & Permutation Equivariance: An Evidence-Backed Research Opportunity'
  );

  // Check summary
  assert.ok(!opp1.summary.includes('focusing on ""'), 'Summary must not be focusing on ""');
  assert.ok(
    opp1.summary.includes('Neural Controlled Differential Equations (Neural CDEs)'),
    'Summary must mention the real entity name'
  );

  // Check concepts
  assert.strictEqual(opp1.conceptA, 'Neural Controlled Differential Equations (Neural CDEs)');
  assert.strictEqual(opp1.conceptB, 'Permutation Equivariance');

  // Check scoring preservation
  assert.ok(opp1.score > 0, 'Score is calculated');
  assert.ok(opp1.novelty_score > 0, 'Novelty score is preserved');
  assert.ok(opp1.evidence_score > 0, 'Evidence score is preserved');
  assert.ok(opp1.impact_score > 0, 'Impact score is preserved');
  assert.ok(opp1.feasibility_score > 0, 'Feasibility score is preserved');
  assert.ok(opp1.trend_score > 0, 'Trend score is preserved');

  // TEST 2: Safety Guard when entity is genuinely unresolvable
  const emptyGap = {
    gap_id: 'gap_fw_empty',
    gap_type: 'UNRESOLVED_FUTURE_WORK',
    title: 'Unresolved future-work',
    description: 'Unresolved direction',
    score: 80,
    confidence: 0.8,
    supporting_entities: [],
    supporting_papers: ['Some Paper'],
    supporting_limitations: [],
    supporting_future_work: ['Some text'],
    evidence_count: 1,
    customValidation: {
      gap_id: 'gap_fw_empty',
      status: 'SUPPORTED',
      evidence_count: 1,
      unique_papers: 1,
      confidence: 0.8,
      evidence_items: [],
      contradictions: []
    }
  };

  storedOpportunities.length = 0;
  await opportunityEngineService.generateOpportunities([emptyGap]);
  const opp2 = storedOpportunities[0];
  console.log('Test 2 Safety Guard Title:', opp2.title);
  console.log('Test 2 Safety Guard Summary:', opp2.summary);
  console.log('Test 2 Safety Guard ConceptA:', opp2.conceptA);

  assert.ok(!opp2.title.includes('Advancing :'), 'Must not produce Advancing :');
  assert.strictEqual(opp2.title, 'Advancing [Unresolved Concept]: An Evidence-Backed Research Opportunity');
  assert.ok(!opp2.summary.includes('focusing on ""'), 'Must not produce focusing on ""');
  assert.ok(opp2.summary.includes('focusing on "[Unresolved Concept]"'), 'Must use explicit [Unresolved Concept] fallback');
  assert.strictEqual(opp2.conceptA, '[Unresolved Concept]');
  assert.strictEqual(opp2.conceptB, '[Unresolved Concept]');

  // TEST 3: REPEATED_LIMITATION
  const limGap = {
    gap_id: 'gap_lim_test',
    gap_type: 'REPEATED_LIMITATION',
    title: 'Repeated limitation',
    description: 'Reward clipping constraints',
    score: 82,
    confidence: 0.9,
    supporting_entities: ['Reward Clipping', 'Deep Q-Network (DQN)'],
    supporting_papers: ['Atari Paper'],
    supporting_limitations: ['Clipping rewards to +1 and -1'],
    supporting_future_work: [],
    evidence_count: 2,
    customValidation: {
      gap_id: 'gap_lim_test',
      status: 'SUPPORTED',
      evidence_count: 2,
      unique_papers: 1,
      confidence: 0.9,
      evidence_items: [],
      contradictions: []
    }
  };

  storedOpportunities.length = 0;
  await opportunityEngineService.generateOpportunities([limGap]);
  const opp3 = storedOpportunities[0];
  console.log('Test 3 Repeated Limitation Title:', opp3.title);
  assert.strictEqual(opp3.title, 'Advancing Reward Clipping & Deep Q-Network (DQN): An Evidence-Backed Research Opportunity');
  assert.strictEqual(opp3.conceptA, 'Reward Clipping');
  assert.strictEqual(opp3.conceptB, 'Deep Q-Network (DQN)');

  console.log('--- ALL BUG 10 VERIFICATION TESTS PASSED ---');
};

runBug10Tests().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
