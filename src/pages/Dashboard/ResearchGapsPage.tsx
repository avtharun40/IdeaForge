import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb, AlertCircle, Loader2, Search, ArrowRight, BookOpen, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { getGaps } from '../../services/gapService';
import type { ResearchGap } from '../../types';
import StatCard from '../../components/dashboard/StatCard';

const ResearchGapsPage: React.FC = () => {
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filtering / Search States
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [minScoreFilter, setMinScoreFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadGaps = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        type: typeFilter,
        min_score: minScoreFilter,
        entity: searchQuery
      };
      const data = await getGaps(params);
      setGaps(data);
    } catch (err: any) {
      console.error('Error fetching research gaps:', err);
      setErrorMsg(err.message || 'Failed to retrieve potential research gaps. Please verify that the backend and Neo4j services are online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGaps();
  }, [typeFilter, minScoreFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGaps();
  };

  const getGapTypeLabel = (type: string) => {
    return String(type).replace(/_/g, ' ');
  };

  const getGapTypeBadgeColor = (type: string) => {
    const t = String(type).toUpperCase();
    if (t === 'LOW_COVERAGE') return { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
    if (t === 'CROSS_DOMAIN') return { bg: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', text: '#a855f7' };
    if (t === 'UNDEREXPLORED_COMBINATION') return { bg: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', text: '#ec4899' };
    if (t === 'REPEATED_LIMITATION') return { bg: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', text: '#ef4444' };
    if (t === 'UNRESOLVED_FUTURE_WORK') return { bg: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', text: '#10b981' };
    if (t === 'METHOD_GAP') return { bg: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', text: '#f97316' };
    if (t === 'DATASET_GAP') return { bg: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', text: '#06b6d4' };
    return { bg: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.3)', text: '#14b8a6' };
  };

  // Compute stat card numbers
  const totalCount = gaps.length;
  const repeatedLimCount = gaps.filter(g => g.gap_type === 'REPEATED_LIMITATION').length;
  const unresolvedFwCount = gaps.filter(g => g.gap_type === 'UNRESOLVED_FUTURE_WORK').length;
  const highConfidenceCount = gaps.filter(g => g.confidence >= 0.85).length;

  if (loading && gaps.length === 0) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Analyzing research graph...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center', marginTop: '20px' }}>
        <AlertCircle size={48} style={{ color: '#ff7f7f', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Research gap analysis is currently unavailable.</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg}
        </p>
        <button type="button" className="btn btn-primary" onClick={loadGaps}>
          Retry Gap Analysis
        </button>
      </div>
    );
  }

  return (
    <div id="tour-research-gaps" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Potential Research Gaps</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Identify underexplored areas, repeated literature limitations, and candidate research gaps backed by literature evidence.
        </p>
      </div>

      {/* Stats cards */}
      <section className="stats-grid" style={{ padding: 0 }}>
        <StatCard
          title="Gap Candidates"
          value={totalCount}
          icon={<Lightbulb size={20} />}
          secondaryText="Potential areas identified"
        />
        <StatCard
          title="Repeated Limitations"
          value={repeatedLimCount}
          icon={<ShieldAlert size={20} />}
          secondaryText="Verified technical bottlenecks"
        />
        <StatCard
          title="Unresolved Future Work"
          value={unresolvedFwCount}
          icon={<Sparkles size={20} />}
          secondaryText="Unaddressed directions"
        />
        <StatCard
          title="High Confidence Gaps"
          value={highConfidenceCount}
          icon={<BookOpen size={20} />}
          secondaryText="Strong structural evidence"
        />
      </section>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="dashboard-card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Keyword Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search Concepts / Terms</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Transformer, CNN, dataset name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ height: '38px', fontSize: '13px', paddingLeft: '32px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Gap Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gap Type</label>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Types</option>
              <option value="LOW_COVERAGE">Low Coverage</option>
              <option value="UNDEREXPLORED_COMBINATION">Underexplored Combination</option>
              <option value="CROSS_DOMAIN">Cross Domain</option>
              <option value="REPEATED_LIMITATION">Repeated Limitation</option>
              <option value="UNRESOLVED_FUTURE_WORK">Unresolved Future Work</option>
              <option value="METHOD_GAP">Method Gap</option>
              <option value="DATASET_GAP">Dataset Gap</option>
              <option value="APPLICATION_GAP">Application Gap</option>
            </select>
          </div>

          {/* Min Score Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min Score</label>
            <select
              className="filter-select"
              value={minScoreFilter}
              onChange={e => setMinScoreFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">Any Score</option>
              <option value="50">50+</option>
              <option value="60">60+</option>
              <option value="70">70+</option>
              <option value="80">80+</option>
            </select>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
          <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}>
            Apply Filters
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setMinScoreFilter('');
              setTimeout(loadGaps, 50);
            }}
            style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Main List */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} style={{ color: 'var(--accent)' }} />
          Evidence-Backed Gap Candidates ({gaps.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {gaps.map((gap, idx) => {
            const badgeStyle = getGapTypeBadgeColor(gap.gap_type);
            return (
              <div
                key={idx}
                className="dashboard-card table-row-hover"
                style={{
                  padding: '20px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '24px',
                  transition: 'all 0.2s'
                }}
              >
                {/* Info Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      ...badgeStyle
                    }}>
                      {getGapTypeLabel(gap.gap_type)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Confidence: <strong>{Math.round(gap.confidence * 100)}%</strong>
                    </span>
                  </div>

                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {gap.title}
                  </h4>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {gap.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '6px' }}>
                    {gap.supporting_entities.length > 0 && (
                      <span>Supporting: <strong>{gap.supporting_entities.join(', ')}</strong></span>
                    )}
                    <span>Papers: <strong>{gap.supporting_papers.length} Articles</strong></span>
                    <span>Evidence Count: <strong>{gap.evidence_count}</strong></span>
                  </div>
                </div>

                {/* Score & Action Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', minWidth: '110px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Gap Score</span>
                    <strong style={{ fontSize: '24px', color: 'var(--accent-light)' }}>{gap.score}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</span>
                  </div>

                  <Link
                    to={`/gaps/${gap.gap_id}`}
                    className="btn btn-secondary"
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      padding: '6px 12px',
                      height: 'auto'
                    }}
                  >
                    <span>Explore Gap</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}

          {gaps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <Lightbulb size={48} style={{ color: 'var(--border-color)', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No research gaps detected yet.</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: '1.5' }}>
                Research gap detection requires multiple analyzed papers. Upload additional papers to identify gaps across the literature.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchGapsPage;
