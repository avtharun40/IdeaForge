import React from 'react';
import type { ResearchArea } from '../../types';

interface ResearchAreasProps {
  areas: ResearchArea[];
}

const ResearchAreas: React.FC<ResearchAreasProps> = ({ areas }) => {
  return (
    <div className="research-areas-container">
      {areas.map((area) => (
        <div key={area.id} className="area-chip-card">
          <span className="area-chip-name">{area.name}</span>
          <span className="area-chip-count">{area.count} papers</span>
        </div>
      ))}
    </div>
  );
};

export default ResearchAreas;
