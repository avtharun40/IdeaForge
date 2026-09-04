import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ResearchOpportunity } from '../../types';

interface OpportunityCardProps {
  opportunity: ResearchOpportunity;
  isSelected?: boolean;
  onSelect?: () => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, isSelected = false, onSelect }) => {
  const oppId = opportunity.opportunity_id || (opportunity as any).id || (opportunity as any)._id || '';
  const oppAny = opportunity as any;
  const conceptA = oppAny.conceptA || oppAny.supporting_entities?.[0] || '[Unresolved Concept]';
  const conceptB = oppAny.conceptB || oppAny.supporting_entities?.[1] || '[Unresolved Concept]';
  const evidenceScore = oppAny.score ?? oppAny.evidence_score ?? oppAny.evidenceScore ?? 0;
  const evidenceTier = oppAny.validation_status === 'SUPPORTED' ? 'HIGH' : (oppAny.evidenceTier || (oppAny.validation_status === 'PARTIALLY_SUPPORTED' ? 'MEDIUM' : 'LOW'));

  return (
    <div 
      className={`opportunity-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      <div className="opp-card-top">
        <div className="opp-card-badge-row">
          <span className="tier-badge">{`EVIDENCE: ${evidenceTier}`}</span>
          <span className="opp-score-badge">{`${evidenceScore}% Score`}</span>
        </div>
      </div>
      
      <div className="opp-concepts-row">
        <div className="concept-chip">
          <strong>{conceptA}</strong>
        </div>
        <span className="concept-bridge-arrow">↔</span>
        <div className="concept-chip">
          <strong>{conceptB}</strong>
        </div>
      </div>
      
      <div className="opp-card-actions">
        <span className="opp-indicator-text">
          {evidenceTier === 'HIGH' ? '● Strong Literature Signal' : '○ Moderate Literature Signal'}
        </span>
        {oppId ? (
          <Link 
            to={`/opportunities/${oppId}`} 
            className="opp-details-link"
            onClick={(e) => e.stopPropagation()}
          >
            <span>View Details</span>
            <ArrowRight size={14} />
          </Link>
        ) : (
          <span className="opp-details-link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <span>View Details</span>
            <ArrowRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
};

export default OpportunityCard;
