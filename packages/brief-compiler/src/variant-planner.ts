import type { VariantAxis } from './types';

export interface VariantPlan {
  axis: VariantAxis;
  index: number;
  creativeDirection: string;
}

const VARIANT_AXES: VariantAxis[] = ['balanced', 'construction_led', 'typography_led'];

export function planVariants(count: number, preferredTerritoryId?: string): VariantPlan[] {
  const normalized = count <= 1 ? 1 : count <= 3 ? 3 : 5;
  const plans: VariantPlan[] = [];

  let order = [...VARIANT_AXES];
  if (preferredTerritoryId === 'territory-construction') {
    order = ['construction_led', 'balanced', 'typography_led'];
  } else if (preferredTerritoryId === 'territory-typography') {
    order = ['typography_led', 'balanced', 'construction_led'];
  }

  for (let i = 0; i < normalized; i++) {
    const axis = order[i % order.length]!;
    plans.push({
      axis,
      index: i,
      creativeDirection: creativeDirectionForAxis(axis),
    });
  }

  return plans;
}

function creativeDirectionForAxis(axis: VariantAxis): string {
  switch (axis) {
    case 'construction_led':
      return 'Construction-led — modular geometric grid as hero system, typography subordinate';
    case 'typography_led':
      return 'Typography-led — custom letterforms as primary anchor, symbol subordinate';
    default:
      return 'Balanced combination lockup — symbol and wordmark share one geometric system with matching stroke weight';
  }
}
