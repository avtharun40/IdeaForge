import React, { useState, useEffect, useRef } from 'react';
import { getPaperGraph, getFullGraph, buildPaperGraph, getEntityPapers } from '../../services/graphService';
import { Search, ZoomIn, ZoomOut, Maximize2, AlertTriangle, Loader2, Compass, GitMerge, Info, RefreshCw, X } from 'lucide-react';
import type { GraphRelationship, GraphStats } from '../../types';

interface PaperGraphViewProps {
  paperId: string;
  onStatsUpdated?: (stats: GraphStats) => void;
  height?: string;
}

interface PhysicsNode {
  id: string;
  label: string;
  name: string;
  type: string;
  description: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  confidence?: number;
  properties?: any;
}

type LayoutStyle = 'force' | 'radial' | 'hierarchical';

// Color mappings based on Node Category/Type
const NODE_COLORS: Record<string, string> = {
  'Paper': '#a855f7',       // Purple
  'PROBLEM': '#f43f5e',     // Rose Red
  'METHOD': '#10b981',      // Emerald Green
  'MODEL': '#3b82f6',       // Blue
  'DATASET': '#06b6d4',     // Cyan
  'DOMAIN': '#eab308',      // Yellow
  'CONCEPT': '#f97316',     // Orange
  'CLAIM': '#ec4899',       // Pink
  'LIMITATION': '#ef4444',  // Red
  'FUTUREWORK': '#14b8a6',  // Teal
  'APPLICATION': '#8b5cf6', // Violet
  'METRIC': '#6366f1',      // Indigo
  'DEFAULT': '#64748b'      // Slate gray
};

const getNodeColor = (label: string, type?: string): string => {
  if (label === 'Paper') return NODE_COLORS['Paper'];
  if (label === 'Claim') return NODE_COLORS['CLAIM'];
  if (label === 'Limitation') return NODE_COLORS['LIMITATION'];
  if (label === 'FutureWork') return NODE_COLORS['FUTUREWORK'];

  const t = String(type || '').toUpperCase();
  return NODE_COLORS[t] || NODE_COLORS['DEFAULT'];
};

// Node Radius Hierarchy
const getNodeRadius = (label: string, type?: string): number => {
  if (label === 'Paper') return 22;

  const t = String(type || '').toUpperCase();
  const l = String(label || '').toUpperCase();

  if (t === 'PROBLEM' || t === 'METHOD' || l === 'PROBLEM' || l === 'METHOD') return 16;
  if (t === 'MODEL' || t === 'DATASET' || t === 'DOMAIN' || l === 'MODEL' || l === 'DATASET' || l === 'DOMAIN') return 13;

  // Default small nodes (Concept, Claim, Limitation, FutureWork)
  return 10;
};

