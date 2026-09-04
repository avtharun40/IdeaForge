import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, BookOpen, ShieldAlert, Sparkles, Network, ExternalLink, ShieldCheck
} from 'lucide-react';
import { getGapDetail, getGapPapers } from '../../services/gapService';
import { getGapValidation } from '../../services/validationService';
import type { ResearchGap, Paper, GapValidation } from '../../types';

const GapDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [gap, setGap] = useState<ResearchGap | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [validation, setValidation] = useState<GapValidation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [gapData, papersData, validationData] = await Promise.all([
        getGapDetail(id),
        getGapPapers(id),
        getGapValidation(id)
      ]);
      setGap(gapData);
      setPapers(papersData);
      setValidation(validationData);
    } catch (err: any) {
      console.error('Error loading gap details & validation:', err);
      setErrorMsg(err.message || 'Failed to retrieve details for the research gap validation report. Please verify that the backend is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="placeholder-container" style={{ minHeight: '400px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Retrieving Research Gap Evidence Trail...</p>
      </div>
    );
  }

  if (errorMsg || !gap) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center', marginTop: '20px' }}>
        <AlertCircle size={48} style={{ color: '#ff7f7f', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Gap Details Retrieval Failure</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg || 'The requested research gap candidate could not be resolved.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/gaps" className="btn btn-secondary">
            Back to Research Gaps
          </Link>
          <button type="button" className="btn btn-primary" onClick={loadData}>
            Retry Load
          </button>
        </div>
      </div>
    );
  }

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

  const getStatusBadgeColor = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === 'SUPPORTED') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    if (s === 'PARTIALLY_SUPPORTED') return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)' };
    if (s === 'WEAKLY_SUPPORTED') return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
    if (s === 'CONTRADICTED') return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
    return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b', border: '1px solid rgba(100, 116, 139, 0.3)' };
  };

  const getEvidenceTierLabel = (val: GapValidation) => {
    const directCount = val.evidence_items.filter(e =>
      ['DIRECT_CLAIM', 'LIMITATION_SUPPORT', 'FUTURE_WORK_SUPPORT'].includes(e.evidence_type)
    ).length;

    if (val.status === 'CONTRADICTED') return 'Tier 4 (Contradicted)';
    if (val.evidence_count >= 4 && directCount >= 1 && val.unique_papers >= 2) return 'Tier 1 (Direct Primary)';
    if (val.unique_papers >= 2) return 'Tier 2 (Multiple Supporting)';
    if (val.evidence_count >= 1) return 'Tier 3 (Indirect / Statistical)';
    return 'Tier 4 (Insufficient)';
  };

  const badgeStyle = getGapTypeBadgeColor(gap.gap_type);
  const statusBadge = validation ? getStatusBadgeColor(validation.status) : null;
  const tierLabel = validation ? getEvidenceTierLabel(validation) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back button */}
      <div>
        <Link to="/gaps" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-light)', fontSize: '14px', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>Back to Gaps list</span>
        </Link>
      </div>

      {/* Header card */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              {statusBadge && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.text,
                  border: statusBadge.border
                }}>
                  {validation?.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
              {gap.title}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '24px', background: 'rgba(255,255,255,0.01)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Gap Score</span>
              <strong style={{ fontSize: '20px', color: 'var(--accent-light)' }}>{gap.score}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
            {validation && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Evidence Tier</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>{tierLabel}</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>Problem Overview</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {gap.description}
          </p>
        </div>
      </div>

      {/* Validation Trails & Contradictions Panel */}
      {validation && (
        <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-light)' }} />
            Evidence & Validation Trail
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Evidence Items</span>
              <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{validation.evidence_count}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Unique Papers</span>
              <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{validation.unique_papers}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Average Confidence</span>
              <strong style={{ fontSize: '18px', color: 'var(--accent-light)' }}>{Math.round(validation.confidence * 100)}%</strong>
            </div>
          </div>

          {/* Contradictions */}
          {validation.contradictions.length > 0 && (
            <div style={{ marginBottom: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px' }}>
                <ShieldAlert size={16} />
                Contradictory Claim Mappings Detected
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {validation.contradictions.map((contra, idx) => (
                  <div key={idx} style={{ fontSize: '12px', borderLeft: '3px solid #ef4444', paddingLeft: '12px', display: 'grid', gap: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Claim A:</span> "{contra.claim_a}"
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Claim B:</span> "{contra.claim_b}"
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Conflict entity: <strong>{contra.entity}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Items Scroll List */}
          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: 'bold' }}>Supporting Evidence trail</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '8px' }}>
              {validation.evidence_items.map((ev, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '85%' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-light)' }}>
                        {ev.evidence_type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Confidence: <strong>{Math.round(ev.confidence * 100)}%</strong> • Relevance: <strong>{ev.relevance_score}%</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                      {ev.text}
                    </p>
                    {ev.source_chunk_id && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: '2px' }}>
                        Source Chunk: {ev.source_chunk_id}
                      </span>
                    )}
                  </div>
                  {ev.paper_id !== 'graph_analysis' && ev.paper_id !== 'cooccurrence_analysis' && (
                    <Link to={`/papers/${ev.paper_id}`} className="btn btn-secondary" style={{ padding: '6px', height: 'auto', display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              ))}
              {validation.evidence_items.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                  No supporting evidence trail items extracted.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left column: Supporting Evidence & Nodes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Supporting Entities */}
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Network size={16} style={{ color: 'var(--accent)' }} />
              Supporting Graph Entities
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {gap.supporting_entities.map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    background: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px',
                    fontWeight: 500
                  }}
                >
                  {name}
                </span>
              ))}
              {gap.supporting_entities.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No direct entities mapped to this gap.</span>
              )}
            </div>
          </div>

          {/* Raw Limitations */}
          {gap.supporting_limitations.length > 0 && (
            <div className="dashboard-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldAlert size={16} style={{ color: '#ef4444' }} />
                Extracted Literature Limitations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {gap.supporting_limitations.map((lim, i) => (
                  <blockquote
                    key={i}
                    style={{
                      margin: 0,
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.03)',
                      borderLeft: '4px solid #ef4444',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      borderRadius: '4px'
                    }}
                  >
                    "{lim}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* Raw Future Work */}
          {gap.supporting_future_work.length > 0 && (
            <div className="dashboard-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Sparkles size={16} style={{ color: '#10b981' }} />
                Extracted Future-Work Passages
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {gap.supporting_future_work.map((fw, i) => (
                  <blockquote
                    key={i}
                    style={{
                      margin: 0,
                      padding: '12px 16px',
                      background: 'rgba(16, 185, 129, 0.03)',
                      borderLeft: '4px solid #10b981',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      borderRadius: '4px'
                    }}
                  >
                    "{fw}"
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Supporting Papers */}
        <div className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} style={{ color: 'var(--accent)' }} />
            Supporting Literature ({papers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {papers.map((paper) => (
              <div
                key={paper.id}
                style={{
                  padding: '14px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {paper.researchArea || 'General'} • {paper.year}
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {paper.title}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Authors: {paper.authors.map(a => a.name).join(', ')}
                  </span>
                </div>

                <Link
                  to={`/papers/${paper.id}`}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 'auto'
                  }}
                  title="View full paper details"
                >
                  <ExternalLink size={14} />
                </Link>
              </div>
            ))}

            {papers.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '24px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                No direct paper mappings fetched.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GapDetailPage;
