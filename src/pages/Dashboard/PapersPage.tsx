import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, AlertTriangle, RefreshCw, Trash2, X, Network } from 'lucide-react';
import { getPapers, deleteAllPapers } from '../../services/paperService';
import type { Paper, PaperStatus } from '../../types';
import PaperTable from '../../components/papers/PaperTable';
import UploadPapersModal from '../../components/papers/UploadPapersModal';
import PaperGraphView from '../../components/papers/PaperGraphView';
import { mockPapers } from '../../services/mockData';

const PapersPage: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaperStatus>('All');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);

  // Graph section state
  const [selectedGraphPaperId, setSelectedGraphPaperId] = useState<string>('ALL');

  // Fetch papers statefully from the backend primary source
  const fetchPapers = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');
    try {
      const data = await getPapers();
      setPapers(data);
      // Empty paper collection is a valid empty state, not an error
      if (data.length === 0) {
        setErrorMsg('');
      }
    } catch (err: any) {
      console.error('Failed to fetch research papers:', err);
      if (err.code === 'BACKEND_UNAVAILABLE' || err.statusCode === 0) {
        setErrorMsg('API Backend server is offline or unreachable. Displaying local demo papers as fallback.');
        setPapers(mockPapers);
      } else if (err.statusCode === 404) {
        setErrorMsg('Papers endpoint was not found on backend (HTTP 404). Please verify API routing.');
        setPapers([]);
      } else if (err.statusCode >= 500) {
        setErrorMsg(`Backend server error (HTTP ${err.statusCode}): ${err.message || 'Internal database error'}`);
        setPapers([]);
      } else if (err.code === 'MALFORMED_RESPONSE') {
        setErrorMsg('Malformed API response received from backend server.');
        setPapers([]);
      } else {
        setErrorMsg(err.message || 'Failed to retrieve research papers from backend.');
        setPapers(mockPapers);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers(false);
  }, []);

  // Poll papers list every 6 seconds when any paper has Processing status
  useEffect(() => {
    const hasProcessing = papers.some(p => p.status === 'Processing');
    if (!hasProcessing) return;

    const intervalId = setInterval(async () => {
      try {
        const data = await getPapers();
        setPapers(data);
      } catch (err) {
        console.error('Error refreshing papers list:', err);
      }
    }, 6000);

    return () => clearInterval(intervalId);
  }, [papers]);

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    setErrorMsg('');
    try {
      await deleteAllPapers();
      setIsDeleteAllModalOpen(false);
      await fetchPapers(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete all papers from database.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Compute filtered list on any control change
  useEffect(() => {
    let result = [...papers];

    // Search query match (Title, Authors, Research Area)
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((paper) => {
        const titleMatch = paper.title.toLowerCase().includes(query);
        const areaMatch = paper.researchArea.toLowerCase().includes(query);
        const authorMatch = paper.authors.some(author => 
          author.name.toLowerCase().includes(query)
        );
        return titleMatch || areaMatch || authorMatch;
      });
    }

    // Status filter match
    if (statusFilter !== 'All') {
      result = result.filter((paper) => paper.status === statusFilter);
    }

    // Area filter match
    if (areaFilter !== 'All') {
      result = result.filter((paper) => paper.researchArea === areaFilter);
    }

    // Year filter match
    if (yearFilter !== 'All') {
      result = result.filter((paper) => paper.year.toString() === yearFilter);
    }

    setFilteredPapers(result);
  }, [papers, searchQuery, statusFilter, areaFilter, yearFilter]);

  // Unique research areas & years for filter selectors
  const uniqueAreas = Array.from(new Set(papers.map(p => p.researchArea)));
  const uniqueYears = Array.from(new Set(papers.map(p => p.year.toString()))).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600 }}>Research Papers</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Manage the literature corpus used by IdeaForge.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {papers.length > 0 && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsDeleteAllModalOpen(true)}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 16px', 
                fontSize: '14px',
                color: 'var(--danger, #ef4444)',
                borderColor: 'rgba(239, 68, 68, 0.3)'
              }}
            >
              <Trash2 size={16} />
              <span>Delete All</span>
            </button>
          )}
          <button 
            type="button" 
            id="tour-upload-btn"
            className="btn btn-primary" 
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}
          >
            <Plus size={16} />
            <span>Upload Papers</span>
          </button>
        </div>
      </div>

      {/* Search & Tabs control grid */}
      <div className="library-controls-row" id="tour-papers-list">
        {/* Search */}
        <div className="search-input-wrapper">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search papers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search papers by title, author, or research area"
          />
        </div>

        {/* Tab Filters */}
        <div className="filter-tabs-row">
          {(['All', 'Ready', 'Processing', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`filter-tab ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Optional Filter Selectors */}
        <div className="filter-select-wrapper">
          {/* Research Area Select */}
          <select 
            className="filter-select"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            aria-label="Filter by Research Area"
          >
            <option value="All">All Areas</option>
            {uniqueAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>

          {/* Year Select */}
          <select 
            className="filter-select"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filter by Year"
          >
            <option value="All">All Years</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Connection Errors */}
      {errorMsg && (
        <div className="upload-error-banner" style={{ margin: '0 0 16px 0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => fetchPapers(false)}
            style={{ padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      <div id="tour-paper-details">
        {loading ? (
          <div className="placeholder-container" style={{ minHeight: '30vh' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Querying literature databases...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="placeholder-container" style={{ minHeight: '30vh', textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {papers.length === 0 ? 'No papers uploaded yet' : 'No matching papers found'}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px' }}>
              {papers.length === 0 
                ? 'Upload your PDF research papers to extract entities, build knowledge graphs, and discover research gaps.'
                : 'Try clearing your search query or filter selections.'}
            </p>
            {papers.length === 0 && (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setIsUploadModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}
              >
                <Plus size={16} />
                <span>Upload Your First Paper</span>
              </button>
            )}
          </div>
        ) : (
          /* Main Table view */
          <PaperTable papers={filteredPapers} />
        )}
      </div>

      {/* Research Knowledge Graph Section */}
      {papers.length > 0 && (
        <section id="tour-research-graph" className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-light, #a78bfa)' }}>
                <Network size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Research Knowledge Graph</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Interactive 2D graph of cross-paper entities, concepts, methods, datasets, claims, and limitations.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Scope:</span>
              <select
                className="filter-select"
                value={selectedGraphPaperId}
                onChange={(e) => setSelectedGraphPaperId(e.target.value)}
                style={{ minWidth: '240px', height: '36px', fontSize: '13px' }}
                aria-label="Select Graph Scope"
              >
                <option value="ALL">All Papers (Unified Graph)</option>
                <optgroup label="Individual Papers">
                  {papers.filter(p => p.status === 'Ready').map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.year})</option>
                  ))}
                </optgroup>
              </select>

              {selectedGraphPaperId !== 'ALL' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedGraphPaperId('ALL')}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  Show Full Graph
                </button>
              )}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <PaperGraphView paperId={selectedGraphPaperId} height="560px" />
          </div>
        </section>
      )}

      {/* Upload papers Modal dialog overlay */}
      <UploadPapersModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => fetchPapers(false)}
      />

      {/* Delete All Papers Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete All Papers</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Irreversible Database Reset</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => !isDeletingAll && setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px' }}>This action will permanently delete:</p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 12px 0', fontSize: '13px' }}>
                <li>All <strong>{papers.length}</strong> uploaded PDF research papers and files.</li>
                <li>All structured AI metadata, concepts, methods, and datasets.</li>
                <li>The entire Neo4j knowledge graph (all Paper, Claim, Limitation, and FutureWork nodes, plus orphaned entities).</li>
              </ul>
              <p style={{ color: '#ef4444', fontWeight: 500, fontSize: '13px' }}>
                This operation cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                style={{ 
                  background: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 20px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting All...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Yes, Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PapersPage;
