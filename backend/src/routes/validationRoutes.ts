import { Router } from 'express';
import {
  getGapValidation,
  triggerGapValidation,
  getEvidenceDetails,
  getEvidenceByPaper
} from '../controllers/validationController.js';

const router = Router();

// Routes mapping
router.get('/gaps/:gapId/validation', getGapValidation);
router.post('/gaps/:gapId/validate', triggerGapValidation);
router.get('/evidence/:evidenceId', getEvidenceDetails);
router.get('/evidence/paper/:paperId', getEvidenceByPaper);

export default router;
