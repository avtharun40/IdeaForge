import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, BookOpen, Sparkles, ExternalLink, Bookmark, Check, ShieldCheck
} from 'lucide-react';
import { getOpportunityDetail, updateOpportunityState } from '../../services/opportunityService';
import { getGapValidation } from '../../services/validationService';
import type { ResearchOpportunity, GapValidation } from '../../types';

const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [opp, setOpp] = useState<ResearchOpportunity | null>(null);
  const [validation, setValidation] = useState<GapValidation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const oppData = await getOpportunityDetail(id);
      setOpp(oppData);

    // Fetch the gap validation report
    if (oppData.gap_id) {
      try {
        const valData = await getGapValidation(oppData.gap_id);
        setValidation(valData);
      } catch (e) {
        console.warn('Could not fetch gap validation report:', e);
      }
    }
  } catch (err: any) {
    console.error('Error loading opportunity details:', err);
    setErrorMsg(err.message || 'Failed to retrieve opportunity details. Please ensure the backend is active.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateState = async (newState: string) => {
    if (!opp) return;
    try {
      const oppId = opp.opportunity_id || (opp as any)._id;
      const updated = await updateOpportunityState(oppId, newState);
      setOpp(prev => prev ? { ...prev, ...updated, user_state: newState as any } : updated);
    } catch (err) {
      console.error('Failed to update state:', err);
      alert('Error updating opportunity state.');
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    const s = String(status || 'PARTIALLY_SUPPORTED').toUpperCase();
    if (s === 'SUPPORTED') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    if (s === 'PARTIALLY_SUPPORTED') return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)' };
    return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
  };

  if (loading) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Retrieving Research Opportunity Profile...</p>
      </div>
    );
  }

  if (errorMsg || !opp) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center', marginTop: '20px' }}>
        <AlertCircle size={48} style={{ color: '#ff7f7f', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Opportunity Details Retrieval Failure</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg || 'The requested research opportunity details could not be resolved or does not exist.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/opportunities" className="btn btn-secondary">
            Back to Opportunities
          </Link>
          <button type="button" className="btn btn-primary" onClick={loadData}>
            Retry Load
          </button>
        </div>
      </div>
    );
  }

  const gapType = (opp.gap_type || 'RESEARCH_GAP').replace(/_/g, ' ');
  const validationStatus = (opp.validation_status || 'PARTIALLY_SUPPORTED').replace(/_/g, ' ');
  const valBadge = getStatusBadgeColor(opp.validation_status);
  const supportingPapers = opp.supporting_papers || [];
  const confidencePct = Math.round((opp.confidence ?? 0.75) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back link & Feedback Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/opportunities" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-light)', fontSize: '14px', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>Back to Opportunities list</span>
        </Link>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {opp.user_state !== 'saved' ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleUpdateState('saved')}
              style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bookmark size={14} />
              <span>Save Opportunity</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleUpdateState('none')}
              style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={14} />
              <span>Saved</span>
            </button>
          )}

          <select
            value={opp.user_state === 'saved' || opp.user_state === 'dismissed' ? 'none' : (opp.user_state || 'none')}
            onChange={e => handleUpdateState(e.target.value)}
            style={{
              height: '36px',
              fontSize: '13px',
              padding: '0 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="none">Mark State...</option>
            <option value="interesting">Interesting</option>
            <option value="not_relevant">Not Relevant</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Main Header Profile */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid var(--accent-muted)', color: 'var(--accent-light)' }}>
                {gapType}
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
                {validationStatus}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
              {opp.title || 'Untitled Opportunity'}
            </h2>
            {opp.gap_id && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                Mapped to Research Gap ID: <Link to={`/gaps/${opp.gap_id}`} style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>{opp.gap_id}</Link>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '24px', background: 'rgba(255,255,255,0.01)', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Match Index</span>
              <strong style={{ fontSize: '24px', color: 'var(--accent-light)' }}>{opp.score ?? 0}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Confidence</span>
              <strong style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{confidencePct}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Column: Context Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Grounded Text Sections */}
          <div className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Research Problem</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{opp.problem || opp.summary || 'No detailed problem description provided.'}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Existing Literature</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{opp.existing_research || 'Evidence from literature corpus indicates active exploration of underlying concepts.'}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Detected Gap</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{opp.gap_description || 'Identified an unexplored intersection or unaddressed limitation across published papers.'}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Proposed Direction</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{opp.proposed_direction || 'Synthesizing novel methodological connections between candidate concept entities.'}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Why It Matters</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{opp.why_it_matters || 'Advancing this research vector addresses core limitations in current literature.'}</p>
            </div>
          </div>

          {/* Validation report items */}
          {validation && (validation.evidence_items?.length || 0) > 0 && (
            <div className="dashboard-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                Validation Evidence Trail ({validation.evidence_count || validation.evidence_items.length} items)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {validation.evidence_items.map((ev, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '85%' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-light)' }}>
                          {(ev.evidence_type || 'EVIDENCE').replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Relevance: {ev.relevance_score ?? 80}% • Confidence: {Math.round((ev.confidence ?? 0.8) * 100)}%
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>{ev.text}</p>
                    </div>
                    {ev.paper_id && ev.paper_id !== 'graph_analysis' && ev.paper_id !== 'cooccurrence_analysis' && (
                      <Link to={`/papers/${ev.paper_id}`} className="btn btn-secondary" style={{ padding: '6px', height: 'auto', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Score Breakdown & Literature */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Score breakdown metrics card */}
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              Scoring Breakdown
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Novelty Score</span>
                  <strong>{opp.novelty_score ?? 0} / 100</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(opp.novelty_score ?? 0, 100)}%`, height: '100%', background: 'var(--accent-light)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Evidence Score</span>
                  <strong>{opp.evidence_score ?? 0} / 100</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(opp.evidence_score ?? 0, 100)}%`, height: '100%', background: '#10b981' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Impact Score</span>
                  <strong>{opp.impact_score ?? 0} / 100</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(opp.impact_score ?? 0, 100)}%`, height: '100%', background: '#a855f7' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Feasibility Score</span>
                  <strong>{opp.feasibility_score ?? 0} / 100</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(opp.feasibility_score ?? 0, 100)}%`, height: '100%', background: '#14b8a6' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Trend Score</span>
                  <strong>{opp.trend_score ?? 0} / 100</strong>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(opp.trend_score ?? 0, 100)}%`, height: '100%', background: '#ffcc00' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Supporting literature list */}
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              Supporting Literature ({supportingPapers.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {supportingPapers.length > 0 ? (
                supportingPapers.map((pTitle, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', fontSize: '13px' }}>
                    <strong style={{ display: 'block', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>{pTitle}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grounded Literature Source</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  No supporting papers mapped to this opportunity yet.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default OpportunityDetailPage;
