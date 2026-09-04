import { Request, Response, NextFunction } from 'express';
import * as graphBuilderService from '../services/graphBuilderService.js';
import * as graphQueryService from '../services/graphQueryService.js';
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

export const buildGraph = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paperId } = req.params;
    await assertNeo4jConnection();

    console.log(`[Graph API] Triggering graph build/update for paper: ${paperId}`);
    const result = await graphBuilderService.buildPaperGraph(paperId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    // If Neo4j is offline or query fails, return a 503 Service Unavailable or 400 Bad Request
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_BUILD_FAILED',
        message: error.message || 'Failed to construct Neo4j Knowledge Graph.'
      }
    });
  }
};

export const getPaperGraph = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paperId } = req.params;
    await assertNeo4jConnection();

    const result = await graphQueryService.getPaperGraph(paperId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};

export const getPaperGraphNodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paperId } = req.params;
    const { type, search } = req.query;
    await assertNeo4jConnection();

    const subgraph = await graphQueryService.getPaperGraph(paperId);
    let nodes = subgraph.nodes;

    // Filter by type
    if (type) {
      const typeStr = String(type).toUpperCase();
      nodes = nodes.filter(n => {
        if (n.label === 'ResearchEntity') {
          return n.properties.type === typeStr;
        }
        return n.label.toUpperCase() === typeStr;
      });
    }

    // Filter by search query
    if (search) {
      const queryStr = String(search).toLowerCase();
      nodes = nodes.filter(n => {
        const name = String(n.properties.name || n.properties.text || '').toLowerCase();
        return name.includes(queryStr);
      });
    }

    return res.status(200).json({
      success: true,
      data: nodes
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};

export const getPaperGraphRelationships = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paperId } = req.params;
    await assertNeo4jConnection();

    const subgraph = await graphQueryService.getPaperGraph(paperId);
    return res.status(200).json({
      success: true,
      data: subgraph.relationships
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};

export const getFullGraph = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 350;
    const result = await graphQueryService.getFullGraph(limit);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};

export const getGraphStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertNeo4jConnection();

    const stats = await graphQueryService.getGraphStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_STATS_FAILED',
        message: error.message
      }
    });
  }
};

export const getEntityNeighbors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    await assertNeo4jConnection();

    const neighbors = await graphQueryService.getEntityNeighbors(entityId);
    return res.status(200).json({
      success: true,
      data: neighbors
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};

export const getEntityPapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    await assertNeo4jConnection();

    const papers = await graphQueryService.getEntityPapers(entityId);
    return res.status(200).json({
      success: true,
      data: papers
    });
  } catch (error: any) {
    const status = error.message.includes('offline') ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: status === 503 ? 'NEO4J_UNAVAILABLE' : 'GRAPH_QUERY_FAILED',
        message: error.message
      }
    });
  }
};
