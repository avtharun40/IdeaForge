import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Cpu, Database, AlertTriangle, LineChart, Compass, Link2, Loader2, ArrowLeft } from 'lucide-react';
import { getPaperById, getPaperStatus, retryPaperProcessing, deletePaper, analyzePaper, getPaperAnalysisStatus } from '../../services/paperService';
import type { Paper } from '../../types';
import PaperDetailsHeader from '../../components/papers/PaperDetailsHeader';
import PaperSection from '../../components/papers/PaperSection';
import { mockPapers } from '../../services/mockData';
import PaperGraphView from '../../components/papers/PaperGraphView';

const PaperDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'graph'>('ai');

  // Fetch paper metadata from service
  const loadPaper = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const p = await getPaperById(id);
      setPaper(p);
    } catch (err: any) {
      const fallbackPaper = mockPapers.find(p => p.id === id);
      if (fallbackPaper) {
        setPaper(fallbackPaper);
        setErrorMsg('API Backend is offline. Viewing local mock paper details as fallback.');
      } else {
        setPaper(undefined);
        setErrorMsg(err.message || 'Failed to retrieve paper details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaper();
  }, [id]);

  // Poll status endpoint to update paper status statefully
  useEffect(() => {
    if (!id || !paper || paper.status !== 'Processing') return;

    const intervalId = setInterval(async () => {
      try {
        const statusData = await getPaperStatus(id);
        if (statusData.status !== 'Processing') {
          clearInterval(intervalId);
          loadPaper();
        }
      } catch (err) {
        console.error('Error polling paper status:', err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [paper?.status, id]);

  // Poll AI analysis status endpoint
  useEffect(() => {
    if (!id || !paper || paper.aiAnalysis?.status !== 'processing') return;

    const intervalId = setInterval(async () => {
      try {
        const analysisData = await getPaperAnalysisStatus(id);
        if (analysisData.status !== 'processing') {
          clearInterval(intervalId);
          loadPaper(); // Reload paper metadata to populate analysis result fields
        }
      } catch (err) {
        console.error('Error polling AI analysis status:', err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [paper?.aiAnalysis?.status, id]);

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      setPaper(prev => prev ? {
        ...prev,
        aiAnalysis: {
          status: 'processing',
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          version: '1.0.0',
          analyzedAt: null,
          error: null,
          result: null
        }
      } : undefined);
      await analyzePaper(id);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger AI analysis.');
      loadPaper();
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      await retryPaperProcessing(id);
      await loadPaper();
    } catch (err: any) {
      alert(err.message || 'Failed to retry processing.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this paper and remove its PDF from the corpus?')) {
      try {
        await deletePaper(id);
        navigate('/papers');
      } catch (err: any) {
        alert(err.message || 'Failed to delete paper record.');
      }
    }
  };

  if (loading) {
    return (
      <div className="placeholder-container">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading paper details...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="placeholder-container">
        <AlertTriangle size={32} style={{ color: '#ff7f7f' }} />
        <h3 className="placeholder-title" style={{ fontSize: '20px', marginTop: '16px' }}>Paper not found</h3>
        <p className="placeholder-text" style={{ fontSize: '14px', marginBottom: '24px' }}>
          {errorMsg || 'The requested paper ID does not exist in the literature corpus.'}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/papers')}>
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Connection warning banner */}
      {errorMsg && (
        <div className="upload-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Paper details Header */}
      <PaperDetailsHeader paper={paper} onRetry={handleRetry} onDelete={handleDelete} />

      {/* Render based on Status */}
      {paper.status === 'Processing' && (
        <div className="dashboard-card details-processing-card" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div className="details-processing-spinner" style={{ marginBottom: '20px' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Processing Research Paper...
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px' }}>
            {paper.processingMessage || 'Extracting text, running Gemini deep analysis, and constructing knowledge graph in Neo4j...'}
          </p>

          {/* Progress Bar */}
          <div style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Stage: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{paper.processingStage?.replace('_', ' ') || 'Extracting'}</strong></span>
              <span>{paper.processingProgress || 25}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${paper.processingProgress || 25}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-light, #a78bfa))', 
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', fontSize: '13px', maxWidth: '280px', margin: '0 auto', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left' }}>
            <div style={{ color: 'var(--success, #10b981)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>✓</span> Uploaded to Corpus
            </div>
            <div style={{ 
              color: (paper.processingProgress || 0) >= 40 ? 'var(--success, #10b981)' : 'var(--accent-light)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              {(paper.processingProgress || 0) >= 40 ? (
                <span style={{ fontWeight: 'bold' }}>✓</span>
              ) : (
                <Loader2 size={12} className="animate-spin" />
              )}
              Extracting Text & Sections
            </div>
            <div style={{ 
              color: (paper.processingProgress || 0) >= 75 ? 'var(--success, #10b981)' : ((paper.processingProgress || 0) >= 40 ? 'var(--accent-light)' : 'var(--text-muted)'), 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              {(paper.processingProgress || 0) >= 75 ? (
                <span style={{ fontWeight: 'bold' }}>✓</span>
              ) : ((paper.processingProgress || 0) >= 40 ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span style={{ paddingLeft: '2px' }}>○</span>
              ))}
              Gemini Deep Analysis
            </div>
            <div style={{ 
              color: (paper.processingProgress || 0) >= 100 ? 'var(--success, #10b981)' : ((paper.processingProgress || 0) >= 75 ? 'var(--accent-light)' : 'var(--text-muted)'), 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              {(paper.processingProgress || 0) >= 100 ? (
                <span style={{ fontWeight: 'bold' }}>✓</span>
              ) : ((paper.processingProgress || 0) >= 75 ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span style={{ paddingLeft: '2px' }}>○</span>
              ))}
              Building Neo4j Graph
            </div>
          </div>
        </div>
      )}

      {paper.status === 'Failed' && (
        <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: '#ff7f7f', margin: '0 auto 20px', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ff7f7f', marginBottom: '8px' }}>Processing failed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 12px' }}>
            IdeaForge was unable to parse the document contents.
          </p>
          {paper.processingError && (
            <div style={{ background: 'rgba(255, 127, 127, 0.05)', border: '1px solid rgba(255, 127, 127, 0.2)', borderRadius: '6px', padding: '12px', color: '#ff7f7f', fontSize: '13px', fontFamily: 'monospace', maxWidth: '560px', margin: '0 auto 24px', textAlign: 'left', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              <strong>Error Log:</strong> {paper.processingError}
            </div>
          )}
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You can click the "Retry Analysis" button above to attempt parsing again.</p>
        </div>
      )}

      {paper.status === 'Ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: activeTab === 'ai' ? 'var(--accent-light)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'ai' ? '2px solid var(--accent-light)' : 'none',
                fontWeight: activeTab === 'ai' ? 600 : 500,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              AI Research Understanding
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: activeTab === 'graph' ? 'var(--accent-light)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'graph' ? '2px solid var(--accent-light)' : 'none',
                fontWeight: activeTab === 'graph' ? 600 : 500,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Knowledge Graph
            </button>
          </div>

          {activeTab === 'graph' && (
            <PaperGraphView paperId={paper.id} />
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '10px', padding: '14px 18px', background: 'rgba(208, 188, 255, 0.05)', border: '1px solid rgba(208, 188, 255, 0.15)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>NOTE:</span>
                <span>AI Analysis: Extracted via Gemini SDK. Confidence scores reflect model certainty per concept.</span>
              </div>

              <div className="paper-details-grid-2">
            {/* Left Column: Abstract, Concepts, Methods, Datasets */}
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Abstract */}
              {paper.abstract && (
                <PaperSection title="Abstract" icon={<BookOpen size={16} />}>
                  <p>{paper.abstract}</p>
                </PaperSection>
              )}

              {/* Document Statistics */}
              <PaperSection title="Document Metrics" icon={<Database size={16} />}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-light)' }}>
                      {paper.pageCount !== undefined ? paper.pageCount : 'Not detected'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pages</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-light)' }}>
                      {paper.wordCount !== undefined ? paper.wordCount : 'Not detected'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Words</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-light)' }}>
                      {paper.characterCount !== undefined ? paper.characterCount : 'Not detected'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Characters</div>
                  </div>
                </div>
              </PaperSection>

              {/* Extracted Sections */}
              {paper.detectedSections && paper.detectedSections.length > 0 ? (
                <PaperSection title="Extracted Sections" icon={<BookOpen size={16} />}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {paper.detectedSections.map((sec, idx) => (
                      <details key={idx} className="details-concept-block" style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{sec.heading}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({sec.text.length} chars)</span>
                        </summary>
                        <p
                          style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', cursor: 'default' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {sec.text}
                        </p>
                      </details>
                    ))}
                  </div>
                </PaperSection>
              ) : (
                <PaperSection title="Extracted Sections" icon={<BookOpen size={16} />}>
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Not detected</p>
                </PaperSection>
              )}

              {/* Research Concepts */}
              {paper.concepts && paper.concepts.length > 0 && (
                <PaperSection title="Extracted Research Concepts" icon={<Cpu size={16} />}>
                  {paper.concepts.map((concept, idx) => (
                    <div key={idx} className="details-concept-block">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 className="concept-block-name" style={{ margin: 0 }}>{concept.name}</h4>
                        {(concept as any).confidence !== undefined && (
                          <span style={{ fontSize: '11px', background: (concept as any).confidence >= 0.8 ? 'rgba(80, 200, 120, 0.1)' : 'rgba(255, 165, 0, 0.1)', color: (concept as any).confidence >= 0.8 ? '#50c878' : '#ffa500', padding: '2px 6px', borderRadius: '10px' }}>
                            {Math.round((concept as any).confidence * 100)}% conf
                          </span>
                        )}
                      </div>
                      <p className="concept-block-desc" style={{ marginTop: '4px' }}>{concept.description}</p>
                    </div>
                  ))}
                </PaperSection>
              )}

              {/* Methods */}
              {paper.methods && paper.methods.length > 0 && (
                <PaperSection title="Methods & Algorithms" icon={<LineChart size={16} />}>
                  {paper.methods.map((method, idx) => (
                    <div key={idx} className="details-method-block">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 className="concept-block-name" style={{ margin: 0 }}>{method.name}</h4>
                        {(method as any).confidence !== undefined && (
                          <span style={{ fontSize: '11px', background: (method as any).confidence >= 0.8 ? 'rgba(80, 200, 120, 0.1)' : 'rgba(255, 165, 0, 0.1)', color: (method as any).confidence >= 0.8 ? '#50c878' : '#ffa500', padding: '2px 6px', borderRadius: '10px' }}>
                            {Math.round((method as any).confidence * 100)}% conf
                          </span>
                        )}
                      </div>
                      {method.description && <p className="concept-block-desc" style={{ marginTop: '4px' }}>{method.description}</p>}
                    </div>
                  ))}
                </PaperSection>
              )}

              {/* Datasets */}
              {paper.datasets && paper.datasets.length > 0 && (
                <PaperSection title="Datasets Used" icon={<Database size={16} />}>
                  {paper.datasets.map((dataset, idx) => (
                    <div key={idx} className="details-dataset-block">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 className="concept-block-name" style={{ margin: 0 }}>{dataset.name}</h4>
                        {(dataset as any).confidence !== undefined && (
                          <span style={{ fontSize: '11px', background: (dataset as any).confidence >= 0.8 ? 'rgba(80, 200, 120, 0.1)' : 'rgba(255, 165, 0, 0.1)', color: (dataset as any).confidence >= 0.8 ? '#50c878' : '#ffa500', padding: '2px 6px', borderRadius: '10px' }}>
                            {Math.round((dataset as any).confidence * 100)}% conf
                          </span>
                        )}
                      </div>
                      {dataset.description && <p className="concept-block-desc" style={{ marginTop: '4px' }}>{dataset.description}</p>}
                    </div>
                  ))}
                </PaperSection>
              )}
            </div>

            {/* Right Column: Limitations, Future Work, Related Papers */}
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Limitations */}
              {paper.limitations && paper.limitations.length > 0 && (
                <PaperSection title="Identified Limitations" icon={<AlertTriangle size={16} />}>
                  <ul className="bullet-list">
                    {paper.limitations.map((limit, idx) => (
                      <li key={idx}>{limit}</li>
                    ))}
                  </ul>
                </PaperSection>
              )}

              {/* Future Work */}
              {paper.futureWork && paper.futureWork.length > 0 && (
                <PaperSection title="Future Work Directions" icon={<Compass size={16} />}>
                  <ul className="bullet-list">
                    {paper.futureWork.map((work, idx) => (
                      <li key={idx}>{work}</li>
                    ))}
                  </ul>
                </PaperSection>
              )}

              {/* Related Papers */}
              {paper.relatedPapers && paper.relatedPapers.length > 0 && (
                <PaperSection title="Related Papers" icon={<Link2 size={16} />}>
                  <div className="related-papers-list-links">
                    {paper.relatedPapers.map((titleStr, idx) => (
                      <span key={idx} className="related-paper-link-item">
                        {titleStr}
                      </span>
                    ))}
                  </div>
                </PaperSection>
              )}
            </div>
          </div>

          {/* AI Research Analysis Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '32px', paddingTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={20} style={{ color: 'var(--accent-light)' }} />
                  AI Research Understanding
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Structured research breakdown parsed by Gemini Large Language Model
                </p>
              </div>

              {/* AI Status Badges and Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {(!paper.aiAnalysis || paper.aiAnalysis.status === 'pending') && (
                  <>
                    <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                      Not analyzed
                    </span>
                    <button type="button" className="btn btn-primary" onClick={handleAnalyze}>
                      Analyze Paper
                    </button>
                  </>
                )}

                {paper.aiAnalysis?.status === 'processing' && (
                  <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(208, 188, 255, 0.1)', color: 'var(--accent-light)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(208, 188, 255, 0.2)' }}>
                    <Loader2 size={12} className="animate-spin" />
                    Analyzing research...
                  </span>
                )}

                {paper.aiAnalysis?.status === 'ready' && (
                  <>
                    <span style={{ fontSize: '12px', background: 'rgba(80, 200, 120, 0.1)', color: '#50c878', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(80, 200, 120, 0.2)' }}>
                      AI Analysis Ready
                    </span>
                    <button type="button" className="btn btn-secondary" onClick={handleAnalyze} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Re-Analyze
                    </button>
                  </>
                )}

                {paper.aiAnalysis?.status === 'failed' && (
                  <>
                    <span style={{ fontSize: '12px', background: 'rgba(255, 127, 127, 0.1)', color: '#ff7f7f', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255, 127, 127, 0.2)' }}>
                      Analysis Failed
                    </span>
                    <button type="button" className="btn btn-primary" onClick={handleAnalyze}>
                      Retry Analysis
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error Message rendering on failure */}
            {paper.aiAnalysis?.status === 'failed' && paper.aiAnalysis.error && (
              <div style={{ background: 'rgba(255, 127, 127, 0.05)', border: '1px solid rgba(255, 127, 127, 0.2)', borderRadius: '6px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ color: '#ff7f7f', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={16} />
                  AI Execution Error
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {paper.aiAnalysis.error}
                </p>
              </div>
            )}

            {/* Analysis details layout */}
            {paper.aiAnalysis?.status === 'ready' && paper.aiAnalysis.result && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                
                {/* Left side: Problem, Objectives, Questions, Claims */}
                <div style={{ gridColumn: 'span 7', display: 'grid', gap: '24px' }}>
                  {/* Research Problem */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Research Problem
                    </h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                      {paper.aiAnalysis.result.researchProblem || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Not detected</span>}
                    </p>
                  </div>

                  {/* Objectives */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Research Objectives
                    </h3>
                    {paper.aiAnalysis.result.researchObjectives && paper.aiAnalysis.result.researchObjectives.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        {paper.aiAnalysis.result.researchObjectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Not detected</p>
                    )}
                  </div>

                  {/* Research Questions */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Research Questions
                    </h3>
                    {paper.aiAnalysis.result.researchQuestions && paper.aiAnalysis.result.researchQuestions.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        {paper.aiAnalysis.result.researchQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Not detected</p>
                    )}
                  </div>

                  {/* Contributions */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Contributions
                    </h3>
                    {paper.aiAnalysis.result.contributions && paper.aiAnalysis.result.contributions.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        {paper.aiAnalysis.result.contributions.map((con, i) => (
                          <li key={i}>{con}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Not detected</p>
                    )}
                  </div>

                  {/* Key Claims */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                      Key Claims
                    </h3>
                    {paper.aiAnalysis.result.claims && paper.aiAnalysis.result.claims.length > 0 ? (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {paper.aiAnalysis.result.claims.map((claim, idx) => (
                          <div key={idx} style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{claim.claim}</div>
                            {claim.evidence && (
                              <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid var(--accent-light)', fontStyle: 'italic', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                "{claim.evidence}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Not detected</p>
                    )}
                  </div>
                </div>

                {/* Right side: Domain, Subdomains, Key Findings */}
                <div style={{ gridColumn: 'span 5', display: 'grid', gap: '24px' }}>
                  {/* Domain & Subdomains */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Domain Classification
                    </h3>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-light)' }}>
                      {paper.aiAnalysis.result.domain || 'Not detected'}
                    </div>
                    {paper.aiAnalysis.result.subdomains && paper.aiAnalysis.result.subdomains.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {paper.aiAnalysis.result.subdomains.map((sub, i) => (
                          <span key={i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Findings */}
                  <div className="dashboard-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Key Findings
                    </h3>
                    {paper.aiAnalysis.result.findings && paper.aiAnalysis.result.findings.length > 0 ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {paper.aiAnalysis.result.findings.map((finding, i) => (
                          <div key={i} style={{ fontSize: '13px', paddingBottom: '8px', borderBottom: i < paper.aiAnalysis!.result!.findings.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>{finding.statement}</span>
                              <span style={{ fontSize: '10px', background: finding.confidence >= 0.8 ? 'rgba(80, 200, 120, 0.1)' : 'rgba(255, 165, 0, 0.1)', color: finding.confidence >= 0.8 ? '#50c878' : '#ffa500', padding: '2px 6px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                {(finding.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            {finding.evidence && (
                              <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '11px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderLeft: '2px solid var(--border-color)' }}>
                                "{finding.evidence}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Not detected</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )}
</div>
  );
};

export default PaperDetailPage;
