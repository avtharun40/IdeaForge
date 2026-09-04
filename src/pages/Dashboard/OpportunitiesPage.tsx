import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb, AlertCircle, Loader2, Search, ArrowRight, Sparkles, Trash2, Bookmark, Check, RefreshCw
} from 'lucide-react';
import { getOpportunities, generateOpportunities, updateOpportunityState } from '../../services/opportunityService';
import type { ResearchOpportunity } from '../../types';
import StatCard from '../../components/dashboard/StatCard';

const OpportunitiesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('score');
  const [gapTypeFilter, setGapTypeFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>(''); // none, saved, interesting, not_relevant, dismissed

  // Stats
  const [savedCount, setSavedCount] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch filtered list
      const res = await getOpportunities({
        search: searchQuery,
        sort: sortField,
        gap_type: gapTypeFilter,
        user_state: stateFilter,
        page: 1,
        limit: 25
      });
      setOpportunities(res.data);
      setTotalCount(res.total);

      // 2. Fetch saved count stats (fetch all saved to get count)
      const savedRes = await getOpportunities({ user_state: 'saved', limit: 100 });
      setSavedCount(savedRes.total);

      // 3. Calculate average score
      if (res.data.length > 0) {
        const sum = res.data.reduce((acc, curr) => acc + curr.score, 0);
        setAvgScore(Math.round(sum / res.data.length));
      } else {
        setAvgScore(0);
      }
    } catch (err: any) {
      console.error('Error loading opportunities:', err);
      setErrorMsg(err.message || 'Failed to retrieve research opportunities. Please ensure the backend server and MongoDB database are online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, sortField, gapTypeFilter, stateFilter]);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await generateOpportunities();
      alert(`Success! Generated/updated ${res.data.generated_count} opportunities from currently validated gaps.`);
      loadData();
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMsg(err.message || 'Opportunity generation engine run failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateState = async (oppId: string, newState: string) => {
    try {
      await updateOpportunityState(oppId, newState);
      // Reload lists to reflect the change immediately
      loadData();
    } catch (err: any) {
      console.error('Failed to update opportunity feedback state:', err);
      alert('Error updating opportunity state.');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === 'SUPPORTED') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    if (s === 'PARTIALLY_SUPPORTED') return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)' };
    return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
  };

  if (loading && opportunities.length === 0) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Ranked Research Opportunities...</p>
      </div>
    );
  }

  return (
    <div id="tour-opportunities" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Opportunities</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Explore ranked, structured opportunity profiles mapped directly to validated gaps in your literature corpus.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Scanning Validated Gaps...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>Generate Opportunities</span>
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard
          title="Total Opportunities"
          value={totalCount}
          secondaryText="Ranked literature pathways"
          icon={<Lightbulb size={20} />}
        />
        <StatCard
          title="Saved Targets"
          value={savedCount}
          secondaryText="Active research focus"
          icon={<Bookmark size={20} style={{ color: 'var(--accent-light)' }} />}
        />
        <StatCard
          title="Average Score"
          value={`${avgScore}`}
          secondaryText="Literature relevance index"
          icon={<Sparkles size={20} style={{ color: '#ffcc00' }} />}
        />
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px', color: 'var(--text-primary)' }}>
          <AlertCircle size={20} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '14px' }}>{errorMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="dashboard-card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Keyword Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search title, problems, entities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ height: '38px', fontSize: '13px', paddingLeft: '32px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '160px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sort By</label>
            <select
              className="filter-select"
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="score">Overall Score</option>
              <option value="novelty">Novelty Score</option>
              <option value="evidence">Evidence Score</option>
              <option value="impact">Impact Score</option>
              <option value="feasibility">Feasibility Score</option>
              <option value="trend">Trend Score</option>
            </select>
          </div>

          {/* Gap Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gap Type</label>
            <select
              className="filter-select"
              value={gapTypeFilter}
              onChange={e => setGapTypeFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Gaps</option>
              <option value="LOW_COVERAGE">Low Coverage</option>
              <option value="CROSS_DOMAIN">Cross Domain</option>
              <option value="UNDEREXPLORED_COMBINATION">Concept Combination</option>
              <option value="REPEATED_LIMITATION">Repeated Limitation</option>
              <option value="UNRESOLVED_FUTURE_WORK">Unresolved Future Work</option>
            </select>
          </div>

          {/* State Filter (Saved / Dismissed / All) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>State</label>
            <select
              className="filter-select"
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Active</option>
              <option value="saved">Saved Targets</option>
              <option value="dismissed">Dismissed</option>
              <option value="interesting">Interesting</option>
              <option value="not_relevant">Not Relevant</option>
            </select>
          </div>

        </div>
      </div>

      {/* Opportunities List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {opportunities.map((opp) => {
          const valBadge = getStatusBadgeColor(opp.validation_status);

          return (
            <div
              key={opp.opportunity_id}
              className="dashboard-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: opp.user_state === 'saved' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid var(--accent-muted)', color: 'var(--accent-light)' }}>
                      {opp.gap_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      backgroundColor: valBadge.bg,
                      color: valBadge.text,
                      border: valBadge.border
                    }}>
                      {opp.validation_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {opp.title}
                  </h3>
                </div>

                {/* Score breakdown button */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Match Index</span>
                    <strong style={{ fontSize: '18px', color: 'var(--accent-light)' }}>{opp.score}</strong>
                  </div>
                </div>
              </div>

              {/* Summary text */}
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {opp.summary}
              </p>

              {/* Score Component Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Novelty</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opp.novelty_score}</strong>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.novelty_score}%`, height: '100%', background: 'var(--accent-light)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Evidence</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opp.evidence_score}</strong>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.evidence_score}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Impact</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opp.impact_score}</strong>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.impact_score}%`, height: '100%', background: '#a855f7' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Feasibility</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opp.feasibility_score}</strong>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.feasibility_score}%`, height: '100%', background: '#14b8a6' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Trend</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opp.trend_score}</strong>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.trend_score}%`, height: '100%', background: '#ffcc00' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                
                {/* User State Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {opp.user_state !== 'saved' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleUpdateState(opp.opportunity_id || (opp as any)._id, 'saved')}
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Bookmark size={12} />
                      <span>Save Target</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleUpdateState(opp.opportunity_id || (opp as any)._id, 'none')}
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={12} />
                      <span>Saved</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleUpdateState(opp.opportunity_id || (opp as any)._id, 'dismissed')}
                    style={{ fontSize: '12px', padding: '6px 12px', color: '#ff7f7f', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    title="Dismiss opportunity"
                  >
                    <Trash2 size={12} />
                  </button>

                  <select
                    value={opp.user_state === 'saved' || opp.user_state === 'dismissed' ? 'none' : (opp.user_state || 'none')}
                    onChange={e => handleUpdateState(opp.opportunity_id || (opp as any)._id, e.target.value)}
                    style={{
                      height: '30px',
                      fontSize: '11px',
                      padding: '0 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <option value="none">Mark State...</option>
                    <option value="interesting">Interesting</option>
                    <option value="not_relevant">Not Relevant</option>
                  </select>
                </div>

                {/* Explore Opportunity Link */}
                <Link
                  to={`/opportunities/${opp.opportunity_id || (opp as any)._id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-light)', fontWeight: 500 }}
                >
                  <span>Explore Opportunity Profile</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

            </div>
          );
        })}

        {opportunities.length === 0 && (
          <div className="dashboard-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Lightbulb size={48} style={{ color: 'var(--border-color)', margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Opportunities Found</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              Click **Generate Opportunities** to scan literature validation trials and rank research pathways.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default OpportunitiesPage;
