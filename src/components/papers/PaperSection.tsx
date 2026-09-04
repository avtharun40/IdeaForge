import React from 'react';

interface PaperSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const PaperSection: React.FC<PaperSectionProps> = ({ title, icon, children }) => {
  return (
    <div className="dashboard-card paper-details-section">
      <div className="details-section-header">
        {icon && <span className="details-section-icon">{icon}</span>}
        <h3 className="details-section-title">{title}</h3>
      </div>
      <div className="details-section-body">
        {children}
      </div>
    </div>
  );
};

export default PaperSection;
