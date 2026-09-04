import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  UploadCloud,
  Cpu,
  Network,
  Lightbulb,
  ShieldCheck,
  Compass,
  FileText,
  CheckCircle2
} from 'lucide-react';

export interface TourStep {
  title: string;
  body: string;
  route: string;
  targetId: string | null;
  placement: 'center' | 'top' | 'bottom' | 'left' | 'right';
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  ctaLabel?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to IdeaForge',
    body: 'IdeaForge is an AI-powered academic research copilot that turns research papers into unified knowledge graphs, identifies underexplored research gaps, and formulates high-impact opportunities with traceable evidence.',
    route: '/dashboard',
    targetId: null,
    placement: 'center',
    icon: Sparkles,
    ctaLabel: 'Begin Tour'
  },
  {
    title: 'Research Intelligence Dashboard',
    body: 'Monitor overall corpus health — including total analyzed papers, research entities, validated gaps, and ranked opportunity targets at a glance.',
    route: '/dashboard',
    targetId: 'tour-dashboard-stats',
    placement: 'bottom',
    icon: LayoutDashboard,
    ctaLabel: 'Next: Upload Papers'
  },
  {
    title: 'Asynchronous Paper Ingestion',
    body: 'Upload single or batch academic PDFs (up to 100MB). Ingestion triggers immediately in the background so you can continue using the dashboard without waiting.',
    route: '/papers',
    targetId: 'tour-upload-btn',
    placement: 'bottom',
    icon: UploadCloud,
    ctaLabel: 'Next: Ingestion Pipeline'
  },
  {
    title: 'Live Ingestion & Processing Pipeline',
    body: 'Watch papers transition through extraction (20%), Gemini AI deep analysis (60%), and Neo4j graph construction (85%) with live stage progress tracking.',
    route: '/papers',
    targetId: 'tour-papers-list',
    placement: 'bottom',
    icon: Cpu,
    ctaLabel: 'Next: Knowledge Graph'
  },
  {
    title: 'Unified Research Knowledge Graph',
    body: 'Explore cross-paper semantic relationships connecting concepts, methods, datasets, claims, limitations, and future work in a clean 2D interactive graph.',
    route: '/papers',
    targetId: 'tour-research-graph',
    placement: 'top',
    icon: Network,
    ctaLabel: 'Next: Research Gaps'
  },
  {
    title: 'Automated Research Gap Engine',
    body: 'Discover underexplored concept combinations, recurring limitations, and unresolved future work extracted algorithmically from literature.',
    route: '/gaps',
    targetId: 'tour-research-gaps',
    placement: 'bottom',
    icon: Lightbulb,
    ctaLabel: 'Next: Evidence Explorer'
  },
  {
    title: 'Traceable Evidence Trails',
    body: 'Every detected gap is backed by traceable evidence passages with multi-tier validation, relevance scores, and direct paper provenance.',
    route: '/evidence',
    targetId: 'tour-evidence-explorer',
    placement: 'bottom',
    icon: ShieldCheck,
    ctaLabel: 'Next: Opportunities'
  },
  {
    title: 'Ranked Research Opportunities',
    body: 'Review multi-dimensional opportunity profiles scored on Novelty, Evidence strength, Feasibility, Impact, and Temporal trends.',
    route: '/opportunities',
    targetId: 'tour-opportunities',
    placement: 'bottom',
    icon: Compass,
    ctaLabel: 'Next: Paper Details'
  },
  {
    title: 'Deep AI Paper Understanding',
    body: 'Access authoritative AI-extracted methodology, contributions, claims, dataset schemas, and structured knowledge graphs for any paper.',
    route: '/papers',
    targetId: 'tour-paper-details',
    placement: 'bottom',
    icon: FileText,
    ctaLabel: 'Next: Start Researching'
  },
  {
    title: 'Ready to Forge New Ideas?',
    body: 'You are all set! Upload your academic papers to build your personalized research corpus and discover validated, high-confidence research opportunities.',
    route: '/dashboard',
    targetId: null,
    placement: 'center',
    icon: CheckCircle2,
    ctaLabel: 'Start Researching'
  }
];
