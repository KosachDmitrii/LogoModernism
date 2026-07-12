import { useState } from 'react';
import { useT, type MessageKey } from '../i18n';
import { en } from '../i18n/en';

/** Curated industries backed by knowledge-base industry principles */
export const INDUSTRY_OPTIONS = [
  'AI Company',
  'Technology',
  'Startup',
  'Finance',
  'Insurance',
  'Legal',
  'Consulting',
  'Medical',
  'Wellness',
  'Beauty',
  'Education',
  'Government',
  'Nonprofit',
  'Energy',
  'Construction',
  'Architecture',
  'Real Estate',
  'Automotive',
  'Aviation',
  'Logistics',
  'Telecommunications',
  'Media',
  'Music',
  'Gaming',
  'Sports',
  'Fashion',
  'Luxury',
  'Retail',
  'E-commerce',
  'Food & Beverage',
  'Coffee Shop',
  'Hospitality',
];

const ANOTHER = '__another__';

function industryLabelKey(opt: string): MessageKey | null {
  const key = `industries.${opt}` as MessageKey;
  return key in en ? key : null;
}

interface IndustrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IndustrySelect({ value, onChange, className }: IndustrySelectProps) {
  const t = useT();
  const isKnown = INDUSTRY_OPTIONS.includes(value);
  const [customMode, setCustomMode] = useState(() => value !== '' && !isKnown);
  const showCustom = customMode || (value !== '' && !isKnown);

  const displayLabel = (opt: string) => {
    const key = industryLabelKey(opt);
    return key ? t(key) : opt;
  };

  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <select
        value={showCustom ? ANOTHER : value}
        onChange={(e) => {
          if (e.target.value === ANOTHER) {
            setCustomMode(true);
            onChange('');
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
      >
        <option value="" disabled>
          {t('industries.selectPlaceholder')}
        </option>
        {INDUSTRY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {displayLabel(opt)}
          </option>
        ))}
        <option value={ANOTHER}>{t('industries.another')}</option>
      </select>
      {showCustom && (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('industries.customPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
        />
      )}
    </div>
  );
}