const PaperGraphView: React.FC<PaperGraphViewProps> = ({ paperId, onStatsUpdated, height = '620px' }) => {
  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [relationships, setRelationships] = useState<GraphRelationship[]>([]);
  const [rawNodes, setRawNodes] = useState<PhysicsNode[]>([]);
  const [rawRelationships, setRawRelationships] = useState<GraphRelationship[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [building, setBuilding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Layout selection state
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('force');

  // Filters state
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('ALL');
  const [relTypeFilter, setRelTypeFilter] = useState<string>('ALL');

  // UI Interactive States
  const [selectedNode, setSelectedNode] = useState<PhysicsNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<PhysicsNode | null>(null);
  const [hoveredRelationship, setHoveredRelationship] = useState<GraphRelationship | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Screen size detection for responsiveness
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Connected papers for the selected entity (API fetch)
  const [connectedPapers, setConnectedPapers] = useState<any[]>([]);
  const [loadingConnectedPapers, setLoadingConnectedPapers] = useState<boolean>(false);

  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Listen to window size changes
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch connected papers when a ResearchEntity is selected
  useEffect(() => {
    if (!selectedNode || (selectedNode.label !== 'ResearchEntity' && selectedNode.label !== 'Paper')) {
      setConnectedPapers([]);
      return;
    }

    if (selectedNode.label === 'ResearchEntity') {
      const fetchPapers = async () => {
        setLoadingConnectedPapers(true);
        try {
          const papers = await getEntityPapers(selectedNode.id);
          setConnectedPapers(papers);
        } catch (err) {
          console.error('Failed to load entity papers:', err);
        } finally {
          setLoadingConnectedPapers(false);
        }
      };
      fetchPapers();
    }
  }, [selectedNode?.id]);

  // Compute static positions based on Layout Style
  const computeStaticPositions = (nodesList: PhysicsNode[], _relsList: GraphRelationship[], style: LayoutStyle): PhysicsNode[] => {
    if (nodesList.length === 0) return [];

    if (style === 'force') {
      return nodesList.map(n => {
        if (n.label === 'Paper' && nodesList.filter(x => x.label === 'Paper').length === 1) {
          return { ...n, fx: 400, fy: 300, x: 400, y: 300, vx: 0, vy: 0 };
        }
        return { ...n, fx: null, fy: null };
      });
    }

    if (style === 'radial') {
      const innerNodes: PhysicsNode[] = [];
      const middleNodes: PhysicsNode[] = [];
      const outerNodes: PhysicsNode[] = [];

      nodesList.forEach(n => {
        if (n.label === 'Paper') return;
        const typeUpper = String(n.type || '').toUpperCase();
        const labelUpper = String(n.label || '').toUpperCase();

        if (labelUpper === 'CLAIM' || labelUpper === 'LIMITATION' || labelUpper === 'FUTUREWORK') {
          innerNodes.push(n);
        } else if (typeUpper === 'METHOD' || typeUpper === 'DATASET' || typeUpper === 'PROBLEM' || typeUpper === 'MODEL') {
          middleNodes.push(n);
        } else {
          outerNodes.push(n);
        }
      });

      return nodesList.map(n => {
        if (n.label === 'Paper' && nodesList.filter(x => x.label === 'Paper').length === 1) {
          return { ...n, fx: 400, fy: 300, x: 400, y: 300, vx: 0, vy: 0 };
        }

        let ringRadius = 0;
        let nodeIndex = 0;
        let totalInRing = 0;

        let idx = innerNodes.findIndex(item => item.id === n.id);
        if (idx !== -1) {
          ringRadius = 140;
          nodeIndex = idx;
          totalInRing = innerNodes.length;
        } else {
          idx = middleNodes.findIndex(item => item.id === n.id);
          if (idx !== -1) {
            ringRadius = 240;
            nodeIndex = idx;
            totalInRing = middleNodes.length;
          } else {
            idx = outerNodes.findIndex(item => item.id === n.id);
            ringRadius = 330;
            nodeIndex = idx !== -1 ? idx : 0;
            totalInRing = outerNodes.length || 1;
          }
        }

        const angle = totalInRing > 0 ? (nodeIndex / totalInRing) * 2 * Math.PI : 0;
        const x = 400 + Math.cos(angle) * ringRadius;
        const y = 300 + Math.sin(angle) * ringRadius;
        return { ...n, fx: x, fy: y, x, y, vx: 0, vy: 0 };
      });
    }

    if (style === 'hierarchical') {
      const papers = nodesList.filter(n => n.label === 'Paper');
      const level1Nodes: PhysicsNode[] = [];
      const level2Nodes: PhysicsNode[] = [];

      nodesList.forEach(n => {
        if (n.label === 'Paper') return;
        const typeUpper = String(n.type || '').toUpperCase();
        const labelUpper = String(n.label || '').toUpperCase();

        if (typeUpper === 'METHOD' || typeUpper === 'DATASET' || labelUpper === 'CLAIM') {
          level1Nodes.push(n);
        } else {
          level2Nodes.push(n);
        }
      });

      return nodesList.map(n => {
        if (n.label === 'Paper') {
          const idx = papers.findIndex(p => p.id === n.id);
          const totalP = papers.length;
          const px = 400 + (idx - (totalP - 1) / 2) * 220;
          return { ...n, fx: px, fy: 70, x: px, y: 70, vx: 0, vy: 0 };
        }

        let y = 300;
        let x = 400;

        let idx = level1Nodes.findIndex(item => item.id === n.id);
        if (idx !== -1) {
          y = 240;
          const total = level1Nodes.length;
          const step = Math.min(160, 760 / (total + 1 || 1));
          x = 400 + (idx - (total - 1) / 2) * step;
        } else {
          idx = level2Nodes.findIndex(item => item.id === n.id);
          y = 440;
          const total = level2Nodes.length;
          const step = Math.min(80, 760 / (total + 1 || 1));
          x = 400 + (idx - (total - 1) / 2) * step;
        }

        return { ...n, fx: x, fy: y, x, y, vx: 0, vy: 0 };
      });
    }

    return nodesList;
  };

  // Fits the graph viewport around all nodes
  const fitGraphToViewport = (nodesList: PhysicsNode[]) => {
    if (nodesList.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodesList.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const padding = 70;
    const graphWidth = maxX - minX || 1;
    const graphHeight = maxY - minY || 1;

    const svg = svgRef.current;
    const width = svg ? svg.clientWidth || 800 : 800;
    const height = svg ? svg.clientHeight || 540 : 540;

    const scaleX = (width - padding * 2) / graphWidth;
    const scaleY = (height - padding * 2) / graphHeight;
    const newZoom = Math.min(1.4, Math.max(0.4, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: width / 2 - centerX * newZoom,
      y: height / 2 - centerY * newZoom
    });
  };

  // Run in-memory simulation warmup
  const runWarmupSimulation = (initializedNodes: PhysicsNode[], rels: GraphRelationship[]): PhysicsNode[] => {
    const currentNodes = initializedNodes.map(n => ({ ...n }));

    for (let tick = 0; tick < 200; tick++) {
      // 1. Repulsion forces between nodes
      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i];
        if (n1.fx !== undefined && n1.fx !== null) continue;

        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 450) {
            const force = 16000 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring forces along links
      rels.forEach(rel => {
        const sourceNode = currentNodes.find(n => n.id === rel.source);
        const targetNode = currentNodes.find(n => n.id === rel.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const restLength = 150;
          const k = 0.04;
          const force = (dist - restLength) * k;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (sourceNode.fx === undefined || sourceNode.fx === null) {
            sourceNode.vx += fx;
            sourceNode.vy += fy;
          }
          if (targetNode.fx === undefined || targetNode.fx === null) {
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        }
      });

      // 3. Central gravity and position updates
      currentNodes.forEach(node => {
        if (node.fx !== undefined && node.fx !== null) {
          node.x = node.fx;
          node.y = node.fy!;
          node.vx = 0;
          node.vy = 0;
          return;
        }

        const gravity = 0.02;
        node.vx += (400 - node.x) * gravity;
        node.vy += (300 - node.y) * gravity;

        node.vx *= 0.82;
        node.vy *= 0.82;

        node.x += node.vx;
        node.y += node.vy;
      });

      // 4. Collision detection & resolution
      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i];
        const r1 = getNodeRadius(n1.label, n1.type);
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j];
          const r2 = getNodeRadius(n2.label, n2.type);
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = r1 + r2 + 25;

          if (dist < minDist) {
            const overlap = minDist - dist;
            const pushX = (dx / dist) * overlap * 0.5;
            const pushY = (dy / dist) * overlap * 0.5;

            if (n1.fx === undefined || n1.fx === null) {
              n1.x -= pushX;
              n1.y -= pushY;
            }
            if (n2.fx === undefined || n2.fx === null) {
              n2.x += pushX;
              n2.y += pushY;
            }
          }
        }
      }
    }

    return currentNodes;
  };

  // Load and construct the knowledge graph
  const loadGraph = async () => {
    setLoading(true);
    setErrorMsg('');
    setIsOffline(false);
    setSelectedNode(null);

    try {
      const data = paperId === 'ALL' ? await getFullGraph(350) : await getPaperGraph(paperId);

      if (data.nodes.length === 0 && paperId !== 'ALL') {
        await handleBuildGraph();
        return;
      }

      // Propagate stats dynamically to parent
      if (onStatsUpdated) {
        const concepts = data.nodes.filter(n => n.properties?.type === 'CONCEPT' || n.properties?.type === 'concept').length;
        const methods = data.nodes.filter(n => n.properties?.type === 'METHOD' || n.properties?.type === 'method').length;
        const datasets = data.nodes.filter(n => n.properties?.type === 'DATASET' || n.properties?.type === 'dataset').length;
        const claims = data.nodes.filter(n => n.label === 'Claim').length;

        onStatsUpdated({
          papers: data.nodes.filter(n => n.label === 'Paper').length,
          nodes: data.nodes.length,
          relationships: data.relationships.length,
          concepts,
          methods,
          datasets,
          claims
        });
      }

      // Initialize base circular positions
      const initializedNodes: PhysicsNode[] = data.nodes.map((n, i) => {
        const angle = (i / (data.nodes.length || 1)) * 2 * Math.PI;
        const radius = 180 + Math.random() * 40;
        const name = n.properties.name || n.properties.title || n.properties.text || '';
        return {
          id: n.id,
          label: n.label,
          name,
          type: n.properties.type || n.label,
          description: n.properties.description || n.properties.purpose || n.properties.text || '',
          confidence: n.properties.confidence,
          properties: n.properties,
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        };
      });

      setRawNodes(initializedNodes);
      setRawRelationships(data.relationships);

      // Position based on current style
      const positionedNodes = computeStaticPositions(initializedNodes, data.relationships, layoutStyle);
      const settledNodes = layoutStyle === 'force' ? runWarmupSimulation(positionedNodes, data.relationships) : positionedNodes;

      setNodes(settledNodes);
      setRelationships(data.relationships);
      fitGraphToViewport(settledNodes);

    } catch (err: any) {
      if (err.code === 'NEO4J_UNAVAILABLE' || err.message?.includes('offline') || err.message?.includes('unreachable')) {
        setIsOffline(true);
        setErrorMsg('Neo4j Graph Database is currently offline. Please launch the Neo4j server and verify environment variables.');
      } else {
        setErrorMsg(err.message || 'Failed to load Knowledge Graph.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuildGraph = async () => {
    if (paperId === 'ALL') return;
    setBuilding(true);
    setErrorMsg('');
    setIsOffline(false);
    try {
      await buildPaperGraph(paperId);
      setTimeout(() => {
        loadGraph();
        setBuilding(false);
      }, 1000);
    } catch (err: any) {
      setBuilding(false);
      if (err.code === 'NEO4J_UNAVAILABLE' || err.message?.includes('offline') || err.message?.includes('unreachable')) {
        setIsOffline(true);
        setErrorMsg('Neo4j database is offline.');
      } else {
        setErrorMsg(err.message || 'Failed to construct graph.');
      }
    }
  };

  // Reload when Selected Paper ID changes
  useEffect(() => {
    loadGraph();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [paperId]);

  // Recalculate layout style when toggled
  useEffect(() => {
    if (rawNodes.length === 0) return;
    const positioned = computeStaticPositions(nodes.length > 0 ? nodes : rawNodes, relationships, layoutStyle);
    const settled = layoutStyle === 'force' ? runWarmupSimulation(positioned, relationships) : positioned;
    setNodes(settled);
    fitGraphToViewport(settled);
  }, [layoutStyle]);

  // Apply filters (Node Type and Relationship Type)
  useEffect(() => {
    if (rawNodes.length === 0) return;

    let filteredNodes = rawNodes;
    if (nodeTypeFilter !== 'ALL') {
      const filterUpper = nodeTypeFilter.toUpperCase();
      filteredNodes = rawNodes.filter(n => {
        if (filterUpper === 'PAPERS') return n.label === 'Paper';
        if (filterUpper === 'METHODS') return String(n.type).toUpperCase() === 'METHOD' || n.label === 'Method';
        if (filterUpper === 'CONCEPTS') return String(n.type).toUpperCase() === 'CONCEPT' || n.label === 'Concept';
        if (filterUpper === 'DATASETS') return String(n.type).toUpperCase() === 'DATASET' || n.label === 'Dataset';
        if (filterUpper === 'CLAIMS') return n.label === 'Claim';
        if (filterUpper === 'LIMITATIONS') return n.label === 'Limitation';
        if (filterUpper === 'FUTUREWORK') return n.label === 'FutureWork';
        return true;
      });
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    let filteredRels = rawRelationships.filter(r =>
      filteredNodeIds.has(r.source) && filteredNodeIds.has(r.target)
    );

    if (relTypeFilter !== 'ALL') {
      filteredRels = filteredRels.filter(r => r.type === relTypeFilter);
    }

    const positioned = computeStaticPositions(filteredNodes, filteredRels, layoutStyle);
    const settled = layoutStyle === 'force' ? runWarmupSimulation(positioned, filteredRels) : positioned;
    setNodes(settled);
    setRelationships(filteredRels);
  }, [nodeTypeFilter, relTypeFilter, rawNodes, rawRelationships]);

  // Search auto-focus viewport positioning
  useEffect(() => {
    if (!searchQuery.trim() || nodes.length === 0) return;

    const query = searchQuery.toLowerCase().trim();
    const matches = nodes.filter(n =>
      n.name.toLowerCase().includes(query) ||
      n.type.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
      const svg = svgRef.current;
      const width = svg ? svg.clientWidth || 800 : 800;
      const height = svg ? svg.clientHeight || 540 : 540;

      if (matches.length === 1) {
        const match = matches[0];
        setZoom(1.3);
        setPan({
          x: width / 2 - match.x * 1.3,
          y: height / 2 - match.y * 1.3
        });
        setSelectedNode(match);
      } else {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        matches.forEach(m => {
          if (m.x < minX) minX = m.x;
          if (m.x > maxX) maxX = m.x;
          if (m.y < minY) minY = m.y;
          if (m.y > maxY) maxY = m.y;
        });

        const padding = 80;
        const scaleX = (width - padding * 2) / (maxX - minX || 1);
        const scaleY = (height - padding * 2) / (maxY - minY || 1);
        const newZoom = Math.min(1.3, Math.max(0.45, Math.min(scaleX, scaleY)));

        setZoom(newZoom);
        setPan({
          x: width / 2 - ((minX + maxX) / 2) * newZoom,
          y: height / 2 - ((minY + maxY) / 2) * newZoom
        });
      }
    }
  }, [searchQuery]);

  // Continuous animation frame loop for interactive node dragging and layout settling
  useEffect(() => {
    if (nodes.length === 0) return;

    const tick = () => {
      if (layoutStyle === 'force') {
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          if (n1.fx !== undefined && n1.fx !== null) continue;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            if (dist < 400) {
              const force = 14000 / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        relationships.forEach(rel => {
          const sourceNode = nodes.find(n => n.id === rel.source);
          const targetNode = nodes.find(n => n.id === rel.target);
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const restLength = 150;
            const k = 0.04;
            const force = (dist - restLength) * k;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (sourceNode.fx === undefined || sourceNode.fx === null) {
              sourceNode.vx += fx;
              sourceNode.vy += fy;
            }
            if (targetNode.fx === undefined || targetNode.fx === null) {
              targetNode.vx -= fx;
              targetNode.vy -= fy;
            }
          }
        });

        nodes.forEach(node => {
          if (node.fx !== undefined && node.fx !== null) {
            node.x = node.fx;
            node.y = node.fy!;
            node.vx = 0;
            node.vy = 0;
            return;
          }

          const gravity = 0.02;
          node.vx += (400 - node.x) * gravity;
          node.vy += (300 - node.y) * gravity;

          node.vx *= 0.82;
          node.vy *= 0.82;

          node.x += node.vx;
          node.y += node.vy;
        });

        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          const r1 = getNodeRadius(n1.label, n1.type);
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const r2 = getNodeRadius(n2.label, n2.type);
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = r1 + r2 + 25;

            if (dist < minDist) {
              const overlap = minDist - dist;
              const pushX = (dx / dist) * overlap * 0.5;
              const pushY = (dy / dist) * overlap * 0.5;

              if (n1.fx === undefined || n1.fx === null) {
                n1.x -= pushX;
                n1.y -= pushY;
              }
              if (n2.fx === undefined || n2.fx === null) {
                n2.x += pushX;
                n2.y += pushY;
              }
            }
          }
        }

        setNodes([...nodes]);
      } else {
        let updated = false;
        nodes.forEach(node => {
          if (node.fx !== undefined && node.fx !== null && (node.x !== node.fx || node.y !== node.fy)) {
            node.x = node.fx;
            node.y = node.fy!;
            updated = true;
          }
        });
        if (updated) setNodes([...nodes]);
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes.length, relationships, layoutStyle]);

  // Drag canvas & zoom handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedNodeId) return;
    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    } else if (draggedNodeId) {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const svgX = (clientX - pan.x) / zoom;
      const svgY = (clientY - pan.y) / zoom;

      setNodes(prev => prev.map(node => {
        if (node.id === draggedNodeId) {
          return { ...node, fx: svgX, fy: svgY, x: svgX, y: svgY };
        }
        return node;
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    if (draggedNodeId) {
      setNodes(prev => prev.map(node => {
        if (node.id === draggedNodeId) {
          if (layoutStyle === 'force') {
            return { ...node, fx: (node.label === 'Paper' && nodes.filter(x => x.label === 'Paper').length === 1) ? 400 : null, fy: (node.label === 'Paper' && nodes.filter(x => x.label === 'Paper').length === 1) ? 300 : null };
          } else {
            const staticNode = computeStaticPositions([node], relationships, layoutStyle)[0];
            return { ...node, fx: staticNode.fx, fy: staticNode.fy };
          }
        }
        return node;
      }));
      setDraggedNodeId(null);
    }
  };

  const handleNodeDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(id);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(2.5, Math.max(0.3, prev * zoomFactor)));
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(2.5, Math.max(0.3, prev * factor)));
  };

  const handleResetView = () => {
    fitGraphToViewport(nodes);
  };

  // Helper check for connection highlighting
  const isDirectlyConnected = (nodeId1: string, nodeId2: string): boolean => {
    return relationships.some(r =>
      (r.source === nodeId1 && r.target === nodeId2) ||
      (r.source === nodeId2 && r.target === nodeId1)
    );
  };

  // Search filtering checks
  const isNodeHighlighted = (node: PhysicsNode): boolean => {
    if (!searchQuery.trim()) return true;
    return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           node.type.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const hasSearchActive = searchQuery.trim().length > 0;
  const matchedNodesCount = hasSearchActive
    ? nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;
  const noMatchFound = hasSearchActive && matchedNodesCount === 0;

  // Distinct relationship types from raw data
  const availableRelTypes = Array.from(new Set(rawRelationships.map(r => r.type)));

  // Neo4j offline state render
  if (isOffline) {
    return (
      <div className="dashboard-card details-failed-card" style={{ padding: '32px', textAlign: 'center', background: 'rgba(255, 127, 127, 0.02)', border: '1px solid rgba(255, 127, 127, 0.15)' }}>
        <AlertTriangle size={48} style={{ color: '#ff7f7f', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Neo4j Database Offline</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          {errorMsg}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={loadGraph}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading || building) {
    return (
      <div className="placeholder-container" style={{ minHeight: '350px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          {building ? 'Constructing Neo4j Knowledge Graph...' : 'Retrieving Literature Graph...'}
        </p>
      </div>
    );
  }

  // Categories object for the legend component
  const LEGEND_CATEGORIES: Record<string, string> = {
    'Paper': NODE_COLORS['Paper'],
    'Method': NODE_COLORS['METHOD'],
    'Dataset': NODE_COLORS['DATASET'],
    'Concept': NODE_COLORS['CONCEPT'],
    'Claim': NODE_COLORS['CLAIM'],
    'Limitation': NODE_COLORS['LIMITATION'],
    'Future Work': NODE_COLORS['FUTUREWORK'],
  };

  return (
    <div
      ref={containerRef}
      className="dashboard-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        height,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}
    >
      {/* Main Content Area containing toolbar + canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

        {/* Top Toolbar: Search, Filters, Layout Switch, and View Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10
        }}>
          {/* Left: Search Input & Node Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: isMobile ? '100%' : '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search graph nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12px', width: '100%' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Node Type Filter */}
            <select
              className="filter-select"
              value={nodeTypeFilter}
              onChange={e => setNodeTypeFilter(e.target.value)}
              style={{ height: '34px', fontSize: '12px', minWidth: '130px' }}
              title="Filter by Node Type"
            >
              <option value="ALL">All Node Types</option>
              <option value="PAPERS">Papers</option>
              <option value="CONCEPTS">Concepts</option>
              <option value="METHODS">Methods</option>
              <option value="DATASETS">Datasets</option>
              <option value="CLAIMS">Claims</option>
              <option value="LIMITATIONS">Limitations</option>
              <option value="FUTUREWORK">Future Work</option>
            </select>

            {/* Relationship Filter */}
            {availableRelTypes.length > 0 && (
              <select
                className="filter-select"
                value={relTypeFilter}
                onChange={e => setRelTypeFilter(e.target.value)}
                style={{ height: '34px', fontSize: '12px', minWidth: '130px' }}
                title="Filter by Relationship Type"
              >
                <option value="ALL">All Relationships</option>
                {availableRelTypes.map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            )}

            {/* Node and Link metrics pill */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px' }}>
              <strong>{nodes.length}</strong> nodes • <strong>{relationships.length}</strong> links
            </span>
          </div>

          {/* Right: Layout Mode Toggles & Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Layout Mode Toggles */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setLayoutStyle('force')}
                style={{
                  background: layoutStyle === 'force' ? 'var(--border-color)' : 'transparent',
                  border: 'none',
                  color: layoutStyle === 'force' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Force-directed simulation layout"
              >
                <Compass size={12} />
                Force
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('radial')}
                style={{
                  background: layoutStyle === 'radial' ? 'var(--border-color)' : 'transparent',
                  border: 'none',
                  color: layoutStyle === 'radial' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Radial concentric circles layout"
              >
                <GitMerge size={12} />
                Radial
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('hierarchical')}
                style={{
                  background: layoutStyle === 'hierarchical' ? 'var(--border-color)' : 'transparent',
                  border: 'none',
                  color: layoutStyle === 'hierarchical' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Hierarchical tree layout"
              >
                <Info size={12} />
                Tree
              </button>
            </div>

            {/* Zoom and Reset Controls */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => handleZoom(1.2)} style={{ padding: '6px 8px', height: '32px' }} title="Zoom In">
                <ZoomIn size={14} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleZoom(0.8)} style={{ padding: '6px 8px', height: '32px' }} title="Zoom Out">
                <ZoomOut size={14} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleResetView} style={{ padding: '6px 8px', height: '32px' }} title="Fit View">
                <Maximize2 size={14} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={loadGraph} style={{ padding: '6px 8px', height: '32px' }} title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Warning banner when search yields no matches */}
        {noMatchFound && (
          <div style={{
            position: 'absolute',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#fca5a5',
            fontSize: '12px',
            fontWeight: 500,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <AlertTriangle size={14} />
            <span>No matching entity found for "{searchQuery}"</span>
          </div>
        )}

        {/* SVG Graph Canvas */}
        <svg
          ref={svgRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ flex: 1, cursor: isDraggingCanvas ? 'grabbing' : 'grab', background: '#09090b', width: '100%', height: '100%' }}
        >
          {/* Arrow markers for directed relationship lines */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f3f46" />
            </marker>
            <marker id="arrow-highlighted" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-light, #a78bfa)" />
            </marker>
          </defs>

          {/* Zoom/Pan viewport group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

            {/* Relationships layer */}
            {relationships.map((rel, idx) => {
              const sourceNode = nodes.find(n => n.id === rel.source);
              const targetNode = nodes.find(n => n.id === rel.target);
              if (!sourceNode || !targetNode) return null;

              const isSourceSelected = selectedNode?.id === sourceNode.id;
              const isTargetSelected = selectedNode?.id === targetNode.id;
              const isSelected = isSourceSelected || isTargetSelected;
              const isHovered = hoveredRelationship === rel || hoveredNode?.id === sourceNode.id || hoveredNode?.id === targetNode.id;

              let opacity = 0.45;
              if (selectedNode) {
                opacity = isSelected ? 1.0 : 0.05;
              } else if (hasSearchActive) {
                const srcMatch = isNodeHighlighted(sourceNode);
                const trgMatch = isNodeHighlighted(targetNode);
                opacity = srcMatch && trgMatch ? 0.6 : 0.05;
              }

              const strokeColor = isSelected || isHovered ? 'var(--accent-light, #a78bfa)' : '#27272a';
              const strokeWidth = isSelected || isHovered ? 2.2 : 1.2;
              const showTextLabel = isHovered || isSelected;

              return (
                <g key={idx} style={{ opacity, transition: 'opacity 0.2s' }}>
                  {/* Invisible thicker path for mouse interaction */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="transparent"
                    strokeWidth={12}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredRelationship(rel)}
                    onMouseLeave={() => setHoveredRelationship(null)}
                  />
                  {/* Visual line */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    markerEnd={isSelected || isHovered ? "url(#arrow-highlighted)" : "url(#arrow)"}
                  />
                  {/* Type Label */}
                  {showTextLabel && (
                    <g transform={`translate(${(sourceNode.x + targetNode.x) / 2}, ${(sourceNode.y + targetNode.y) / 2})`}>
                      <rect
                        x={-42}
                        y={-9}
                        width={84}
                        height={14}
                        rx={3}
                        fill="rgba(15, 15, 20, 0.9)"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth={0.5}
                      />
                      <text
                        y={1}
                        fill="var(--text-primary)"
                        fontSize="9px"
                        fontWeight="600"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {rel.type}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes layer */}
            {nodes.map(node => {
              const color = getNodeColor(node.label, node.type);
              const radius = getNodeRadius(node.label, node.type);
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNode?.id === node.id;

              let opacity = 1.0;
              if (selectedNode) {
                const connected = isSelected || isDirectlyConnected(node.id, selectedNode.id);
                opacity = connected ? 1.0 : 0.15;
              } else if (hasSearchActive) {
                opacity = isNodeHighlighted(node) ? 1.0 : 0.15;
              }

              const isPaperNode = node.label === 'Paper';
              const showLabel = isPaperNode || isSelected || isHovered || (selectedNode && isDirectlyConnected(node.id, selectedNode.id));

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedNode(node === selectedNode ? null : node);
                  }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={e => handleNodeDragStart(node.id, e)}
                  style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle r={radius + 6} fill="none" stroke="var(--accent-light, #a78bfa)" strokeWidth={2} />
                  )}

                  {/* Hover Outer Ring */}
                  {isHovered && !isSelected && (
                    <circle r={radius + 4} fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth={1.5} />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={radius}
                    fill={color}
                    stroke="#09090b"
                    strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                  />

                  {/* Paper node icon indicator */}
                  {isPaperNode && (
                    <circle r={4} fill="#ffffff" style={{ opacity: 0.8 }} />
                  )}

                  {/* Node label */}
                  {showLabel && (
                    <g transform="translate(0, 0)">
                      <rect
                        y={radius + 4}
                        x={-Math.min(70, node.name.length * 3.5)}
                        width={Math.min(140, node.name.length * 7)}
                        height={12}
                        rx={2}
                        fill="rgba(9, 9, 11, 0.85)"
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        y={radius + 13}
                        fill={isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'}
                        fontSize="9px"
                        fontWeight={isSelected ? '700' : '500'}
                        textAnchor="middle"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {node.name.length > 22 ? `${node.name.substring(0, 20)}...` : node.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend Overlay (Glassmorphic) */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxWidth: '240px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px', fontSize: '10px' }}>Graph Legend</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
            {Object.entries(LEGEND_CATEGORIES).map(([name, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Hover Tooltip */}
        {(hoveredNode || hoveredRelationship) && (
          <div style={{
            position: 'absolute',
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y + 16}px`,
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            zIndex: 100,
            pointerEvents: 'none',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxWidth: '280px',
            backdropFilter: 'blur(6px)'
          }}>
            {hoveredNode ? (
              <>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px', wordBreak: 'break-word' }}>
                  {hoveredNode.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', background: getNodeColor(hoveredNode.label, hoveredNode.type) + '20', color: getNodeColor(hoveredNode.label, hoveredNode.type), padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: `1px solid ${getNodeColor(hoveredNode.label, hoveredNode.type)}30`, textTransform: 'uppercase' }}>
                    {hoveredNode.type}
                  </span>
                  {hoveredNode.confidence !== undefined && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Confidence: {(hoveredNode.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Relation: {hoveredRelationship!.type}
                </div>
                {hoveredRelationship!.confidence !== undefined && (
                  <div style={{ fontSize: '10px', marginTop: '4px' }}>
                    Confidence Score: {(hoveredRelationship!.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected Node Details Side Panel (Desktop) or Drawer (Mobile) */}
      {selectedNode && (
        <div style={isMobile ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: 'var(--bg-sidebar)',
          borderTop: '1px solid var(--border-color)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        } : {
          width: '320px',
          borderLeft: '1px solid var(--border-color)',
          background: 'var(--bg-sidebar)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
          height: '100%'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '9px',
                background: getNodeColor(selectedNode.label, selectedNode.type) + '20',
                color: getNodeColor(selectedNode.label, selectedNode.type),
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${getNodeColor(selectedNode.label, selectedNode.type)}40`,
                fontWeight: 'bold',
                width: 'fit-content',
                textTransform: 'uppercase'
              }}>
                {selectedNode.type}
              </span>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                {selectedNode.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          {selectedNode.description && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Description</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {selectedNode.description}
              </p>
            </div>
          )}

          {/* Source Paper & Source Chunk */}
          {selectedNode.label !== 'Paper' && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Provenance</h4>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Paper ID: </span>
                  <code style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>{selectedNode.properties?.paper_id || paperId}</code>
                </div>
                {selectedNode.properties?.source_chunk_id && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Source Chunk: </span>
                    <code style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>{selectedNode.properties.source_chunk_id}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confidence */}
          {selectedNode.confidence !== undefined && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Confidence Score</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: 'var(--border-color)', height: '6px', borderRadius: '3px' }}>
                  <div style={{ background: selectedNode.confidence >= 0.8 ? 'var(--success)' : '#f59e0b', width: `${selectedNode.confidence * 100}%`, height: '100%', borderRadius: '3px' }}></div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {(selectedNode.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Connected Relationships */}
          <div>
            <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>Connected Nodes ({relationships.filter(rel => rel.source === selectedNode.id || rel.target === selectedNode.id).length})</h4>
            <div style={{ display: 'grid', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {relationships
                .filter(rel => rel.source === selectedNode.id || rel.target === selectedNode.id)
                .map((rel, i) => {
                  const isSource = rel.source === selectedNode.id;
                  const otherId = isSource ? rel.target : rel.source;
                  const otherNode = nodes.find(n => n.id === otherId);
                  if (!otherNode) return null;

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedNode(otherNode)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={() => setHoveredNode(otherNode)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {isSource ? `→ ${rel.type} →` : `← ${rel.type} ←`}
                      </div>
                      <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {otherNode.name}
                      </strong>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Connected Papers (Cross-paper references via API) */}
          {selectedNode.label === 'ResearchEntity' && (
            <div>
              <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>Cross-Paper References</h4>
              {loadingConnectedPapers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Loading connections...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {connectedPapers.map((paper, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '6px 8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{paper.title}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        Year: {paper.year || 'N/A'} • Rel: {paper.relationshipType || 'MENTIONS'}
                      </span>
                    </div>
                  ))}
                  {connectedPapers.length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No other papers reference this entity.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaperGraphView;
