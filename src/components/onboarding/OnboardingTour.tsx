import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { TOUR_STEPS } from './tourSteps';

const STORAGE_KEY = 'ideaforge_tour_seen';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Polls for the target element (by id) since the tour navigates across routes
 * and pages fetch data asynchronously — the element may not exist yet on the
 * frame right after navigation.
 */
function useTargetRect(targetId: string | null, tick: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const measure = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        requestAnimationFrame(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        });
        return true;
      }
      return false;
    };

    setRect(null);
    const interval = setInterval(() => {
      attempts += 1;
      if (measure() || attempts > 30) {
        clearInterval(interval); // ~3s timeout, then gives up gracefully and centers
      }
    }, 100);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // `tick` forces a re-run when the step changes even if targetId repeats
  }, [targetId, tick]);

  return rect;
}

function placeTooltip(rect: Rect | null, placement: string) {
  const gap = 16;
  const width = 360;
  if (!rect || placement === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties;
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (placement) {
    case 'right':
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 100, vh - 320)),
        left: Math.min(rect.left + rect.width + gap, vw - width - 16)
      };
    case 'left':
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 100, vh - 320)),
        left: Math.max(16, rect.left - width - gap)
      };
    case 'top':
      return {
        top: Math.max(16, rect.top - 240),
        left: Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), vw - width - 16)
      };
    case 'bottom':
    default:
      return {
        top: Math.min(rect.top + rect.height + gap, vh - 320),
        left: Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), vw - width - 16)
      };
  }
}

export const triggerProductTour = () => {
  window.dispatchEvent(new CustomEvent('ideaforge:start_tour'));
};

const OnboardingTour: React.FC = () => {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const hasLaunched = useRef(false);

  // Auto-launch once, on first visit to the dashboard shell
  useEffect(() => {
    if (hasLaunched.current) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      hasLaunched.current = true;
      setActive(true);
      setIndex(0);
    }
  }, []);

  // Custom Event for Replay Trigger across any header/help button
  useEffect(() => {
    const handleStartTour = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener('ideaforge:start_tour', handleStartTour);
    return () => {
      window.removeEventListener('ideaforge:start_tour', handleStartTour);
    };
  }, []);

  const step = TOUR_STEPS[index] || TOUR_STEPS[0];

  // Navigate to the step's route whenever the step changes
  useEffect(() => {
    if (!active) return;
    if (step && location.pathname !== step.route) {
      navigate(step.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  const onRoute = location.pathname === step.route;
  const rect = useTargetRect(onRoute ? step.targetId : null, index);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (index === TOUR_STEPS.length - 1) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const replay = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);

  // Keyboard Navigation: Escape to close, Left/Right arrows to step
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish();
      } else if (e.key === 'ArrowRight') {
        next();
      } else if (e.key === 'ArrowLeft') {
        back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, finish, next, back]);

  if (!active) {
    return createPortal(
      <button
        onClick={replay}
        aria-label="Replay onboarding product tour"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'var(--bg-card, #12141a)',
          border: '1px solid var(--border-color, #272a34)',
          color: 'var(--accent-light, #38bdf8)',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          zIndex: 80,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease'
        }}
      >
        <HelpCircle size={14} />
        <span>Product Tour</span>
      </button>,
      document.body
    );
  }

  const Icon = step.icon;
  const showSpotlight = step.targetId && rect;
  const pad = 10;

  return createPortal(
    <>
      {/* Overlay: cutout spotlight when we have a target, full dim otherwise */}
      <div
        style={
          showSpotlight
            ? {
              position: 'fixed',
              top: rect!.top - pad,
              left: rect!.left - pad,
              width: rect!.width + pad * 2,
              height: rect!.height + pad * 2,
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(6,6,8,0.85)',
              border: '1.5px solid var(--accent, #0ea5e9)',
              transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
              zIndex: 990,
              pointerEvents: 'none',
            }
            : {
              position: 'fixed',
              inset: 0,
              background: 'rgba(6,6,8,0.85)',
              zIndex: 990,
            }
        }
      />

      {/* Tooltip card */}
      <div
        className="onboarding-tooltip-card"
        style={{
          position: 'fixed',
          zIndex: 1000,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-card, #12141a)',
          border: '1px solid var(--border-color, #2a2e39)',
          borderRadius: 14,
          padding: '20px 20px 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
          ...placeTooltip(step.placement === 'center' ? null : rect, step.placement),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={16} color="var(--accent-light, #38bdf8)" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--text-muted, #94a3b8)', letterSpacing: 0.3 }}>
            {index + 1} / {TOUR_STEPS.length}
          </div>
          <button
            onClick={finish}
            aria-label="Skip and close tour"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4
            }}
            title="Close Tour (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary, #f8fafc)',
            lineHeight: 1.35,
            marginBottom: 8,
          }}
        >
          {step.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.55, marginBottom: 16 }}>
          {step.body}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: i <= index ? 'var(--accent, #0ea5e9)' : 'var(--border-color, #2a2e39)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={finish}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '6px 4px',
              textDecoration: 'underline'
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 12px' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, padding: '7px 14px' }}
            >
              <span>{step.ctaLabel || (index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next')}</span>
              {index < TOUR_STEPS.length - 1 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default OnboardingTour;
