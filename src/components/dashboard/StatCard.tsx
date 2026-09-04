import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  secondaryText?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, secondaryText }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <div className="stat-card-icon">{icon}</div>}
      </div>
      <div className="stat-card-value">{value}</div>
      {secondaryText && (
        <div className="stat-card-secondary">{secondaryText}</div>
      )}
    </div>
  );
};

export default StatCard;
