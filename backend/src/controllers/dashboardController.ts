import { Request, Response, NextFunction } from 'express';
import Paper from '../models/Paper.js';
import * as neo4jService from '../services/neo4jService.js';
import * as researchGapService from '../services/researchGapService.js';
import * as opportunityEngineService from '../services/opportunityEngineService.js';
import * as researchSignalService from '../services/researchSignalService.js';
import { toNum } from '../utils/neo4jHelpers.js';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Papers Analyzed
    const papersAnalyzed = await Paper.countDocuments({ status: 'ready' });

    if (papersAnalyzed === 0) {
      return res.status(200).json({
        success: true,
        data: {
          stats: {
            papersAnalyzed: 0,
            conceptsDiscovered: 0,
            graphNodes: 0,
            potentialOpportunities: 0,
            savedOpportunities: 0,
            researchGapsCount: 0
          },
          opportunities: [],
          domains: [],
          signals: [],
          activities: []
        }
      });
    }

    // 2. Neo4j Node and Concept Counts
    let conceptsDiscovered = 0;
    let graphNodes = 0;

    const isGraphOnline = await neo4jService.verifyConnection();
    if (isGraphOnline) {
      try {
        const activePapers = await Paper.find({ status: 'ready' }, '_id');
        const activePaperIds = activePapers.map(p => String(p._id));

        const conceptsRes = await neo4jService.runQuery(`
          MATCH (p:Paper)-[:MENTIONS|USES_METHOD|USES_DATASET]->(n:ResearchEntity)
          WHERE p.paper_id IN $activePaperIds
          RETURN count(distinct n) as c
        `, { activePaperIds });
        conceptsDiscovered = toNum(conceptsRes.records[0]?.get('c'));

        const nodesRes = await neo4jService.runQuery(`
          MATCH (p:Paper)
          WHERE p.paper_id IN $activePaperIds
          OPTIONAL MATCH (p)-[:MENTIONS|USES_METHOD|USES_DATASET]->(n:ResearchEntity)
          OPTIONAL MATCH (p)-[:MAKES_CLAIM]->(c:Claim)
          OPTIONAL MATCH (p)-[:HAS_LIMITATION]->(l:Limitation)
          OPTIONAL MATCH (p)-[:HAS_FUTURE_WORK]->(f:FutureWork)
          RETURN count(distinct p) + count(distinct n) + count(distinct c) + count(distinct l) + count(distinct f) as c
        `, { activePaperIds });
        graphNodes = toNum(nodesRes.records[0]?.get('c'));
      } catch (e) {
        console.error('Error fetching graph dashboard counts:', e);
      }
    }

    // 3. Research Gaps count
    let researchGapsCount = 0;
    try {
      const gaps = await researchGapService.getAllGaps({});
      researchGapsCount = gaps.length;
    } catch (e) {
      console.error('Error loading dashboard gaps:', e);
    }

    // 4. Opportunities stats
    let opportunities: any[] = [];
    let savedCount = 0;
    try {
      const oppResult = await opportunityEngineService.getOpportunities({ limit: 5 });
      opportunities = oppResult.data;
      
      const savedRes = await opportunityEngineService.getOpportunities({ user_state: 'saved', limit: 100 });
      savedCount = savedRes.total;
    } catch (e) {
      console.error('Error loading dashboard opportunities:', e);
    }

    // 5. Emerging Research Areas / Domains
    const domainsList: { name: string; value: number }[] = [];
    try {
      const allPapers = await Paper.find({ status: 'ready' }, 'researchArea');
      const domainMap = new Map<string, number>();
      allPapers.forEach(p => {
        const domain = p.researchArea || 'General';
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      });
      domainMap.forEach((val, key) => {
        domainsList.push({ name: key, value: val });
      });
    } catch (e) {}

    // 6. Strongest Signals (Top trend signals)
    let signals: any[] = [];
    try {
      const sigList = await researchSignalService.getAllSignals({ type: 'trend', limit: 5 });
      signals = sigList.map(s => ({
        name: s.entity_name,
        value: s.score || 70
      }));
    } catch (e) {}

    // 7. Recent Papers Timeline Activity
    const timelineActivities: { date: string; action: string; details: string }[] = [];
    try {
      const recent = await Paper.find({ status: 'ready' }).sort({ createdAt: -1 }).limit(5);
      recent.forEach(p => {
        timelineActivities.push({
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent',
          action: 'Publication Indexed',
          details: `Processed paper "${p.title}"`
        });
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          papersAnalyzed,
          conceptsDiscovered,
          graphNodes,
          potentialOpportunities: opportunities.length,
          savedOpportunities: savedCount,
          researchGapsCount
        },
        opportunities,
        domains: domainsList.slice(0, 5),
        signals: signals.slice(0, 5),
        activities: timelineActivities.slice(0, 5)
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DASHBOARD_STATS_FAILED',
        message: error.message || 'Failed to query dashboard statistics.'
      }
    });
  }
};
