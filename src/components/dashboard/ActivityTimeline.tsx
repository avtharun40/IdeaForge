import React from 'react';
import type { ActivityItem } from '../../types';

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  return (
    <div className="activity-timeline">
      {activities.map((activity, index) => (
        <div key={activity.id} className="timeline-item">
          <div className="timeline-marker">
            <div className="timeline-dot" />
            {index !== activities.length - 1 && <div className="timeline-line" />}
          </div>
          <div className="timeline-content">
            <p className="timeline-text">{activity.text}</p>
            <span className="timeline-time">{activity.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
