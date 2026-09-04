import { Request, Response, NextFunction } from 'express';
import { 
  queryPapers, 
  fetchPaperById, 
  createPaperRecord, 
  deletePaperRecord,
  deleteAllPapersRecord
} from '../services/paperService.js';
import { processPaper } from '../services/paperProcessingService.js';
import { analyzePaper } from '../services/aiPaperAnalysisService.js';

export const getPapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, researchArea, year } = req.query;
    
    const papers = await queryPapers({
      search: search as string,
      status: status as string,
      researchArea: researchArea as string,
      year: year as string
    });

    return res.status(200).json({
      success: true,
      data: papers
    });
  } catch (error) {
    next(error);
  }
};

export const getPaperById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const paper = await fetchPaperById(id);
    
    return res.status(200).json({
      success: true,
      data: paper
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file!;
    const metadata = req.body;
    
    const paper = await createPaperRecord(file, metadata);
    
    // Respond immediately with HTTP 202 Accepted
    res.status(202).json({
      success: true,
      message: 'Ingestion triggered',
      data: paper
    });

    // Dispatch background ingestion job safely
    setImmediate(() => {
      processPaper(paper.id).catch((err) => {
        console.error(`Background processing trigger failed for paper ${paper.id}:`, err);
      });
    });

    return;
  } catch (error) {
    next(error);
  }
};

export const deletePaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await deletePaperRecord(id);
    
    return res.status(200).json({
      success: true,
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllPapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteAllPapersRecord();
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'All papers and knowledge graph data successfully deleted.',
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPaperStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const paper = await fetchPaperById(id);
    
    return res.status(200).json({
      success: true,
      data: {
        id: paper.id,
        status: paper.status,
        processingStage: paper.processingStage || (paper.status === 'ready' ? 'completed' : paper.status),
        processingProgress: paper.processingProgress !== undefined ? paper.processingProgress : (paper.status === 'ready' ? 100 : 0),
        processingMessage: paper.processingMessage || (paper.status === 'ready' ? 'Completed' : 'Processing...'),
        processingError: paper.processingError
      }
    });
  } catch (error) {
    next(error);
  }
};

export const retryPaperProcessing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Verify paper exists and reset status
    const paper = await fetchPaperById(id);
    paper.status = 'processing';
    paper.processingStage = 'queued';
    paper.processingProgress = 0;
    paper.processingMessage = 'Ingestion queued';
    paper.processingError = null;
    await paper.save();
    
    // Return HTTP 202 Accepted immediately
    res.status(202).json({
      success: true,
      message: 'Ingestion triggered',
      data: {
        id,
        status: 'processing',
        processingStage: 'queued',
        processingProgress: 0
      }
    });

    // Re-trigger background processing asynchronously (non-blocking)
    setImmediate(() => {
      processPaper(id).catch((err) => {
        console.error(`Background retry processing failed for paper ${id}:`, err);
      });
    });

    return;
  } catch (error) {
    next(error);
  }
};

export const triggerPaperAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Verify paper exists
    await fetchPaperById(id);
    
    // Trigger AI analysis in the background asynchronously (non-blocking) with force=true for manual retries
    analyzePaper(id, true).catch((err) => {
      console.error(`[AI] Background analysis failed for paper ${id}:`, err);
    });

    return res.status(200).json({
      success: true,
      data: {
        paperId: id,
        status: 'processing'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPaperAnalysisStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const paper = await fetchPaperById(id);
    
    return res.status(200).json({
      success: true,
      data: {
        paperId: paper.id,
        status: paper.aiAnalysis?.status || 'pending',
        provider: paper.aiAnalysis?.provider || 'gemini',
        model: paper.aiAnalysis?.model || process.env.AI_MODEL || 'gemini-1.5-flash',
        analyzedAt: paper.aiAnalysis?.analyzedAt || null,
        error: paper.aiAnalysis?.error || null
      }
    });
  } catch (error) {
    next(error);
  }
};
