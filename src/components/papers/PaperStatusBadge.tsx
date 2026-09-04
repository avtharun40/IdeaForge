import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PaperStatus } from '../../types';

interface PaperStatusBadgeProps {
  status: PaperStatus;
}

const PaperStatusBadge: React.FC<PaperStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Ready':
      return (
        <span className="status-badge ready" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={12} />
          <span>Ready</span>
        </span>
      );
    case 'Processing':
      return (
        <span className="status-badge processing" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Loader2 size={12} className="animate-spin" />
          <span>Processing</span>
        </span>
      );
    case 'Failed':
      return (
        <span className="status-badge failed" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={12} />
          <span>Failed</span>
        </span>
      );
    default:
      return null;
  }
};

export default PaperStatusBadge;
