import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Database, Layers, GitMerge, FileText, AlertTriangle, Loader2, Award, Upload, RefreshCw } from 'lucide-react';
import { getPapers } from '../../services/paperService';
import { getGraphStats } from '../../services/graphService';
import PaperGraphView from '../../components/papers/PaperGraphView';
import type { Paper, GraphStats } from '../../types';
import StatCard from '../../components/dashboard/StatCard';

const ResearchGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isProcessingOnly, setIsProcessingOnly] = useState<boolean>(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('ALL');
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [paperStats, setPaperStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch available papers
      const papersData = await getPapers().catch(() => []);
      const readyPapers = (papersData || []).filter(p => p.status?.toLowerCase() === 'ready');
      const processingPapers = (papersData || []).filter(p => p.status?.toLowerCase() === 'processing' || (p.processingStage && p.processingStage !== 'completed' && p.processingStage !== 'failed'));

      setPapers(readyPapers.length > 0 ? readyPapers : papersData);

      // 2. Fetch real graph statistics
      const statsData = await getGraphStats().catch(() => null);
      setStats(statsData);

      const hasGraphData = (statsData && statsData.nodes > 0) || readyPapers.length > 0 || papersData.length > 0;
      setIsProcessingOnly(!hasGraphData && processingPapers.length > 0);
      setSelectedPaperId('ALL');
    } catch (err: any) {
      console.error('Error loading graph explorer data:', err);
      setErrorMsg(err.message || 'Failed to connect to the backend server. Please verify the API is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="placeholder-container" style={{ minHeight: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <h3 style={{ marginTop: '16px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Loading research graph...
        </h3>
        <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Connecting to Neo4j knowledge base and retrieving graph entities...
        </p>
      </div>
    );
  }

  // Error State
  if (errorMsg) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '36px 24px', textAlign: 'center', marginTop: '20px' }}>
        <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Unable to load research graph
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg}
        </p>
        <button type="button" className="btn btn-primary" onClick={loadData}>
          Retry Connection
        </button>
      </div>
    );
  }

  // Processing State
  if (isProcessingOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Graph Explorer</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Visualize and navigate the unified knowledge graph database compiled from ingested research papers.
          </p>
        </div>
        <div className="dashboard-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Paper Analysis In Progress
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.6' }}>
            Graph connections will appear as paper analysis completes. Extraction of entities, claims, limitations, and cross-references is currently underway.
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadData} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} />
            <span>Check Processing Status</span>
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (papers.length === 0 && (!stats || stats.nodes === 0)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Graph Explorer</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Visualize and navigate the unified knowledge graph database compiled from ingested research papers.
          </p>
        </div>

        <div className="dashboard-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Database size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Your research graph is empty.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6', marginBottom: '24px' }}>
            Upload research papers to start building your knowledge graph. IdeaForge will automatically extract concepts, methods, datasets, claims, and cross-paper relationships.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/papers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} />
            <span>Upload Research Papers</span>
          </button>
        </div>
      </div>
    );
  }

  const activeStats = (selectedPaperId !== 'ALL' && paperStats) ? paperStats : stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Graph Explorer</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Visualize and navigate the unified 2D knowledge graph compiled from ingested research papers.
        </p>
      </div>

      {/* Real Neo4j Graph Statistics Grid */}
      {activeStats && (
        <section className="stats-grid" style={{ padding: 0 }}>
          <StatCard
            title={selectedPaperId !== 'ALL' ? "Paper Nodes" : "Total Nodes"}
            value={activeStats.nodes}
            icon={<Layers size={20} />}
          />
          <StatCard
            title={selectedPaperId !== 'ALL' ? "Paper Relationships" : "Relationships"}
            value={activeStats.relationships}
            icon={<GitMerge size={20} />}
          />
          <StatCard
            title={selectedPaperId !== 'ALL' ? "Selected Paper" : "Mapped Papers"}
            value={activeStats.papers}
            icon={<FileText size={20} />}
          />
          <StatCard
            title="Research Entities"
            value={activeStats.concepts}
            icon={<Network size={20} />}
            secondaryText={`${activeStats.methods} Methods • ${activeStats.datasets} Datasets`}
          />
          <StatCard
            title="Key Claims"
            value={activeStats.claims}
            icon={<Award size={20} />}
          />
        </section>
      )}

      {/* Main Graph Visualization Section */}
      <div id="tour-research-graph" className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Selector Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Scope:</span>
            <select
              className="filter-select"
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              style={{ minWidth: '320px', height: '38px', fontSize: '13px' }}
            >
              <option value="ALL">All Papers (Unified Knowledge Graph)</option>
              <optgroup label="Individual Papers">
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.year})
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedPaperId !== 'ALL' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedPaperId('ALL')}
                style={{ height: '38px', fontSize: '12px' }}
              >
                <span>Show Full Graph</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '38px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Paper Graph View Component Wrapper */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <PaperGraphView
            paperId={selectedPaperId}
            onStatsUpdated={setPaperStats}
            height="640px"
          />
        </div>
      </div>
    </div>
  );
};

export default ResearchGraphPage;
