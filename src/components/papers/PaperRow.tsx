import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Paper } from '../../types';
import PaperStatusBadge from './PaperStatusBadge';

interface PaperRowProps {
  paper: Paper;
}

const PaperRow: React.FC<PaperRowProps> = ({ paper }) => {
  const navigate = useNavigate();
  const { id, title, authors, year, researchArea, conceptCount, status, dateAdded } = paper;

  const authorsString = authors.map((author) => author.name).join(', ');

  return (
    <tr className="paper-table-row" onClick={() => navigate(`/papers/${id}`)}>
      <td className="col-title-authors" data-label="Paper">
        <div className="tbl-paper-title">{title}</div>
        <div className="tbl-paper-authors">{authorsString}</div>
      </td>
      <td className="col-year" data-label="Year">
        <span className="tbl-paper-year">{year}</span>
      </td>
      <td className="col-area" data-label="Area">
        <span className="tbl-paper-area">{researchArea}</span>
      </td>
      <td className="col-concepts" data-label="Concepts">
        <span className="tbl-paper-concepts">
          {status === 'Ready' ? `${conceptCount} concepts` : '—'}
        </span>
      </td>
      <td className="col-status" data-label="Status">
        <PaperStatusBadge status={status} />
      </td>
      <td className="col-date" data-label="Added">
        <span className="tbl-paper-date">{dateAdded}</span>
      </td>
      <td className="col-actions">
        <button 
          className="paper-row-action-btn"
          aria-label={`View details for ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/papers/${id}`);
          }}
        >
          <span>View</span>
          <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
};

export default PaperRow;
