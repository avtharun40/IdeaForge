import React from 'react';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="placeholder-container">
      <div className="placeholder-icon">
        <Settings size={48} />
      </div>
      <h1 className="placeholder-title">Settings</h1>
      <p className="placeholder-text">
        Configure IdeaForge API keys, upload preferences, analysis thresholds, and dashboard display styles.
      </p>
    </div>
  );
};

export default SettingsPage;
