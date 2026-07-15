export const PLATFORM_ROLES = ['USER', 'PLATFORM_ADMIN'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLANS = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = {
  catalogRead: 'catalog.read',
  productUse: 'product.use',
  savedPrompts: 'saved-prompts',
  brainRead: 'brain.read',
  brainAdvanced: 'brain.advanced',
  billingManage: 'billing.manage',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export type PlanEntitlements = {
  monthlyCredits: number | null;
  features: ReadonlySet<FeatureKey>;
};

const BASE_FEATURES = [
  FEATURES.catalogRead,
  FEATURES.productUse,
  FEATURES.savedPrompts,
  FEATURES.brainRead,
] as const;

export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  FREE: {
    monthlyCredits: 100,
    features: new Set(BASE_FEATURES),
  },
  PRO: {
    monthlyCredits: 2_000,
    features: new Set([...BASE_FEATURES, FEATURES.brainAdvanced, FEATURES.billingManage]),
  },
  ENTERPRISE: {
    monthlyCredits: null,
    features: new Set([...BASE_FEATURES, FEATURES.brainAdvanced, FEATURES.billingManage]),
  },
};

export function planHasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_ENTITLEMENTS[plan].features.has(feature);
}
