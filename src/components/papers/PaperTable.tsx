import React from 'react';
import type { Paper } from '../../types';
import PaperRow from './PaperRow';

interface PaperTableProps {
  papers: Paper[];
}

const PaperTable: React.FC<PaperTableProps> = ({ papers }) => {
  if (papers.length === 0) {
    return (
      <div className="placeholder-container" style={{ minHeight: '30vh', padding: '40px 24px' }}>
        <div className="placeholder-icon">📂</div>
        <h3 className="placeholder-title" style={{ fontSize: '20px' }}>No papers found</h3>
        <p className="placeholder-text" style={{ fontSize: '14px', maxWidth: '360px' }}>
          Try changing your search terms or adjusting the status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="paper-table-wrapper">
      <table className="paper-table">
        <thead>
          <tr>
            <th className="col-title-authors">Paper</th>
            <th className="col-year">Year</th>
            <th className="col-area">Area</th>
            <th className="col-concepts">Concepts</th>
            <th className="col-status">Status</th>
            <th className="col-date">Added</th>
            <th className="col-actions" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => (
            <PaperRow key={paper.id} paper={paper} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaperTable;
