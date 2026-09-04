import { Request, Response, NextFunction } from 'express';
import * as evidenceValidationService from '../services/evidenceValidationService.js';
import * as neo4jService from '../services/neo4jService.js';

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
 * GET /api/v1/gaps/:gapId/validation
 * Returns validation data.
 */
export const getGapValidation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gapId } = req.params;
    await assertNeo4jConnection();

    const validation = await evidenceValidationService.validateGap(gapId);

    return res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 404;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'VALIDATION_QUERY_FAILED',
        message: error.message || 'Failed to query gap validation trail.'
      }
    });
  }
};

/**
 * POST /api/v1/gaps/:gapId/validate
 * Triggers validation (idempotent action).
 */
export const triggerGapValidation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gapId } = req.params;
    await assertNeo4jConnection();

    const validation = await evidenceValidationService.validateGap(gapId);

    return res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'VALIDATION_TRIGGER_FAILED',
        message: error.message || 'Failed to trigger gap validation.'
      }
    });
  }
};

/**
 * GET /api/v1/evidence/:evidenceId
 * Returns evidence details.
 */
export const getEvidenceDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { evidenceId } = req.params;
    await assertNeo4jConnection();

    const evidence = await evidenceValidationService.getEvidenceById(evidenceId);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: `Evidence item with ID ${evidenceId} does not exist.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'EVIDENCE_QUERY_FAILED',
        message: error.message || 'Failed to retrieve evidence details.'
      }
    });
  }
};

/**
 * GET /api/v1/evidence/paper/:paperId
 * Returns evidence items associated with a paper.
 */
export const getEvidenceByPaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paperId } = req.params;
    await assertNeo4jConnection();

    const evidence = await evidenceValidationService.getEvidenceByPaper(paperId);

    return res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'PAPER_EVIDENCE_FAILED',
        message: error.message || 'Failed to retrieve paper evidence items.'
      }
    });
  }
};
