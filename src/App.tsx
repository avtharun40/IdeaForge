import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import PapersPage from './pages/Dashboard/PapersPage';
import PaperDetailPage from './pages/Dashboard/PaperDetailPage';
import OpportunitiesPage from './pages/Dashboard/OpportunitiesPage';
import OpportunityDetailPage from './pages/Dashboard/OpportunityDetailPage';
import ResearchGapsPage from './pages/Dashboard/ResearchGapsPage';
import GapDetailPage from './pages/Dashboard/GapDetailPage';
import EvidencePage from './pages/Dashboard/EvidencePage';
import ResearchGraphPage from './pages/Dashboard/ResearchGraphPage';
import SettingsPage from './pages/Dashboard/SettingsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Workspace Dashboard Pages - Direct Access */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/papers" element={<PapersPage />} />
          <Route path="/papers/:id" element={<PaperDetailPage />} />
          <Route path="/research-graph" element={<ResearchGraphPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="/gaps" element={<ResearchGapsPage />} />
          <Route path="/gaps/:id" element={<GapDetailPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
