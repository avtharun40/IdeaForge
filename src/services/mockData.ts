import type { DashboardStats, ResearchOpportunity, Paper, ActivityItem, ResearchArea } from '../types';

export const mockStats: DashboardStats = {
  papersAnalyzed: 247,
  conceptsDiscovered: 1842,
  graphNodes: 2103,
  potentialOpportunities: 87,
  highEvidenceOpportunities: 12,
};

export const mockOpportunities: ResearchOpportunity[] = [
  {
    id: 'opp-1',
    conceptA: 'Federated Learning',
    conceptB: 'Differential Privacy Auditing',
    evidenceScore: 84,
    evidenceTier: 'HIGH',
    signals: [
      { name: 'Semantic Relevance', value: 71 },
      { name: 'Temporal Overlap', value: 88 },
      { name: 'Source Quality', value: 91 },
      { name: 'Evidence Diversity', value: 83 },
      { name: 'Technical Feasibility', value: 79 }
    ],
    opportunity_id: 'opp-1',
    gap_id: 'gap-1',
    gap_type: 'LOW_COVERAGE',
    title: 'Federated Learning + Differential Privacy Auditing',
    summary: 'Mock federated learning opportunity',
    problem: '',
    existing_research: '',
    gap_description: '',
    proposed_direction: '',
    why_it_matters: '',
    score: 84,
    confidence: 0.9,
    novelty_score: 80,
    evidence_score: 84,
    feasibility_score: 79,
    impact_score: 83,
    trend_score: 88,
    supporting_papers: [],
    supporting_entities: [],
    supporting_claims: [],
    limitations: [],
    future_work: [],
    validation_status: 'SUPPORTED',
    user_state: 'none'
  },
  {
    id: 'opp-2',
    conceptA: 'Computer Vision',
    conceptB: 'Edge AI',
    evidenceScore: 79,
    evidenceTier: 'HIGH',
    opportunity_id: 'opp-2',
    gap_id: 'gap-2',
    gap_type: 'CROSS_DOMAIN',
    title: 'Computer Vision + Edge AI',
    summary: 'Mock edge computer vision opportunity',
    problem: '',
    existing_research: '',
    gap_description: '',
    proposed_direction: '',
    why_it_matters: '',
    score: 79,
    confidence: 0.8,
    novelty_score: 85,
    evidence_score: 79,
    feasibility_score: 75,
    impact_score: 80,
    trend_score: 70,
    supporting_papers: [],
    supporting_entities: [],
    supporting_claims: [],
    limitations: [],
    future_work: [],
    validation_status: 'SUPPORTED',
    user_state: 'none'
  },
  {
    id: 'opp-3',
    conceptA: 'Multimodal Learning',
    conceptB: 'Robotics',
    evidenceScore: 76,
    evidenceTier: 'MEDIUM',
    opportunity_id: 'opp-3',
    gap_id: 'gap-3',
    gap_type: 'UNDEREXPLORED_COMBINATION',
    title: 'Multimodal Learning + Robotics',
    summary: 'Mock multimodal robotics opportunity',
    problem: '',
    existing_research: '',
    gap_description: '',
    proposed_direction: '',
    why_it_matters: '',
    score: 76,
    confidence: 0.75,
    novelty_score: 90,
    evidence_score: 76,
    feasibility_score: 82,
    impact_score: 78,
    trend_score: 75,
    supporting_papers: [],
    supporting_entities: [],
    supporting_claims: [],
    limitations: [],
    future_work: [],
    validation_status: 'PARTIALLY_SUPPORTED',
    user_state: 'none'
  }
];

