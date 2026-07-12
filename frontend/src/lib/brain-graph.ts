import type { LearnedPrincipleCategoryCount, LearnedPrincipleRecord, TasteProfile } from '../types';
import { formatBrainLabel, PRINCIPLE_MAX_WEIGHT } from './brain-labels';

export const GRAPH_ORBIT_LIMIT = 14;
export const GRAPH_SIZE = 400;
export const GRAPH_CENTER = GRAPH_SIZE / 2;
export const GRAPH_ORBIT_RADIUS = GRAPH_SIZE * 0.33;
export const GRAPH_LABEL_RING = GRAPH_ORBIT_RADIUS + 46;

export type CategoryFeedbackTone = 'positive' | 'negative' | 'neutral';

export interface GraphCategoryNode {
  id: string;
  label: string;
  count: number;
  maxWeight: number;
  x: number;
  y: number;
  radius: number;
  angle: number;
  tone: CategoryFeedbackTone;
}

export interface GraphLabelPosition {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
  dy: number;
}

export const TONE_STROKE: Record<CategoryFeedbackTone, string> = {
  positive: '#34d399',
  negative: '#f87171',
  neutral: '#71717a',
};

export function getCategoryFeedbackTone(
  category: string,
  taste?: TasteProfile,
): CategoryFeedbackTone {
  if (!taste || taste.signalCount === 0) return 'neutral';

  const key = category.toLowerCase();

  if (key === 'typography' || key === 'mark_type') {
    if (taste.preferredMarkTypes.length > 0) return 'positive';
  }
  if (key === 'geometry' || key === 'construction' || key === 'composition') {
    if (taste.preferredGeometry.length > 0) return 'positive';
  }
  if (key === 'quality') {
    if (taste.averageScore >= 7) return 'positive';
    if (taste.averageScore < 5) return 'negative';
  }
  if (taste.avoidedPatterns.length >= 4 && (key === 'process' || key === 'quality')) {
    return 'negative';
  }

  if (taste.averageScore >= 6.5) return 'positive';
  if (taste.averageScore < 4.5) return 'negative';
  return 'neutral';
}

export function sortCategoriesByCount(
  categories: LearnedPrincipleCategoryCount[],
): LearnedPrincipleCategoryCount[] {
  return [...categories].sort((a, b) => b.count - a.count);
}

function maxWeightByCategory(principles: LearnedPrincipleRecord[] | undefined): Record<string, number> {
  if (!principles?.length) return {};
  return principles.reduce<Record<string, number>>((acc, principle) => {
    acc[principle.category] = Math.max(acc[principle.category] ?? 0, principle.weight);
    return acc;
  }, {});
}

export function buildOrbitNodes(
  categories: LearnedPrincipleCategoryCount[],
  principles: LearnedPrincipleRecord[] | undefined,
  taste: TasteProfile | undefined,
  limit = GRAPH_ORBIT_LIMIT,
  size = GRAPH_SIZE,
): GraphCategoryNode[] {
  const sorted = sortCategoriesByCount(categories).slice(0, limit);
  if (!sorted.length) return [];

  const center = size / 2;
  const orbit = GRAPH_ORBIT_RADIUS;
  const maxCount = sorted[0]?.count ?? 1;
  const weights = maxWeightByCategory(principles);

  return sorted.map((item, index) => {
    const angle = (Math.PI * 2 * index) / sorted.length - Math.PI / 2;
    const maxWeight = weights[item.category] ?? 1;
    const countFactor = item.count / maxCount;
    const weightFactor = maxWeight / PRINCIPLE_MAX_WEIGHT;
    const radius = 8 + countFactor * 6 + weightFactor * 2;

    return {
      id: item.category,
      label: formatBrainLabel(item.category),
      count: item.count,
      maxWeight,
      x: center + Math.cos(angle) * orbit,
      y: center + Math.sin(angle) * orbit,
      radius,
      angle,
      tone: getCategoryFeedbackTone(item.category, taste),
    };
  });
}

/** Fixed outer label ring — labels always sit outside nodes, away from center. */
export function labelPosition(node: GraphCategoryNode, size = GRAPH_SIZE): GraphLabelPosition {
  const center = size / 2;
  const nx = Math.cos(node.angle);
  const ny = Math.sin(node.angle);
  const x = center + nx * GRAPH_LABEL_RING;
  const y = center + ny * GRAPH_LABEL_RING;

  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  let dy = 4;

  if (ny < -0.55) {
    textAnchor = 'middle';
    dy = -6;
  } else if (ny > 0.55) {
    textAnchor = 'middle';
    dy = 12;
  } else if (nx > 0.2) {
    textAnchor = 'start';
    dy = 4;
  } else {
    textAnchor = 'end';
    dy = 4;
  }

  return { x, y, textAnchor, dy };
}

export function impulsePath(node: GraphCategoryNode, size = GRAPH_SIZE): string {
  const center = size / 2;
  return `M ${node.x} ${node.y} L ${center} ${center}`;
}

const LABEL_CHAR_WIDTH = 5.2;

export function computeGraphViewBox(nodes: GraphCategoryNode[], size = GRAPH_SIZE): string {
  if (!nodes.length) {
    const pad = 12;
    return `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`;
  }

  const center = size / 2;
  let minX = center;
  let maxX = center;
  let minY = center;
  let maxY = center;

  for (const node of nodes) {
    const label = labelPosition(node, size);
    const labelWidth = node.label.length * LABEL_CHAR_WIDTH;

    minX = Math.min(minX, node.x - node.radius - 12);
    maxX = Math.max(maxX, node.x + node.radius + 12);
    minY = Math.min(minY, node.y - node.radius - 12);
    maxY = Math.max(maxY, node.y + node.radius + 12);

    const ly = label.y + label.dy;
    if (label.textAnchor === 'start') {
      maxX = Math.max(maxX, label.x + labelWidth);
      minX = Math.min(minX, label.x - 4);
    } else if (label.textAnchor === 'end') {
      minX = Math.min(minX, label.x - labelWidth);
      maxX = Math.max(maxX, label.x + 4);
    } else {
      minX = Math.min(minX, label.x - labelWidth / 2);
      maxX = Math.max(maxX, label.x + labelWidth / 2);
    }
    minY = Math.min(minY, ly - 10);
    maxY = Math.max(maxY, ly + 10);
  }

  const padX = 10;
  const padY = 6;
  const x = minX - padX;
  const y = minY - padY;
  const width = maxX - minX + padX * 2;
  const height = maxY - minY + padY * 2;

  return `${x} ${y} ${width} ${height}`;
}

export function graphCenterPosition(
  nodes: GraphCategoryNode[],
  size = GRAPH_SIZE,
): { left: string; top: string } {
  const [x, y, w, h] = computeGraphViewBox(nodes, size).split(' ').map(Number);
  const center = size / 2;
  return {
    left: `${((center - x) / w) * 100}%`,
    top: `${((center - y) / h) * 100}%`,
  };
}

export function graphViewBox(nodes?: GraphCategoryNode[]): string {
  if (nodes) return computeGraphViewBox(nodes);
  const pad = 12;
  return `${-pad} ${-pad} ${GRAPH_SIZE + pad * 2} ${GRAPH_SIZE + pad * 2}`;
}
