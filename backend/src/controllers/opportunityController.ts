import { Request, Response, NextFunction } from 'express';
import * as opportunityEngineService from '../services/opportunityEngineService.js';
import * as evidenceValidationService from '../services/evidenceValidationService.js';
import Paper from '../models/Paper.js';

/**
 * GET /api/v1/opportunities
 * Returns filtered list of opportunities.
 */
export const listOpportunities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gap_type, min_score, validation_status, sort, page, limit, search, user_state } = req.query;

    const result = await opportunityEngineService.getOpportunities({
      gap_type,
      min_score,
      validation_status,
      sort,
      page,
      limit,
      search,
      user_state
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OPPORTUNITIES_LIST_FAILED',
        message: error.message || 'Failed to list research opportunities.'
      }
    });
  }
};

/**
 * GET /api/v1/opportunities/:opportunityId
 * Returns specific opportunity details.
 */
export const getOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId } = req.params;
    const opp = await opportunityEngineService.getOpportunityById(opportunityId);

    if (!opp) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OPPORTUNITY_NOT_FOUND',
          message: `Research opportunity with ID ${opportunityId} does not exist.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: opp
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OPPORTUNITY_DETAILS_FAILED',
        message: error.message || 'Failed to fetch opportunity details.'
      }
    });
  }
};

/**
 * POST /api/v1/opportunities/generate
 * Triggers generation of opportunities (idempotent action).
 */
export const triggerOpportunitiesGeneration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await opportunityEngineService.generateOpportunities();

    return res.status(200).json({
      success: true,
      data: {
        generated_count: count,
        message: `Successfully processed opportunities from validated literature research gaps.`
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: error.message || 'Failed to generate research opportunities.'
      }
    });
  }
};

/**
 * PATCH /api/v1/opportunities/:opportunityId/state
 * Updates user state (saved, dismissed, interesting, not_relevant).
 */
export const updateOpportunityFeedbackState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId } = req.params;
    const { state } = req.body;

    const validStates = ['none', 'saved', 'dismissed', 'interesting', 'not_relevant'];
    if (!validStates.includes(state)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK_STATE',
          message: `State must be one of: ${validStates.join(', ')}`
        }
      });
    }

    const updated = await opportunityEngineService.updateOpportunityState(opportunityId, state);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OPPORTUNITY_NOT_FOUND',
          message: `Research opportunity with ID ${opportunityId} not found.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_FEEDBACK_FAILED',
        message: error.message || 'Failed to update opportunity feedback state.'
      }
    });
  }
};

/**
 * GET /api/v1/opportunities/:opportunityId/evidence
 * Returns complete verification/evidence trail.
 */
export const getOpportunityEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId } = req.params;
    const opp = await opportunityEngineService.getOpportunityById(opportunityId);

    if (!opp) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OPPORTUNITY_NOT_FOUND',
          message: `Research opportunity with ID ${opportunityId} not found.`
        }
      });
    }

    const validation = await evidenceValidationService.validateGap(opp.gap_id);

    return res.status(200).json({
      success: true,
      data: validation.evidence_items
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OPPORTUNITY_EVIDENCE_FAILED',
        message: error.message || 'Failed to fetch opportunity evidence.'
      }
    });
  }
};

/**
 * GET /api/v1/opportunities/:opportunityId/papers
 * Returns supporting paper details.
 */
export const getOpportunityPapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId } = req.params;
    const opp = await opportunityEngineService.getOpportunityById(opportunityId);

    if (!opp) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OPPORTUNITY_NOT_FOUND',
          message: `Research opportunity with ID ${opportunityId} not found.`
        }
      });
    }

    // Resolve papers by matching their titles in MongoDB
    const papers = await Paper.find({
      title: { $in: opp.supporting_papers }
    });

    return res.status(200).json({
      success: true,
      data: papers
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OPPORTUNITY_PAPERS_FAILED',
        message: error.message || 'Failed to fetch opportunity papers.'
      }
    });
  }
};
