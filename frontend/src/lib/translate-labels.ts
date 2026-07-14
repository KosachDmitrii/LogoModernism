import { en, type MessageKey } from '../i18n/en';

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

const BRIEF_SOURCE_KEYS: Record<string, MessageKey> = {
  'Brand DNA': 'brief.source.brandDna',
  Geometry: 'brief.source.geometry',
  'Knowledge Graph': 'brief.source.knowledgeGraph',
  Style: 'brief.source.style',
  'Full Pipeline': 'brief.source.fullPipeline',
  'Logo Catalog': 'brief.source.logoCatalog',
  'Design Brief': 'brief.source.designBrief',
  'Client brief': 'brief.source.clientBrief',
  'Brain interview': 'brief.source.brainInterview',
};

const MARK_TYPE_KEYS: Record<string, MessageKey> = {
  wordmark: 'brief.typography.wordmark',
  lettermark: 'brief.typography.lettermark',
  combination: 'brief.typography.combination',
};

const TYPOGRAPHY_STYLE_KEYS: Record<string, MessageKey> = {
  standard: 'brief.typography.standard',
  constructed: 'brief.typography.constructed',
  modified_glyph: 'brief.typography.modifiedGlyph',
  rebus: 'brief.typography.rebus',
  monogram_ligature: 'brief.typography.monogramLigature',
};

function hasKey(key: string): key is MessageKey {
  return key in en;
}

export function industryLabel(industry: string, t: TranslateFn): string {
  const key = `industries.${industry}` as MessageKey;
  return hasKey(key) ? t(key) : industry;
}

export function briefSourceLabel(source: string, t: TranslateFn): string {
  const key = BRIEF_SOURCE_KEYS[source];
  return key ? t(key) : source;
}

export function markTypeLabel(value: string, t: TranslateFn): string {
  const key = MARK_TYPE_KEYS[value];
  return key ? t(key) : value.replace(/_/g, ' ');
}

export function typographyStyleLabel(value: string, t: TranslateFn): string {
  const key = TYPOGRAPHY_STYLE_KEYS[value];
  return key ? t(key) : value.replace(/_/g, ' ');
}

export function imageProviderLabel(
  provider: string,
  model: string | undefined,
  t: TranslateFn,
): string {
  if (provider === 'openai') return model ?? t('common.providerOpenai');
  if (provider === 'mock') return t('common.providerMock');
  return provider;
}

export { BRIEF_SOURCE_KEYS };
