import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Lightbulb, Network, Activity, Loader2 } from 'lucide-react';
import { getDashboardStats } from '../../services/dashboardService';
import type { DashboardStats } from '../../services/dashboardService';
import { getPapers } from '../../services/paperService';
import type { RecentPaper } from '../../types';

// Components
import StatCard from '../../components/dashboard/StatCard';
import OpportunityCard from '../../components/dashboard/OpportunityCard';
import SignalBar from '../../components/dashboard/SignalBar';
import RecentPapers from '../../components/dashboard/RecentPapers';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import ResearchAreas from '../../components/dashboard/ResearchAreas';

const DashboardPage: React.FC = () => {
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [recentPapers, setRecentPapers] = useState<RecentPaper[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let intervalId: any = null;

    const loadDashboard = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const stats = await getDashboardStats();
        setStatsData(stats);

        // Fetch recent papers
        const data = await getPapers();
        let papersList: RecentPaper[] = [];
        if (data && data.length > 0) {
          papersList = data.slice(0, 5).map(p => ({
            id: p.id,
            title: p.title,
            year: p.year,
            conceptCount: p.conceptCount,
            status: p.status
          }));
        }
        setRecentPapers(papersList);

        if (stats && stats.opportunities && stats.opportunities.length > 0) {
          setSelectedOppId(prev => prev || stats.opportunities[0].opportunity_id);
        }

        // Manage polling based on status
        const hasProcessing = papersList.some(p => String(p.status).toLowerCase() === 'processing');
        if (hasProcessing) {
          if (!intervalId) {
            console.log('[Polling] A paper is processing. Starting polling every 8s...');
            intervalId = setInterval(() => {
              loadDashboard(true);
            }, 8000);
          }
        } else {
          if (intervalId) {
            console.log('[Polling] All papers finished processing. Stopping polling...');
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    loadDashboard(false);

    return () => {
      if (intervalId) {
        console.log('[Polling] Cleaning up interval timer on unmount.');
        clearInterval(intervalId);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Dashboard Analytics...</p>
      </div>
    );
  }

  const stats = statsData?.stats || {
    papersAnalyzed: 0,
    conceptsDiscovered: 0,
    graphNodes: 0,
    potentialOpportunities: 0,
    savedOpportunities: 0,
    researchGapsCount: 0
  };

  const opportunities = statsData?.opportunities || [];
  
  // Map domains to ResearchArea type
  const domains = (statsData?.domains || []).map((d: any) => ({
    id: d.name,
    name: d.name,
    count: d.value
  }));

  // Map activities to ActivityItem type
  const activities = (statsData?.activities || []).map((a: any, idx: number) => ({
    id: String(idx),
    text: `${a.action}: ${a.details}`,
    time: a.date
  }));

  const selectedOpp = opportunities.find(opp => opp.opportunity_id === selectedOppId) || opportunities[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* Overview Statistics Grid */}
      <section className="stats-grid" id="tour-dashboard-stats" style={{ padding: 0 }}>
        <StatCard 
          title="Papers Analyzed" 
          value={stats.papersAnalyzed} 
          icon={<FileText size={20} />} 
        />
        <StatCard 
          title="Concepts Discovered" 
          value={stats.conceptsDiscovered} 
          icon={<Activity size={20} />} 
        />
        <StatCard 
          title="Graph Nodes" 
          value={stats.graphNodes} 
          icon={<Network size={20} />} 
        />
        <StatCard 
          title="Ranked Opportunities" 
          value={stats.potentialOpportunities} 
          icon={<Lightbulb size={20} />} 
          secondaryText={`${stats.savedOpportunities} Saved Targets`}
        />
      </section>

      {/* Main Grid: Opportunities + Signal Breakdown (Left) vs. Recent Papers (Right) */}
      <div className="dashboard-grid-2">
        
        {/* Left Column: Opportunities List & Selected Signal Details */}
        <section style={{ padding: 0 }}>
          <h3 className="dashboard-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Top Research Opportunities</span>
            <Link to="/opportunities" style={{ fontSize: '12px', color: 'var(--accent-light)', fontWeight: 500 }}>
              View All Opportunities &rarr;
            </Link>
          </h3>
          
          <div className="opportunities-list-container" style={{ marginBottom: '32px' }}>
            {opportunities.map((opp) => {
              const oppId = opp.opportunity_id || (opp as any)._id || '';
              return (
                <OpportunityCard 
                  key={oppId} 
                  opportunity={{
                    id: oppId,
                    opportunity_id: oppId,
                    conceptA: opp.conceptA || opp.supporting_entities?.[0] || '[Unresolved Concept]',
                    conceptB: opp.conceptB || opp.supporting_entities?.[1] || '[Unresolved Concept]',
                    evidenceScore: opp.score ?? opp.evidence_score ?? 0,
                    evidenceTier: opp.validation_status === 'SUPPORTED' ? 'HIGH' : 'MEDIUM'
                  } as any} 
                  isSelected={oppId === selectedOppId}
                  onSelect={() => setSelectedOppId(oppId)}
                />
              );
            })}

            {opportunities.length === 0 && (
              <div className="dashboard-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active opportunities. Go to the <Link to="/opportunities" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>Opportunities page</Link> to generate some.
              </div>
            )}
          </div>

          {/* Signal Breakdown Section */}
          {selectedOpp && (
            <div className="dashboard-card" style={{ margin: 0 }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '20px' }}>
                Signal Breakdown: {selectedOpp.supporting_entities?.slice(0,2).join(' + ') || 'Candidate Concepts'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <SignalBar label="Novelty" value={selectedOpp.novelty_score || 0} />
                <SignalBar label="Evidence" value={selectedOpp.evidence_score || 0} />
                <SignalBar label="Impact" value={selectedOpp.impact_score || 0} />
                <SignalBar label="Feasibility" value={selectedOpp.feasibility_score || 0} />
                <SignalBar label="Trend" value={selectedOpp.trend_score || 0} />
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Recent Papers */}
        <section style={{ padding: 0 }}>
          <h3 className="dashboard-section-title">Recent Research Papers</h3>
          <RecentPapers papers={recentPapers} />
        </section>
      </div>

      {/* Bottom Grid: Activity Timeline vs. Corpus Domains */}
      <div className="dashboard-grid-2">
        
        {/* Activity Timeline */}
        <section className="dashboard-card" style={{ margin: 0 }}>
          <h3 className="dashboard-section-title" style={{ fontSize: '18px', marginBottom: '24px' }}>Research Activity</h3>
          <ActivityTimeline activities={activities} />
          {activities.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
              No recent processing timeline events logged.
            </div>
          )}
        </section>

        {/* Corpus Domains / Research Areas */}
        <section className="dashboard-card" style={{ margin: 0 }}>
          <h3 className="dashboard-section-title" style={{ fontSize: '18px', marginBottom: '24px' }}>Corpus Research Domains</h3>
          <ResearchAreas areas={domains} />
          {domains.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
              No indexed research domains available.
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default DashboardPage;
