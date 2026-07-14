import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useT, type MessageKey } from '../i18n';
import { en } from '../i18n/en';
import { useThemeStore } from '../theme/theme-store';

/** Grouped industries — values are sent to the API (English). */
export const INDUSTRY_GROUPS: Array<{ groupKey: MessageKey; options: string[] }> = [
  {
    groupKey: 'industries.group.tech',
    options: [
      'AI Company',
      'SaaS / Software',
      'Cybersecurity',
      'Developer Tools',
      'Fintech',
      'Telecommunications',
    ],
  },
  {
    groupKey: 'industries.group.finance',
    options: ['Banking', 'Investment & Asset Management', 'Insurance', 'Legal', 'Consulting'],
  },
  {
    groupKey: 'industries.group.health',
    options: [
      'Hospital & Clinic',
      'Pharma & Biotech',
      'Dental',
      'Wellness & Fitness',
      'Beauty & Cosmetics',
    ],
  },
  {
    groupKey: 'industries.group.food',
    options: [
      'Restaurant',
      'Coffee Shop',
      'Bakery & Cafe',
      'Bar & Brewery',
      'Food & Beverage',
    ],
  },
  {
    groupKey: 'industries.group.hospitality',
    options: ['Hotel & Hospitality', 'Travel & Tourism'],
  },
  {
    groupKey: 'industries.group.retail',
    options: ['Fashion & Apparel', 'Luxury', 'Retail Store', 'E-commerce'],
  },
  {
    groupKey: 'industries.group.built',
    options: ['Architecture', 'Interior Design', 'Construction', 'Real Estate'],
  },
  {
    groupKey: 'industries.group.mobility',
    options: ['Automotive', 'Aviation & Airlines', 'Logistics & Delivery'],
  },
  {
    groupKey: 'industries.group.media',
    options: ['Media & Publishing', 'Music & Entertainment', 'Gaming', 'Sports'],
  },
  {
    groupKey: 'industries.group.education',
    options: ['Education & EdTech', 'Startup'],
  },
  {
    groupKey: 'industries.group.public',
    options: ['Government', 'Nonprofit', 'Energy & Utilities'],
  },
];

/** Flat list for validation and lookups */
export const INDUSTRY_OPTIONS = INDUSTRY_GROUPS.flatMap((group) => group.options);

function industryLabelKey(opt: string): MessageKey | null {
  const key = `industries.${opt}` as MessageKey;
  return key in en ? key : null;
}

function findGroupKeyForOption(opt: string): MessageKey | null {
  return INDUSTRY_GROUPS.find((group) => group.options.includes(opt))?.groupKey ?? null;
}

