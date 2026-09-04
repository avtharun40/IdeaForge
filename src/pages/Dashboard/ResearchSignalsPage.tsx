import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Layers, Network, ArrowRight, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import {
  getSignals, getTrends, getCooccurrences, getCrossDomains
} from '../../services/signalService';
import type {
  ResearchSignal, CooccurrenceSignal, TemporalTrend, CrossDomainSignal
} from '../../services/signalService';
import StatCard from '../../components/dashboard/StatCard';

const ResearchSignalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'cooccurrence' | 'cross-domain'>('overview');

  // Data States
  const [signals, setSignals] = useState<ResearchSignal[]>([]);
  const [trends, setTrends] = useState<TemporalTrend[]>([]);
  const [cooccurrences, setCooccurrences] = useState<CooccurrenceSignal[]>([]);
  const [crossDomains, setCrossDomains] = useState<CrossDomainSignal[]>([]);

  // UI Control States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedSignal, setSelectedSignal] = useState<ResearchSignal | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<TemporalTrend | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Filters State
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');

  // Track window resizing for responsive drawers
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Load all backend signal datasets
      const params = {
        type: typeFilter,
        entity: searchQuery,
        year: yearFilter
      };

      const [sigData, trendData, coData, xdomData] = await Promise.all([
        getSignals(params),
        getTrends(params),
        getCooccurrences(params),
        getCrossDomains()
      ]);

      setSignals(sigData);
      setTrends(trendData);
      setCooccurrences(coData);
      setCrossDomains(xdomData);
    } catch (err: any) {
      console.error('Error loading research signals:', err);
      setErrorMsg(err.message || 'Failed to communicate with the Research Signals API. Please verify the backend service status.');
    } finally {
      setLoading(false);
    }
  };

  // Reload data when filters change
  useEffect(() => {
    loadData();
  }, [typeFilter, yearFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Color mapping based on node category / type
  const getTypeBadgeColor = (type: string) => {
    const t = String(type).toUpperCase();
    if (t === 'METHOD') return { bg: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', text: '#10b981' };
    if (t === 'DATASET') return { bg: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', text: '#06b6d4' };
    if (t === 'CONCEPT') return { bg: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', text: '#f97316' };
    if (t === 'PROBLEM') return { bg: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', text: '#f43f5e' };
    if (t === 'MODEL') return { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
    if (t === 'CLAIM') return { bg: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', text: '#ec4899' };
    if (t === 'LIMITATION') return { bg: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', text: '#ef4444' };
    if (t === 'FUTUREWORK') return { bg: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.3)', text: '#14b8a6' };
    return { bg: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.3)', text: '#64748b' };
  };

  const getTrendBadgeColor = (trend?: string) => {
    if (trend === 'INCREASING' || trend === 'EMERGING') {
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', label: trend };
    }
    if (trend === 'DECREASING' || trend === 'DECLINING') {
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', label: trend };
    }
    if (trend === 'STABLE') {
      return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', label: 'STABLE' };
    }
    return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', label: 'INSUFFICIENT DATA' };
  };

  // Sparkline Chart Generator using basic SVG paths
  const renderSparkline = (yearData: Record<number, number> = {}) => {
    const years = Object.keys(yearData).map(Number).sort((a, b) => a - b);
    if (years.length < 2) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Flat Line</span>;

    const values = years.map(y => yearData[y]);
    const maxVal = Math.max(...values, 1);

    // Draw SVG coordinates
    const width = 100;
    const height = 24;
    const padding = 2;

    const points = years.map((year, i) => {
      const x = (i / (years.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((yearData[year] / maxVal) * (height - padding * 2) + padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Draw background grid guide */}
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} strokeDasharray="2,2" />
        {/* Draw sparkline path */}
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.8}
          points={points}
        />
        {/* Draw endpoint dot */}
        {years.length > 0 && (
          <circle
            cx={(years.length - 1) / (years.length - 1) * (width - padding * 2) + padding}
            cy={height - ((yearData[years[years.length - 1]] / maxVal) * (height - padding * 2) + padding)}
            r={3}
            fill="var(--accent-light)"
          />
        )}
      </svg>
    );
  };



  if (loading && signals.length === 0) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Calculating Knowledge Graph Research Signals...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center', marginTop: '20px' }}>
        <AlertCircle size={48} style={{ color: '#ff7f7f', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Analysis Engine Error</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg}
        </p>
        <button type="button" className="btn btn-primary" onClick={loadData}>
          Retry Calculations
        </button>
      </div>
    );
  }

  // Highlights computed from data
  const emergingEntities = trends.filter(t => t.trend === 'EMERGING');
  const trendingEntities = trends.filter(t => t.score > 60).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page Title */}
      <div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Signal Analysis</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Identify emerging topics, calculate semantic associations, and discover cross-domain bridges in the literature graph.
        </p>
      </div>

      {/* Top Level Summary Statistics Grid */}
      <section className="stats-grid" style={{ padding: 0 }}>
        <StatCard
          title="Trending Topics"
          value={trendingEntities.length}
          icon={<TrendingUp size={20} />}
          secondaryText="High growth scores"
        />
        <StatCard
          title="Emerging Entities"
          value={emergingEntities.length}
          icon={<Sparkles size={20} />}
          secondaryText="First seen recently"
        />
        <StatCard
          title="Co-occurrences"
          value={cooccurrences.length}
          icon={<Network size={20} />}
          secondaryText="Connected entity pairs"
        />
        <StatCard
          title="Cross-Domain Bridges"
          value={crossDomains.length}
          icon={<Layers size={20} />}
          secondaryText="Connecting multiple domains"
        />
      </section>

      {/* Dynamic Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="dashboard-card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Term */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search Entity</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Transformer, CNN, YOLO..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '160px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entity Type</label>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Categories</option>
              <option value="CONCEPT">Concept</option>
              <option value="METHOD">Method</option>
              <option value="DATASET">Dataset</option>
              <option value="PROBLEM">Problem</option>
              <option value="MODEL">Model</option>
              <option value="CLAIM">Claim</option>
              <option value="LIMITATION">Limitation</option>
              <option value="FUTUREWORK">Future Work</option>
            </select>
          </div>

          {/* Year Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter Year</label>
            <select
              className="filter-select"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
          <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}>
            Apply Filter
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setYearFilter('');
              setTimeout(loadData, 50);
            }}
            style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Main Tabbed Analysis Panels Container */}
      <div
        className="dashboard-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '480px',
          position: 'relative'
        }}
      >
        {/* Tabs Bar Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', padding: '0 16px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Signals Overview', icon: <Sparkles size={14} /> },
            { id: 'trends', label: 'Temporal Trends', icon: <TrendingUp size={14} /> },
            { id: 'cooccurrence', label: 'Associations (PMI/NPMI)', icon: <Network size={14} /> },
            { id: 'cross-domain', label: 'Domain Bridges', icon: <Layers size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 20px',
                border: 'none',
                background: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: activeTab === tab.id ? 'var(--accent-light)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-light)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', height: '100%' }}>
              {/* Left Column: Trending Research Entities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                  Top Trending Entities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trendingEntities.map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedTrend(t);
                        setSelectedSignal(signals.find(s => s.entity_id === t.entity_id) || null);
                      }}
                      className="dashboard-card"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        transition: 'transform 0.2s, background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.entity_name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            ...getTypeBadgeColor(t.type)
                          }}>
                            {t.type}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                          Score: {t.score}/100
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {t.total_paper_count} Papers
                        </span>
                      </div>
                    </div>
                  ))}
                  {trendingEntities.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>No trending entities found.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Emerging Research Entities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--success)' }} />
                  Emerging Research Concepts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {emergingEntities.map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedTrend(t);
                        setSelectedSignal(signals.find(s => s.entity_id === t.entity_id) || null);
                      }}
                      className="dashboard-card"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        transition: 'transform 0.2s, background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.entity_name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            ...getTypeBadgeColor(t.type)
                          }}>
                            {t.type}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          EMERGING
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          First seen: {t.first_appearance}
                        </span>
                      </div>
                    </div>
                  ))}
                  {emergingEntities.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                      No emerging concepts discovered in this slice. (Requires initial publication threshold).
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TEMPORAL TRENDS TAB */}
          {activeTab === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Literature Growth Trends</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{trends.length} Entities Evaluated</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="papers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Research Entity</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Type</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Sparkline</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>First seen</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Latest seen</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Trend</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Trend Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((t, idx) => {
                      const trendColor = getTrendBadgeColor(t.trend);
                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedTrend(t);
                            setSelectedSignal(signals.find(s => s.entity_id === t.entity_id) || null);
                          }}
                          style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.entity_name}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', ...getTypeBadgeColor(t.type) }}>
                              {t.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{renderSparkline(t.year_data)}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>{t.first_appearance}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>{t.latest_appearance}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', background: trendColor.bg, color: trendColor.text, padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {trendColor.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-light)' }}>{t.score}/100</td>
                        </tr>
                      );
                    })}
                    {trends.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No trend data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CO-OCCURRENCE TAB */}
          {activeTab === 'cooccurrence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Pointwise Mutual Information (PMI) Associations</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cooccurrences.length} Associated Pairs</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="papers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Entity A</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Category A</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Link</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Entity B</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Category B</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Paper Count</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>PMI</th>
                      <th style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>NPMI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cooccurrences.map((c, idx) => (
                      <tr
                        key={idx}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                      >
                        <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.entity_a_name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', ...getTypeBadgeColor(c.entity_a_type) }}>
                            {c.entity_a_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <ArrowRight size={14} />
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.entity_b_name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', ...getTypeBadgeColor(c.entity_b_type) }}>
                            {c.entity_b_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-primary)' }}>{c.cooccurrence_count}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                          {c.pmi.toFixed(3)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                          {c.npmi.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                    {cooccurrences.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No entity co-occurrence pairs found matching filter parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CROSS-DOMAIN TAB */}
          {activeTab === 'cross-domain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Cross-Domain Bridge Entities</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{crossDomains.length} Connectors Found</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {crossDomains.map((cd, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      // Map to signal details
                      const mockSig: ResearchSignal = {
                        signal_id: `sig_xdom_${cd.entity_id}`,
                        signal_type: 'cross-domain',
                        entity_id: cd.entity_id,
                        entity_name: cd.entity_name,
                        score: cd.domain_count * 10,
                        confidence: 0.9,
                        paper_count: cd.paper_count,
                        supporting_papers: [],
                        supporting_relationships: [],
                        metadata: {
                          domains: cd.domains,
                          domain_count: cd.domain_count,
                          relationship_count: cd.relationship_count,
                          type: cd.type
                        }
                      };
                      setSelectedSignal(mockSig);
                      setSelectedTrend(trends.find(t => t.entity_id === cd.entity_id) || null);
                    }}
                    className="dashboard-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      transition: 'transform 0.2s, background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{cd.entity_name}</span>
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', width: 'fit-content', ...getTypeBadgeColor(cd.type) }}>
                          {cd.type}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-light)', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        {cd.domain_count} Domains
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Domains Connected</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {cd.domains.map((dom, i) => (
                          <span key={i} style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px' }}>
                            {dom}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <span>Degree: <strong>{cd.relationship_count} Links</strong></span>
                      <span>Papers: <strong>{cd.paper_count} Articles</strong></span>
                    </div>
                  </div>
                ))}
                {crossDomains.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                    No cross-domain bridge entities found. (Requires entities appearing in papers categorized under different researchAreas).
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Selected Entity Signal Drawer/Sidebar */}
      {selectedSignal && (
        <div style={isMobile ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70%',
          background: 'var(--bg-sidebar)',
          borderTop: '1px solid var(--border-color)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          zIndex: 100,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
        } : {
          position: 'fixed',
          top: 0,
          right: 0,
          width: '380px',
          height: '100%',
          background: 'var(--bg-sidebar)',
          borderLeft: '1px solid var(--border-color)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          overflowY: 'auto',
          zIndex: 100,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '9px',
                background: getTypeBadgeColor(selectedSignal.metadata?.type || selectedSignal.signal_type).bg,
                color: getTypeBadgeColor(selectedSignal.metadata?.type || selectedSignal.signal_type).text,
                border: getTypeBadgeColor(selectedSignal.metadata?.type || selectedSignal.signal_type).border,
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                width: 'fit-content',
                textTransform: 'uppercase'
              }}>
                {selectedSignal.metadata?.type || selectedSignal.signal_type}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                {selectedSignal.entity_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSignal(null);
                setSelectedTrend(null);
              }}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unique Papers</span>
              <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedSignal.paper_count}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signal Score</span>
              <strong style={{ fontSize: '16px', color: 'var(--accent-light)' }}>{selectedSignal.score}/100</strong>
            </div>
          </div>

          {/* Trend classification detail */}
          {selectedTrend && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Trend Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Growth Pattern</span>
                  <strong style={{ color: getTrendBadgeColor(selectedTrend.trend).text }}>{selectedTrend.trend}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>First Appearance</span>
                  <strong>{selectedTrend.first_appearance}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Latest Appearance</span>
                  <strong>{selectedTrend.latest_appearance}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Linear Growth Slope</span>
                  <strong style={{ color: selectedTrend.slope >= 0 ? '#10b981' : '#ef4444' }}>
                    {selectedTrend.slope >= 0 ? `+${selectedTrend.slope.toFixed(2)}` : selectedTrend.slope.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Sparkline & Counts */}
          {selectedTrend && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Yearly Counts</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                {renderSparkline(selectedTrend.year_data)}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timeline Progression</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '6px' }}>
                {Object.keys(selectedTrend.year_data).map(Number).sort((a, b) => a - b).map(year => (
                  <div key={year} style={{ padding: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', fontSize: '11px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{year}</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedTrend.year_data[year]}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross Domain List */}
          {selectedSignal.signal_type === 'cross-domain' && selectedSignal.metadata?.domains && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Domains Bridge Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedSignal.metadata.domains.map((dom: string, i: number) => (
                  <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                    {dom}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supporting connections summary */}
          <div>
            <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Associated Entities (PMI)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cooccurrences
                .filter(c => c.entity_a_id === selectedSignal.entity_id || c.entity_b_id === selectedSignal.entity_id)
                .slice(0, 5)
                .map((c, i) => {
                  const otherName = c.entity_a_id === selectedSignal.entity_id ? c.entity_b_name : c.entity_a_name;
                  const otherType = c.entity_a_id === selectedSignal.entity_id ? c.entity_b_type : c.entity_a_type;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherName}</strong>
                        <span style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{otherType}</span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-light)' }}>NPMI: {c.npmi.toFixed(2)}</span>
                    </div>
                  );
                })}
              {cooccurrences.filter(c => c.entity_a_id === selectedSignal.entity_id || c.entity_b_id === selectedSignal.entity_id).length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No strong co-occurrences linked.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchSignalsPage;
