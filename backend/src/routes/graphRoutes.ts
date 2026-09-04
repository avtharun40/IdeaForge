import { Router } from 'express';
import { 
  getFullGraph,
  getGraphStats, 
  getEntityNeighbors, 
  getEntityPapers 
} from '../controllers/graphController.js';

const router = Router();

router.get('/', getFullGraph);
router.get('/stats', getGraphStats);
router.get('/entities/:entityId/neighbors', getEntityNeighbors);
router.get('/entities/:entityId/papers', getEntityPapers);

export default router;