function IndustryGroupAccordion({
  label,
  options,
  expanded,
  onToggle,
  isLight,
  open,
  value,
  onSelect,
  displayLabel,
}: {
  label: string;
  options: string[];
  expanded: boolean;
  onToggle: () => void;
  isLight: boolean;
  open: boolean;
  value: string;
  onSelect: (opt: string) => void;
  displayLabel: (opt: string) => string;
}) {
  const hasSelected = options.some((opt) => opt === value);

  return (
    <div
      role="group"
      aria-label={label}
      className={clsx('border-b last:border-b-0', isLight ? 'border-zinc-200' : 'border-zinc-800/60')}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        tabIndex={open ? 0 : -1}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors',
          isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900',
          hasSelected && (isLight ? 'bg-zinc-50' : 'bg-zinc-900/50'),
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronDown
            size={14}
            aria-hidden
            className={clsx(
              'shrink-0 text-zinc-500 transition-transform duration-200',
              !expanded && '-rotate-90',
            )}
          />
          <span
            className={clsx(
              'text-xs font-semibold uppercase tracking-wide truncate',
              isLight ? 'text-zinc-600' : 'text-zinc-400',
            )}
          >
            {label}
          </span>
        </span>
        <span className={clsx('text-[11px] tabular-nums shrink-0', isLight ? 'text-zinc-400' : 'text-zinc-600')}>
          {options.length}
        </span>
      </button>

      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-1">
            {options.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={open && expanded ? 0 : -1}
                  onClick={() => onSelect(opt)}
                  className={clsx(
                    'w-full flex items-center justify-between gap-2 pl-8 pr-4 py-2 text-sm text-left transition-colors',
                    selected &&
                      (isLight
                        ? 'border-l-2 border-zinc-900 bg-zinc-100 text-zinc-900 font-medium pl-[30px]'
                        : 'border-l-2 border-zinc-200 bg-zinc-800 text-zinc-100 pl-[30px]'),
                    !selected &&
                      (isLight
                        ? 'text-zinc-800 hover:bg-zinc-50'
                        : 'text-zinc-300 hover:bg-zinc-900'),
                  )}
                >
                  <span className="truncate">{displayLabel(opt)}</span>
                  {selected && (
                    <Check size={14} className={isLight ? 'text-zinc-900' : 'text-zinc-200'} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IndustrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IndustrySelect({ value, onChange, className }: IndustrySelectProps) {
  const t = useT();
  const isLight = useThemeStore((s) => s.theme) === 'light';
  const isKnown = INDUSTRY_OPTIONS.includes(value);
  const [customMode, setCustomMode] = useState(() => value !== '' && !isKnown);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<MessageKey>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = 'industry-select-panel';

  const showCustom = customMode || (value !== '' && !isKnown);

  const displayLabel = (opt: string) => {
    const key = industryLabelKey(opt);
    return key ? t(key) : opt;
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDUSTRY_GROUPS;

    return INDUSTRY_GROUPS.map((group) => ({
      ...group,
      options: group.options.filter((opt) => {
        const label = displayLabel(opt).toLowerCase();
        return label.includes(q) || opt.toLowerCase().includes(q);
      }),
    })).filter((group) => group.options.length > 0);
  }, [query, t]);

  const selectedGroupKey = useMemo(() => findGroupKeyForOption(value), [value]);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setExpandedGroups(new Set());
      return;
    }

    if (isSearching) {
      setExpandedGroups(new Set(filteredGroups.map((group) => group.groupKey)));
      return;
    }

    if (selectedGroupKey) {
      setExpandedGroups(new Set([selectedGroupKey]));
      return;
    }

    setExpandedGroups(new Set());
  }, [open, isSearching, filteredGroups, selectedGroupKey]);

  const toggleGroup = (groupKey: MessageKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const selectOption = (opt: string) => {
    setCustomMode(false);
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  const startCustom = () => {
    setCustomMode(true);
    onChange('');
    setOpen(false);
    setQuery('');
  };

  const triggerLabel = value ? displayLabel(value) : t('industries.selectPlaceholder');

  const triggerClass = clsx(
    'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
    isLight
      ? 'bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-300 hover:border-zinc-300'
      : 'bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-600 hover:border-zinc-700',
    !value && 'text-zinc-500',
    open &&
      (isLight
        ? 'border-zinc-400 ring-1 ring-zinc-200'
        : 'border-zinc-600 ring-1 ring-zinc-700/50'),
  );

  const panelClass = clsx(
    'absolute left-0 right-0 top-0 z-50 rounded-xl border shadow-xl overflow-hidden',
    isLight
      ? 'bg-white border-zinc-200 shadow-zinc-900/15'
      : 'bg-zinc-950 border-zinc-800 shadow-black/50',
  );

  const searchRowClass = clsx(
    'flex items-center gap-2 px-3 py-2.5 border-b',
    isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/80',
  );

  return (
    <div ref={rootRef} className={clsx('relative', open && 'z-50', className)}>
      {showCustom ? (
        <div className="space-y-2">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('industries.customPlaceholder')}
            className={clsx(
              'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none',
              isLight
                ? 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600',
            )}
          />
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              setOpen(true);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t('industries.chooseFromList')}
          </button>
        </div>
      ) : open ? (
        <>
          <div aria-hidden className={clsx(triggerClass, 'invisible pointer-events-none')}>
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown size={16} aria-hidden className="shrink-0" />
          </div>

          <div id={panelId} role="listbox" className={panelClass}>
          <div className={searchRowClass}>
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('industries.searchPlaceholder')}
              className={clsx(
                'w-full bg-transparent text-sm focus:outline-none',
                isLight
                  ? 'text-zinc-900 placeholder:text-zinc-400'
                  : 'text-zinc-200 placeholder:text-zinc-600',
              )}
            />
          </div>

          <div
            className={clsx(
              'max-h-64 overflow-y-auto overscroll-contain',
              isLight ? 'divide-y divide-zinc-200' : 'divide-y divide-zinc-800/60',
            )}
          >
            {filteredGroups.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                {t('industries.searchEmpty')}
              </p>
            ) : (
              filteredGroups.map((group) => (
                <IndustryGroupAccordion
                  key={group.groupKey}
                  label={t(group.groupKey)}
                  options={group.options}
                  expanded={isSearching || expandedGroups.has(group.groupKey)}
                  onToggle={() => toggleGroup(group.groupKey)}
                  isLight={isLight}
                  open={open}
                  value={value}
                  onSelect={selectOption}
                  displayLabel={displayLabel}
                />
              ))
            )}

            <div className={clsx('border-t', isLight ? 'border-zinc-200' : 'border-zinc-800')}>
              <button
                type="button"
                onClick={startCustom}
                className={clsx(
                  'w-full px-4 py-2.5 text-sm text-left transition-colors',
                  isLight
                    ? 'text-zinc-600 hover:bg-zinc-50'
                    : 'text-zinc-400 hover:bg-zinc-900',
                )}
              >
                {t('industries.another')}
              </button>
            </div>
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          className={triggerClass}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown size={16} aria-hidden className="shrink-0 text-zinc-500" />
        </button>
      )}
    </div>
  );
}
