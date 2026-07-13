import { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import type {
  BrainConsolidateResult,
  LearnedPrincipleCategoryCount,
  LearnedPrincipleRecord,
  TasteProfile,
} from '../../types';
import { useT } from '../../i18n';
import {
  buildOrbitNodes,
  GRAPH_CENTER,
  GRAPH_ORBIT_RADIUS,
  graphViewBox,
  graphCenterPosition,
  impulsePath,
  labelPosition,
  TONE_STROKE,
} from '../../lib/brain-graph';

const IMPULSE_DURATION_S = 5.5;

interface BrainKnowledgeGraphProps {
  categories: LearnedPrincipleCategoryCount[];
  principles?: LearnedPrincipleRecord[];
  taste?: TasteProfile;
  totalPrinciples: number;
  isIngesting?: boolean;
  isConsolidating?: boolean;
  consolidateResult?: BrainConsolidateResult | null;
  onCategorySelect?: (category: string) => void;
  onConsolidate?: () => void;
}

export function BrainKnowledgeGraph({
  categories,
  principles,
  taste,
  totalPrinciples,
  isIngesting = false,
  isConsolidating = false,
  consolidateResult = null,
  onCategorySelect,
  onConsolidate,
}: BrainKnowledgeGraphProps) {
  const t = useT();
  const prevCountsRef = useRef<Record<string, number>>({});
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mergeActive, setMergeActive] = useState(false);

  const orbitNodes = useMemo(
    () => buildOrbitNodes(categories, principles, taste),
    [categories, principles, taste],
  );
  const brainCenter = useMemo(() => graphCenterPosition(orbitNodes), [orbitNodes]);

  useEffect(() => {
    const newlyActive = new Set<string>();
    for (const item of categories) {
      const prev = prevCountsRef.current[item.category] ?? 0;
      if (item.count > prev) newlyActive.add(item.category);
      prevCountsRef.current[item.category] = item.count;
    }
    if (!newlyActive.size) return;

    setPulsingIds(newlyActive);
    const timer = window.setTimeout(() => setPulsingIds(new Set()), 2000);
    return () => window.clearTimeout(timer);
  }, [categories]);

  useEffect(() => {
    if (!consolidateResult) return;
    const changed =
      consolidateResult.mergedPrinciples +
      consolidateResult.prunedPrinciples +
      consolidateResult.deduplicatedExperiences;
    if (changed === 0) return;

    setMergeActive(true);
    const timer = window.setTimeout(() => setMergeActive(false), 2000);
    return () => window.clearTimeout(timer);
  }, [consolidateResult]);

  const active = isIngesting || isConsolidating;

  const selectCategory = (category: string) => {
    onCategorySelect?.(category);
  };

  const setHover = (id: string | null) => {
    setHoveredId(id);
  };

  return (
    <section className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 overflow-visible">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-sm font-medium text-zinc-200">{t('brain.graph.title')}</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">{t('brain.graph.hint')}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('brain.graph.nodes')}</p>
          <p className="text-xl font-semibold text-zinc-100 tabular-nums">{totalPrinciples}</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-lg overflow-visible -my-1">
        <svg
          viewBox={graphViewBox(orbitNodes)}
          className="block w-full h-auto overflow-visible"
          role="img"
          aria-label={t('brain.graph.aria')}
        >
          <defs>
            <radialGradient id="brain-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle
            cx={GRAPH_CENTER}
            cy={GRAPH_CENTER}
            r={GRAPH_ORBIT_RADIUS + 8}
            fill="url(#brain-core-glow)"
            className="pointer-events-none"
          />

          <circle
            cx={GRAPH_CENTER}
            cy={GRAPH_CENTER}
            r={GRAPH_ORBIT_RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-zinc-800"
            strokeWidth="1"
          />

          {orbitNodes.map((node, index) => {
            const isHovered = hoveredId === node.id;
            const isLinked = isHovered || hoveredId === null;

            return (
              <g key={`link-${node.id}`}>
                <line
                  x1={GRAPH_CENTER}
                  y1={GRAPH_CENTER}
                  x2={node.x}
                  y2={node.y}
                  className={`text-zinc-700 ${mergeActive ? 'brain-graph-line-merge' : ''}`}
                  stroke="currentColor"
                  strokeOpacity={isHovered ? 0.75 : isLinked ? 0.3 : 0.15}
                  strokeWidth={isHovered ? 1.75 : 1}
                />
                <circle
                  r={isHovered ? 3.5 : 2.5}
                  fill={isHovered ? '#c4b5fd' : '#a78bfa'}
                  opacity={isHovered ? 0.95 : 0.55}
                  className="brain-graph-impulse"
                >
                  <animateMotion
                    dur={`${IMPULSE_DURATION_S}s`}
                    repeatCount="indefinite"
                    begin={`${index * 0.45}s`}
                    path={impulsePath(node)}
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0.85;0"
                    keyTimes="0;0.08;0.88;1"
                    dur={`${IMPULSE_DURATION_S}s`}
                    repeatCount="indefinite"
                    begin={`${index * 0.45}s`}
                  />
                </circle>
              </g>
            );
          })}

          {orbitNodes.map((node) => {
            const isHovered = hoveredId === node.id;
            const isPulsing = pulsingIds.has(node.id);
            const label = labelPosition(node);
            const toneStroke = TONE_STROKE[node.tone];

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-opacity"
                style={{ opacity: hoveredId && !isHovered ? 0.45 : 1 }}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => selectCategory(node.id)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 16}
                  fill="transparent"
                  pointerEvents="all"
                />
                {isPulsing && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 10}
                    fill="none"
                    stroke="#a78bfa"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    className="brain-graph-pulse-ring"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill="#09090b"
                  stroke={isHovered ? '#a78bfa' : toneStroke}
                  strokeWidth={isHovered ? 2.5 : 1.75}
                  strokeOpacity={isHovered ? 1 : 0.85}
                  className={`transition-all ${mergeActive ? 'brain-graph-node-merge' : isPulsing ? 'brain-graph-node-new' : ''}`}
                />
                <text
                  x={node.x}
                  y={node.y + 3}
                  textAnchor="middle"
                  className="fill-zinc-200 text-[7px] font-semibold pointer-events-none"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {node.count}
                </text>
                <text
                  x={label.x}
                  y={label.y + label.dy}
                  textAnchor={label.textAnchor}
                  className={`text-[9px] font-medium pointer-events-none ${isHovered ? 'fill-violet-300' : 'fill-zinc-400'}`}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {orbitNodes.length === 0 && (
            <text x={GRAPH_CENTER} y={GRAPH_CENTER + 56} textAnchor="middle" className="fill-zinc-600 text-[11px]">
              {t('brain.graph.empty')}
            </text>
          )}
        </svg>

        <div
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 opacity-100 text-violet-300 ${
            active ? 'brain-graph-core-active' : ''
          }`}
          style={{ left: brainCenter.left, top: brainCenter.top }}
          aria-hidden
        >
          <Brain size={72} strokeWidth={1.5} className="opacity-100" />
        </div>

        {active && (
          <p className="pointer-events-none absolute inset-x-0 top-full mt-0.5 text-center text-[11px] text-violet-400/90">
            {isConsolidating ? t('brain.graph.consolidating') : t('brain.graph.learning')}
          </p>
        )}
      </div>

      <p className="text-[11px] text-zinc-600 pt-0">{t('brain.graph.clickHint')}</p>

      {onConsolidate && (
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onConsolidate}
            disabled={isConsolidating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {isConsolidating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {isConsolidating ? t('brain.consolidateRunning') : t('brain.runConsolidate')}
          </button>
          <p className="text-xs text-zinc-600">{t('brain.consolidateHint')}</p>
          {consolidateResult && (
            <p className="text-xs text-zinc-500">
              {t('brain.consolidateResult', {
                merged: consolidateResult.mergedPrinciples,
                pruned: consolidateResult.prunedPrinciples,
                deduped: consolidateResult.deduplicatedExperiences,
              })}
            </p>
          )}
        </div>
      )}

      <style>{`
        .brain-graph-core-active svg {
          animation: brain-graph-core-breathe 2.4s ease-in-out infinite;
        }
        .brain-graph-pulse-ring {
          animation: brain-graph-pulse-ring 2s ease-out 1;
        }
        .brain-graph-node-new {
          animation: brain-graph-node-new 2s ease-out 1;
        }
        .brain-graph-node-merge {
          animation: brain-graph-node-merge 2s ease-in-out 1;
        }
        .brain-graph-line-merge {
          animation: brain-graph-line-merge 2s ease-in-out 1;
        }
        @keyframes brain-graph-core-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes brain-graph-pulse-ring {
          0% { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes brain-graph-node-new {
          0% { transform: scale(0.75); opacity: 0.5; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes brain-graph-node-merge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes brain-graph-line-merge {
          0%, 100% { stroke-opacity: 0.35; }
          50% { stroke-opacity: 0.75; }
        }
      `}</style>
    </section>
  );
}
