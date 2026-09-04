import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import type { RecentPaper } from '../../types';

interface RecentPapersProps {
  papers: RecentPaper[];
}

const RecentPapers: React.FC<RecentPapersProps> = ({ papers }) => {
  const navigate = useNavigate();

  return (
    <div className="recent-papers-list">
      {papers.map((paper) => (
        <div 
          key={paper.id} 
          className="paper-row"
          onClick={() => navigate(`/papers/${paper.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div className="paper-info">
            <div className="paper-icon-wrapper">
              <FileText size={16} />
            </div>
            <div className="paper-details">
              <h4 className="paper-title-text">{paper.title}</h4>
              <div className="paper-metadata">
                <span className="paper-year">{paper.year}</span>
                <span className="paper-metadata-divider">•</span>
                <span className="paper-concept-count">{paper.conceptCount} concepts</span>
              </div>
            </div>
          </div>
          
          <div className="paper-status-wrapper">
            <span className={`status-badge ${paper.status.toLowerCase()}`}>
              {paper.status}
            </span>
            <ChevronRight size={16} className="paper-row-arrow" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentPapers;
