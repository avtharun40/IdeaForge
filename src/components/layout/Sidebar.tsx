import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Network, Lightbulb, Compass, ShieldCheck, Settings, Home, X, HelpCircle } from 'lucide-react';
import { triggerProductTour } from '../onboarding/OnboardingTour';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="dashboard-sidebar-header">
          <Link className="logo" to="/" onClick={onClose}>IdeaForge</Link>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="dashboard-sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/papers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <FileText size={18} />
            <span>Papers</span>
          </NavLink>

          <NavLink to="/research-graph" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Network size={18} />
            <span>Research Graph</span>
          </NavLink>

          <NavLink to="/gaps" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Lightbulb size={18} />
            <span>Research Gaps</span>
          </NavLink>

          <NavLink to="/opportunities" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Compass size={18} />
            <span>Opportunities</span>
          </NavLink>

          <NavLink to="/evidence" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ShieldCheck size={18} />
            <span>Evidence Explorer</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-soft)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              className="sidebar-link"
              onClick={() => {
                onClose();
                triggerProductTour();
              }}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <HelpCircle size={18} />
              <span>Product Tour</span>
            </button>

            <Link to="/" className="sidebar-link" onClick={onClose}>
              <Home size={18} />
              <span>Back to Landing</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
