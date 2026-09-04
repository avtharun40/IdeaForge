import { Request, Response, NextFunction } from 'express';
import * as researchSignalService from '../services/researchSignalService.js';
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
 * GET /api/v1/signals
 * Returns generalized research signals with filtering options.
 */
export const getSignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();
    const signals = await researchSignalService.getAllSignals(req.query);
    
    return res.status(200).json({
      success: true,
      data: signals
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'SIGNAL_QUERY_FAILED',
        message: error.message || 'Failed to retrieve research signals.'
      }
    });
  }
};

/**
 * GET /api/v1/signals/entities/:entityId
 * Returns signals associated with a single entity.
 */
export const getEntitySignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    await assertNeo4jConnection();
    
    const allSignals = await researchSignalService.getAllSignals({});
    const entitySignals = allSignals.filter(s => s.entity_id === entityId);
    
    return res.status(200).json({
      success: true,
      data: entitySignals
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'SIGNAL_QUERY_FAILED',
        message: error.message || 'Failed to retrieve entity-specific signals.'
      }
    });
  }
};

/**
 * GET /api/v1/signals/trends
 * Returns temporal trends of entities.
 */
export const getTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();
    const trends = await researchSignalService.getTrends(req.query);
    
    return res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'TRENDS_QUERY_FAILED',
        message: error.message || 'Failed to retrieve research trends.'
      }
    });
  }
};

/**
 * GET /api/v1/signals/cooccurrence
 * Returns significant co-occurring research entities.
 */
export const getCooccurrences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();
    const cooccurrences = await researchSignalService.getCooccurrences(req.query);
    
    return res.status(200).json({
      success: true,
      data: cooccurrences
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'COOCCURRENCE_QUERY_FAILED',
        message: error.message || 'Failed to retrieve entity co-occurrences.'
      }
    });
  }
};

/**
 * GET /api/v1/signals/cross-domain
 * Returns entities connecting multiple research domains.
 */
export const getCrossDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();
    const crossDomains = await researchSignalService.getCrossDomains();
    
    return res.status(200).json({
      success: true,
      data: crossDomains
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'CROSS_DOMAIN_QUERY_FAILED',
        message: error.message || 'Failed to retrieve cross-domain connections.'
      }
    });
  }
};
