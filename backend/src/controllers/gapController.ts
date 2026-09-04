import { Request, Response, NextFunction } from 'express';
import * as researchGapService from '../services/researchGapService.js';
import * as neo4jService from '../services/neo4jService.js';
import Paper from '../models/Paper.js';

/**
 * Helper to assert Neo4j connection and throw a clean error if offline.
 */
const assertNeo4jConnection = async () => {
  const isOnline = await neo4jService.verifyConnection();
  if (!isOnline) {
    throw new Error('Neo4j database is currently offline or unreachable. Please verify configuration.');
  }
};

/**
 * GET /api/v1/gaps
 * Returns all detected research gaps.
 */
export const getGaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();
    const gaps = await researchGapService.getAllGaps(req.query);

    return res.status(200).json({
      success: true,
      data: gaps
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GAP_QUERY_FAILED',
        message: error.message || 'Failed to query research gaps.'
      }
    });
  }
};

/**
 * GET /api/v1/gaps/:gapId
 * Returns details of a specific gap.
 */
export const getGapDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gapId } = req.params;
    await assertNeo4jConnection();

    const allGaps = await researchGapService.getAllGaps({});
    const gap = allGaps.find(g => g.gap_id === gapId);

    if (!gap) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GAP_NOT_FOUND',
          message: `Research gap with ID ${gapId} does not exist.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: gap
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GAP_DETAIL_FAILED',
        message: error.message || 'Failed to retrieve research gap details.'
      }
    });
  }
};

/**
 * GET /api/v1/gaps/:gapId/papers
 * Returns full paper details supporting the gap.
 */
export const getGapPapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gapId } = req.params;
    await assertNeo4jConnection();

    const allGaps = await researchGapService.getAllGaps({});
    const gap = allGaps.find(g => g.gap_id === gapId);

    if (!gap) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GAP_NOT_FOUND',
          message: `Research gap with ID ${gapId} does not exist.`
        }
      });
    }

    // Query papers from MongoDB by title or matching title
    const papers = await Paper.find({ title: { $in: gap.supporting_papers } });

    return res.status(200).json({
      success: true,
      data: papers
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GAP_PAPERS_FAILED',
        message: error.message || 'Failed to retrieve supporting papers.'
      }
    });
  }
};

/**
 * GET /api/v1/gaps/:gapId/evidence
 * Exposes the raw supporting evidence (signals, limitations, future work, etc.).
 */
export const getGapEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gapId } = req.params;
    await assertNeo4jConnection();

    const allGaps = await researchGapService.getAllGaps({});
    const gap = allGaps.find(g => g.gap_id === gapId);

    if (!gap) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GAP_NOT_FOUND',
          message: `Research gap with ID ${gapId} does not exist.`
        }
      });
    }

    // Expose raw supporting evidence structures
    return res.status(200).json({
      success: true,
      data: {
        gap_id: gap.gap_id,
        gap_type: gap.gap_type,
        score: gap.score,
        confidence: gap.confidence,
        supporting_entities: gap.supporting_entities,
        supporting_signals: gap.supporting_signals,
        supporting_limitations: gap.supporting_limitations,
        supporting_future_work: gap.supporting_future_work,
        evidence_count: gap.evidence_count
      }
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GAP_EVIDENCE_FAILED',
        message: error.message || 'Failed to retrieve gap evidence.'
      }
    });
  }
};
