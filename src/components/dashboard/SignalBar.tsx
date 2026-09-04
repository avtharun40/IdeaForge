import React from 'react';

interface SignalBarProps {
  label: string;
  value: number;
}

const SignalBar: React.FC<SignalBarProps> = ({ label, value }) => {
  return (
    <div className="metric" style={{ width: '100%', marginBottom: '16px' }}>
      <div className="lrow">
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}%</span>
      </div>
      <div className="bar-track">
        <div 
          className="bar-fill" 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
};

export default SignalBar;
