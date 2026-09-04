import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, AlertCircle, Loader2, Search, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, ExternalLink, HelpCircle
} from 'lucide-react';
import { getGaps } from '../../services/gapService';
import { getGapValidation } from '../../services/validationService';
import type { ResearchGap, GapValidation } from '../../types';

const EvidencePage: React.FC = () => {
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [validations, setValidations] = useState<Record<string, GapValidation>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // UI States
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const gapsList = await getGaps({});
      setGaps(gapsList);

      // Load validation reports for all gaps
      const validationsMap: Record<string, GapValidation> = {};
      const validationErrors: string[] = [];
      await Promise.all(
        gapsList.map(async (gap) => {
          try {
            const report = await getGapValidation(gap.gap_id);
            validationsMap[gap.gap_id] = report;
          } catch (e: any) {
            console.warn(`Could not load validation report for gap ${gap.gap_id}:`, e);
            validationErrors.push(e?.message || 'Failed to retrieve gap validation report');
          }
        })
      );

      // If all validation queries failed when gaps exist, treat as backend error rather than empty filter
      if (gapsList.length > 0 && Object.keys(validationsMap).length === 0 && validationErrors.length > 0) {
        throw new Error(validationErrors[0] || 'Failed to query gap validation trails from backend.');
      }

      setValidations(validationsMap);
    } catch (err: any) {
      console.error('Error loading evidence validation data:', err);
      setErrorMsg(err.message || 'Failed to retrieve evidence trail data. Please verify that the backend and database are reachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === 'SUPPORTED') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    if (s === 'PARTIALLY_SUPPORTED') return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)' };
    if (s === 'WEAKLY_SUPPORTED') return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
    if (s === 'CONTRADICTED') return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
    return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b', border: '1px solid rgba(100, 116, 139, 0.3)' };
  };

  const getEvidenceTier = (validation: GapValidation) => {
    const directCount = validation.evidence_items.filter(e =>
      ['DIRECT_CLAIM', 'LIMITATION_SUPPORT', 'FUTURE_WORK_SUPPORT'].includes(e.evidence_type)
    ).length;

    if (validation.status === 'CONTRADICTED') return 'TIER_4 (Contradicted)';
    if (validation.evidence_count >= 4 && directCount >= 1 && validation.unique_papers >= 2) return 'TIER_1 (Direct Primary)';
    if (validation.unique_papers >= 2) return 'TIER_2 (Multiple Supporting)';
    if (validation.evidence_count >= 1) return 'TIER_3 (Indirect / Statistical)';
    return 'TIER_4 (Insufficient)';
  };

  const handleToggleExpand = (gapId: string) => {
    setExpandedGapId(expandedGapId === gapId ? null : gapId);
  };

  // Filter logic
  const filteredGaps = gaps.filter(gap => {
    const validation = validations[gap.gap_id];
    if (!validation) return false;

    // Search query matches title or entities
    const q = searchQuery.toLowerCase();
    const matchesSearch = gap.title.toLowerCase().includes(q) || gap.supporting_entities.some(e => e.toLowerCase().includes(q));

    // Status filter
    const matchesStatus = !statusFilter || validation.status === statusFilter;

    // Tier filter
    const tier = getEvidenceTier(validation);
    const matchesTier = !tierFilter || tier.includes(tierFilter);

    return matchesSearch && matchesStatus && matchesTier;
  });

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
        <button type="button" className="btn btn-primary" onClick={loadData}>
          Retry Validation Trail
        </button>
      </div>
    );
  }

  return (
    <div id="tour-evidence-explorer" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Evidence Explorer</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Track gap candidates back to their primary literature extraction points, evaluate validation scores, and inspect contradictory claims.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="dashboard-card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Keyword Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search Gaps</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search gap title or concepts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ height: '38px', fontSize: '13px', paddingLeft: '32px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Validation Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validation Status</label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Statuses</option>
              <option value="SUPPORTED">Supported</option>
              <option value="PARTIALLY_SUPPORTED">Partially Supported</option>
              <option value="WEAKLY_SUPPORTED">Weakly Supported</option>
              <option value="CONTRADICTED">Contradicted</option>
              <option value="INSUFFICIENT_EVIDENCE">Insufficient Evidence</option>
            </select>
          </div>

          {/* Evidence Tier Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidence Tier</label>
            <select
              className="filter-select"
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Tiers</option>
              <option value="TIER_1">Tier 1 (Direct)</option>
              <option value="TIER_2">Tier 2 (Multiple)</option>
              <option value="TIER_3">Tier 3 (Indirect)</option>
              <option value="TIER_4">Tier 4 (Weak/Contradicted)</option>
            </select>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              setTierFilter('');
            }}
            style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Gap Validation List */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
          Validation Report Trials ({filteredGaps.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredGaps.map((gap, idx) => {
            const validation = validations[gap.gap_id];
            const badge = getStatusBadgeColor(validation.status);
            const tierLabel = getEvidenceTier(validation);
            const isExpanded = expandedGapId === gap.gap_id;

            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => handleToggleExpand(gap.gap_id)}
                  style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '24px'
                  }}
                  className="table-row-hover"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {gap.title}
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Tier: <strong>{tierLabel}</strong></span>
                      <span>Papers: <strong>{validation.unique_papers}</strong></span>
                      <span>Evidence Items: <strong>{validation.evidence_count}</strong></span>
                      {validation.contradictions.length > 0 && (
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                          Contradictions: {validation.contradictions.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: badge.border
                    }}>
                      {validation.status.replace(/_/g, ' ')}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.05)' }}>
                    
                    {/* Contradictions Alert */}
                    {validation.contradictions.length > 0 && (
                      <div style={{ marginTop: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                        <h5 style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px' }}>
                          <ShieldAlert size={16} />
                          Contradictory Literature Claims Detected
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {validation.contradictions.map((contra, cIdx) => (
                            <div key={cIdx} style={{ fontSize: '12px', borderLeft: '3px solid #ef4444', paddingLeft: '12px', display: 'grid', gap: '6px' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Claim A:</span> "{contra.claim_a}"
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Claim B:</span> "{contra.claim_b}"
                              </div>
                              <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                Conflicting evidence regarding entity: <strong>{contra.entity}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence Trail List */}
                    <div style={{ marginTop: '20px' }}>
                      <h5 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '12px' }}>
                        Validation Evidence Items ({validation.evidence_items.length})
                      </h5>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {validation.evidence_items.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '16px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-light)' }}>
                                  {ev.evidence_type.replace(/_/g, ' ')}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  Relevance: <strong>{ev.relevance_score}%</strong> • Confidence: <strong>{Math.round(ev.confidence * 100)}%</strong>
                                </span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                                {ev.text}
                              </p>
                              {ev.source_chunk_id && (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                                  SOURCE CHUNK: {ev.source_chunk_id}
                                </span>
                              )}
                            </div>

                            {ev.paper_id !== 'graph_analysis' && ev.paper_id !== 'cooccurrence_analysis' && (
                              <Link
                                to={`/papers/${ev.paper_id}`}
                                className="btn btn-secondary"
                                style={{ padding: '6px', height: 'auto', display: 'flex', alignItems: 'center' }}
                                title="View original publication reference"
                              >
                                <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Link to={`/gaps/${gap.gap_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-light)', fontWeight: 500 }}>
                        <span>Open Gap Candidate Profile</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {gaps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <HelpCircle size={48} style={{ color: 'var(--border-color)', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No research gaps detected yet.</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: '1.5' }}>
                Validation trails require multiple analyzed papers. Upload additional papers to verify evidence and validation trails across the literature.
              </p>
            </div>
          )}

          {gaps.length > 0 && filteredGaps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <HelpCircle size={48} style={{ color: 'var(--border-color)', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: '14px', fontStyle: 'italic' }}>
                No gap validation reports match the filter parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidencePage;