export const mockPapers: Paper[] = [
  {
    id: '600000000000000000000001',
    title: 'Federated Learning Privacy Mechanisms',
    authors: [{ name: 'A. Smith' }, { name: 'B. Johnson' }],
    year: 2025,
    researchArea: 'Machine Learning',
    conceptCount: 18,
    status: 'Ready',
    dateAdded: '2026-08-20',
    abstract: 'This paper investigates privacy-preserving mechanisms in federated learning environments. We propose a decentralized verification scheme that allows client nodes to inspect update aggregation without disclosing local parameters, utilizing localized zero-knowledge proofs combined with noise verification metrics.',
    concepts: [
      { id: 'c1', name: 'Federated Learning', description: 'A decentralized machine learning framework that trains models across edge nodes holding local data samples without exchanging them.' },
      { id: 'c2', name: 'Differential Privacy', description: 'A mathematical framework for limiting the disclosure of personal information in query outputs by adding calibrated statistical noise.' }
    ],
    methods: [
      { id: 'm1', name: 'FedAvg aggregation', description: 'The standard algorithms for averaging model updates in distributed parameters networks.' },
      { id: 'm2', name: 'Secure Multi-Party Computation', description: 'A subfield of cryptography enabling parties to jointly compute a function over their inputs while keeping them private.' }
    ],
    datasets: [
      { id: 'd1', name: 'CIFAR-10', description: 'A collection of labeled training images commonly used to evaluate vision and federated classifier performance.' },
      { id: 'd2', name: 'MNIST digits', description: 'A benchmark dataset of handwritten digits used for baseline federated model debugging.' }
    ],
    limitations: [
      'High communication bandwidth overhead during verification verification checks.',
      'Scale complexity limits active participation bounds on edge nodes.'
    ],
    futureWork: [
      'Researching audit trail validation protocols for large-scale peer-to-peer networks.',
      'Optimizing cryptographic proof compilation times for mobile hardware constraints.'
    ],
    relatedPapers: [
      'Differential Privacy in Distributed Systems',
      'Privacy-Preserving Machine Learning'
    ]
  },
  {
    id: '600000000000000000000002',
    title: 'Differential Privacy in Distributed Systems',
    authors: [{ name: 'C. Davis' }, { name: 'D. Miller' }],
    year: 2025,
    researchArea: 'Privacy',
    conceptCount: 23,
    status: 'Ready',
    dateAdded: '2026-08-21',
    abstract: 'We analyze the application of differential privacy techniques in distributed database systems. The study covers privacy leakage auditing parameters under dynamic client joins and drops, proposing an active querying noise injector that adapts to database density variables.',
    concepts: [
      { id: 'c2', name: 'Differential Privacy', description: 'A mathematical framework for limiting data disclosure by adding statistical noise.' },
      { id: 'c3', name: 'Privacy Auditing', description: 'The process of calculating and measuring the actual information leakage from model parameter updates.' }
    ],
    methods: [
      { id: 'm3', name: 'Laplace Noise Injection', description: 'Calibrating and applying Laplace-distributed noise directly to aggregate parameters.' },
      { id: 'm4', name: 'Renyi Differential Privacy', description: 'A generalization of differential privacy using Renyi divergence to track cumulative privacy budgets.' }
    ],
    datasets: [
      { id: 'd3', name: 'US Census Microdata', description: 'A demographic dataset used to validate privacy budget bounds under high query rates.' }
    ],
    limitations: [
      'Trade-off between utility accuracy and noise density is highly sensitive.',
      'Assumes a semi-honest aggregator node model.'
    ],
    futureWork: [
      'Developing automated auditing framework integrations for relational query nodes.',
      'Dynamic budget reallocation protocols under multi-analyst querying models.'
    ],
    relatedPapers: [
      'Federated Learning Privacy Mechanisms',
      'Privacy-Preserving Machine Learning'
    ]
  },
  {
    id: '600000000000000000000003',
    title: 'Edge AI for Resource-Constrained Devices',
    authors: [{ name: 'E. Wilson' }, { name: 'F. Thomas' }],
    year: 2024,
    researchArea: 'Edge Computing',
    conceptCount: 15,
    status: 'Processing',
    dateAdded: '2026-08-23'
  },
  {
    id: '600000000000000000000004',
    title: 'Multimodal Learning for Robotics',
    authors: [{ name: 'G. Martinez' }, { name: 'H. Anderson' }],
    year: 2024,
    researchArea: 'Robotics',
    conceptCount: 21,
    status: 'Ready',
    dateAdded: '2026-08-24',
    abstract: 'This research presents a novel multimodal perception system for autonomous robotic manipulation. By fusing visual camera feeds with tactile and audio sensor arrays, we establish a robust spatial state representation that improves robot grasping accuracy under changing lighting conditions.',
    concepts: [
      { id: 'c4', name: 'Multimodal Learning', description: 'Combining and modeling information from multiple sensory modalities (visual, tactile, auditory) to improve prediction accuracy.' },
      { id: 'c5', name: 'Robotic Manipulation', description: 'Planning and execution algorithms enabling mechanical grippers to grasp and relocate complex geometry objects.' }
    ],
    methods: [
      { id: 'm5', name: 'Tactile-Visual Fusion Network', description: 'A neural network architecture that aligns and fuses temporal visual features with tactile frequency metrics.' },
      { id: 'm6', name: 'Reinforcement Learning with Action Masking', description: 'Training robotic policies with safety constraints to prevent mechanical collision damage.' }
    ],
    datasets: [
      { id: 'd4', name: 'RoboNet Manipulation Data', description: 'A multi-modal dataset containing over 15,000 grasping attempts across diverse industrial robots.' }
    ],
    limitations: [
      'High latency in sensor synchronization networks.',
      'Grasping policies fail to generalize to transparent or reflective surfaces.'
    ],
    futureWork: [
      'Integrating high-frequency real-time edge fusion nodes.',
      'Sim-to-real transfer optimization via domains randomization techniques.'
    ],
    relatedPapers: [
      'Edge AI for Resource-Constrained Devices'
    ]
  },
  {
    id: '600000000000000000000005',
    title: 'Privacy-Preserving Machine Learning',
    authors: [{ name: 'I. Taylor' }, { name: 'J. White' }],
    year: 2024,
    researchArea: 'Machine Learning',
    conceptCount: 17,
    status: 'Failed',
    dateAdded: '2026-08-25'
  }
];

export const mockActivity: ActivityItem[] = [
  { id: 'act-1', text: 'Paper corpus updated', time: '10 mins ago' },
  { id: 'act-2', text: '12 papers analyzed', time: '1 hour ago' },
  { id: 'act-3', text: '3 new concepts discovered', time: '2 hours ago' },
  { id: 'act-4', text: '2 candidate opportunities identified', time: '4 hours ago' },
  { id: 'act-5', text: '1 opportunity received high evidence confidence', time: '1 day ago' }
];

export const mockResearchAreas: ResearchArea[] = [
  { id: 'area-1', name: 'Artificial Intelligence', count: 184 },
  { id: 'area-2', name: 'Machine Learning', count: 156 },
  { id: 'area-3', name: 'Computer Vision', count: 98 },
  { id: 'area-4', name: 'Robotics', count: 74 },
  { id: 'area-5', name: 'Privacy', count: 62 },
  { id: 'area-6', name: 'Edge Computing', count: 45 }
];
