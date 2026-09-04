import { Router } from 'express';
import {
  getSignals,
  getEntitySignals,
  getTrends,
  getCooccurrences,
  getCrossDomain
} from '../controllers/signalController.js';

const router = Router();

router.get('/', getSignals);
router.get('/entities/:entityId', getEntitySignals);
router.get('/trends', getTrends);
router.get('/cooccurrence', getCooccurrences);
router.get('/cross-domain', getCrossDomain);

export default router;
