import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, RefreshCw, Trash2 } from 'lucide-react';
import type { Paper } from '../../types';
import PaperStatusBadge from './PaperStatusBadge';

interface PaperDetailsHeaderProps {
  paper: Paper;
  onRetry?: () => void;
  onDelete?: () => void;
}

const PaperDetailsHeader: React.FC<PaperDetailsHeaderProps> = ({ paper, onRetry, onDelete }) => {
  const { title, authors, year, researchArea, status, dateAdded } = paper;
  const authorsString = authors.map((author) => author.name).join(', ');

  return (
    <div className="paper-details-header-card">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/papers" className="details-back-link">
          <ArrowLeft size={16} />
          <span>Back to Paper Library</span>
        </Link>
      </div>

      <div className="details-header-content">
        <div style={{ flex: 1 }}>
          <div className="details-header-top-row">
            <span className="details-area-badge">{researchArea}</span>
            <PaperStatusBadge status={status} />
          </div>
          <h1 className="details-paper-title">{title}</h1>
          <p className="details-paper-authors">By {authorsString}</p>
          
          <div className="details-metadata-row">
            <div className="meta-item">
              <Calendar size={14} />
              <span>Published: {year}</span>
            </div>
            <div className="meta-item">
              <Tag size={14} />
              <span>Added to Corpus: {dateAdded}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignSelf: 'center', marginTop: '16px' }}>
          {status === 'Failed' && onRetry && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onRetry} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px' }}
            >
              <RefreshCw size={14} />
              <span>Retry Analysis</span>
            </button>
          )}

          {onDelete && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onDelete} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px', borderColor: '#ff7f7f', color: '#ff7f7f', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
              <span>Delete Paper</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperDetailsHeader;
