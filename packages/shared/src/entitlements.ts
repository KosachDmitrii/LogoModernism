export const ACCESS_ROLES = ['ADMIN', 'USER'] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

export const PLANS = ['FREE', 'PLUS', 'PRO'] as const;
export type Plan = (typeof PLANS)[number];

export const QUOTA_KEYS = ['prompt.compose', 'image.generate'] as const;
export type QuotaKey = (typeof QUOTA_KEYS)[number];

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
  monthlyQuotas: Record<QuotaKey, number>;
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
    monthlyQuotas: {
      'prompt.compose': 10,
      'image.generate': 2,
    },
    features: new Set(BASE_FEATURES),
  },
  PLUS: {
    monthlyQuotas: {
      'prompt.compose': 100,
      'image.generate': 20,
    },
    features: new Set([...BASE_FEATURES, FEATURES.brainAdvanced, FEATURES.billingManage]),
  },
  PRO: {
    monthlyQuotas: {
      'prompt.compose': 300,
      'image.generate': 60,
    },
    features: new Set([...BASE_FEATURES, FEATURES.brainAdvanced, FEATURES.billingManage]),
  },
};

export function planHasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_ENTITLEMENTS[plan].features.has(feature);
}
