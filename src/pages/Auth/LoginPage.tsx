import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PRECONFIGURED_RESEARCHERS } from '../../services/authService';
import { Shield, Sparkles, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft, Lock, Mail, User as UserIcon, Building } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { isAuthenticated, login, register, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'signin' or 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Return destination
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await login({ email, password });
      } else {
        await register({
          name,
          email,
          password,
          institution,
          role: 'researcher'
        });
      }
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (researcherEmail: string, researcherPass: string) => {
    setEmail(researcherEmail);
    setPassword(researcherPass);
    setErrorMessage(null);
  };

  return (
    <div className="auth-page-container">
      {/* Ambient background glow */}
      <div className="auth-bg-glow" aria-hidden="true" />

      <div className="auth-card-wrap">
        {/* Top Back Link */}
        <div className="auth-nav-top">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Landing Page</span>
          </Link>
        </div>

        <div className="auth-card">
          {/* Header Brand */}
          <div className="auth-header">
            <div className="auth-logo-badge">
              <Sparkles size={20} className="auth-badge-icon" />
            </div>
            <h1 className="auth-title">
              {mode === 'signin' ? 'Sign in to IdeaForge' : 'Request Research Access'}
            </h1>
            <p className="auth-subtitle">
              {mode === 'signin'
                ? 'Enter your credentials to access the research workspace and intelligence tools.'
                : 'Create your IdeaForge researcher profile to analyze literature and explore opportunities.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-tab-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
            >
              Get Access
            </button>
          </div>

          {/* Quick-Select Demo Researcher Profiles */}
          <div className="auth-quick-select-panel">
            <div className="quick-select-header">
              <Shield size={13} className="shield-icon" />
              <span>Verified Researcher Accounts (1-Click Demo)</span>
            </div>
            <div className="quick-select-list">
              {PRECONFIGURED_RESEARCHERS.map((r) => (
                <button
                  key={r.user.id}
                  type="button"
                  className={`quick-select-btn ${email === r.email ? 'selected' : ''}`}
                  onClick={() => handleQuickSelect(r.email, r.defaultPass)}
                  title={`Fill as ${r.user.name}`}
                >
                  <div className="quick-select-avatar">{r.user.avatar}</div>
                  <div className="quick-select-info">
                    <span className="quick-name">{r.user.name}</span>
                    <span className="quick-role">{r.user.institution}</span>
                  </div>
                  {email === r.email && <CheckCircle2 size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <div className="input-with-icon">
                    <UserIcon size={16} className="input-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      placeholder="e.g. Dr. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="auth-institution">Institution or Lab</label>
                  <div className="input-with-icon">
                    <Building size={16} className="input-icon" />
                    <input
                      id="auth-institution"
                      type="text"
                      placeholder="e.g. MIT CSAIL / Independent"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Academic or Institutional Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="researcher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="auth-password">Password</label>
                {mode === 'signin' && (
                  <span className="pass-hint">Demo: IdeaForge2026!</span>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Researcher Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="auth-footer-note">
            <p>
              By accessing IdeaForge, you authenticate as an academic investigator with access to
              connected literature graphs and evidence synthesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
