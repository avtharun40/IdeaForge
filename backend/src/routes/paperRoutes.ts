import { Router } from 'express';
import { 
  getPapers, 
  getPaperById, 
  uploadPaper, 
  deletePaper,
  deleteAllPapers,
  getPaperStatus,
  retryPaperProcessing,
  triggerPaperAnalysis,
  getPaperAnalysisStatus
} from '../controllers/paperController.js';
import { 
  buildGraph, 
  getPaperGraph, 
  getPaperGraphNodes, 
  getPaperGraphRelationships 
} from '../controllers/graphController.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', getPapers);
router.get('/:id', getPaperById);
router.get('/:id/status', getPaperStatus);
router.get('/:id/analysis/status', getPaperAnalysisStatus);
router.get('/:paperId/graph', getPaperGraph);
router.get('/:paperId/graph/nodes', getPaperGraphNodes);
router.get('/:paperId/graph/relationships', getPaperGraphRelationships);
router.post('/upload', uploadMiddleware, uploadPaper);
router.post('/:id/process', retryPaperProcessing);
router.post('/:id/retry', retryPaperProcessing);
router.post('/:id/analyze', triggerPaperAnalysis);
router.post('/:paperId/graph', buildGraph);
router.delete('/all', deleteAllPapers);
router.delete('/:id', deletePaper);

export default router;
