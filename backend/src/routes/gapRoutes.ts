import { Router } from 'express';
import {
  getGaps,
  getGapDetail,
  getGapPapers,
  getGapEvidence
} from '../controllers/gapController.js';

const router = Router();

router.get('/', getGaps);
router.get('/:gapId', getGapDetail);
router.get('/:gapId/papers', getGapPapers);
router.get('/:gapId/evidence', getGapEvidence);

export default router;
