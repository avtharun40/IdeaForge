import { Router } from 'express';
import {
  listOpportunities,
  getOpportunity,
  triggerOpportunitiesGeneration,
  updateOpportunityFeedbackState,
  getOpportunityEvidence,
  getOpportunityPapers
} from '../controllers/opportunityController.js';

const router = Router();

// Routes mapping
router.get('/', listOpportunities);
router.post('/generate', triggerOpportunitiesGeneration);
router.get('/:opportunityId', getOpportunity);
router.patch('/:opportunityId/state', updateOpportunityFeedbackState);
router.get('/:opportunityId/evidence', getOpportunityEvidence);
router.get('/:opportunityId/papers', getOpportunityPapers);

export default router;
