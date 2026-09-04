import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, HelpCircle } from 'lucide-react';
import { triggerProductTour } from '../onboarding/OnboardingTour';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();

  const getHeaderInfo = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) {
      return {
        title: 'Research Dashboard',
        description: 'Analyze literature corpus, discover concepts, and identify unexplored gaps.'
      };
    }
    if (pathname.startsWith('/papers')) {
      return {
        title: 'Academic Papers',
        description: 'Manage and review the documents within your research repository.'
      };
    }
    if (pathname.startsWith('/research-graph')) {
      return {
        title: 'Research Knowledge Graph',
        description: 'Interactive 2D graph of cross-paper entities, concepts, methods, datasets, claims, and limitations.'
      };
    }
    if (pathname.startsWith('/opportunities')) {
      return {
        title: 'Research Opportunities',
        description: 'Explore weakly connected concepts flagged as potential research directions.'
      };
    }
    if (pathname.startsWith('/gaps')) {
      return {
        title: 'Research Gaps',
        description: 'Discover unexplored boundaries, methodology voids, and underexplored areas.'
      };
    }
    if (pathname.startsWith('/evidence')) {
      return {
        title: 'Evidence Explorer',
        description: 'Follow the traceable verification trails supporting detected research opportunities.'
      };
    }
    if (pathname.startsWith('/settings')) {
      return {
        title: 'Settings',
        description: 'Configure layout styles, processing nodes, and workspace options.'
      };
    }
    return {
      title: 'IdeaForge',
      description: 'AI-powered literature analysis and research discovery.'
    };
  };

  const info = getHeaderInfo(location.pathname);

  return (
    <header className="dashboard-app-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn" 
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="dashboard-header-title">{info.title}</h2>
          <p className="dashboard-header-desc">{info.description}</p>
        </div>
      </div>

      <div className="dashboard-header-right">
        {/* Mock Search UI */}
        <div className="mock-search-bar">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search research..." 
            disabled 
            style={{ 
              border: 'none', 
              background: 'transparent', 
              outline: 'none', 
              color: 'inherit', 
              width: '120px', 
              fontSize: '13px' 
            }} 
          />
        </div>

        {/* Product Tour Trigger Button */}
        <button 
          type="button"
          className="header-icon-btn" 
          onClick={() => triggerProductTour()}
          aria-label="Take Product Tour"
          title="Take Product Tour"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '0 10px', fontSize: '12px' }}
        >
          <HelpCircle size={16} style={{ color: 'var(--accent-light, #38bdf8)' }} />
          <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>Tour</span>
        </button>
        
        {/* Mock Notification UI */}
        <button className="header-icon-btn" aria-label="Notifications" disabled>
          <Bell size={18} />
          <span className="notification-badge" />
        </button>

        {/* User Info */}
        <div className="user-profile">
          <span className="user-role">Researcher Mode</span>
          <div className="user-avatar">
            R
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
