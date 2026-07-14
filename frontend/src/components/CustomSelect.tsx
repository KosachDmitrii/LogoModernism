import { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useT } from '../i18n';
import { useThemeStore } from '../theme/theme-store';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  searchable?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  searchable,
  size = 'md',
  className,
  disabled = false,
}: CustomSelectProps) {
  const t = useT();
  const isLight = useThemeStore((s) => s.theme) === 'light';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const showSearch = searchable ?? options.length > 6;

  const selectedOption = options.find((option) => option.value === value);
  const triggerLabel = selectedOption?.label ?? placeholder ?? t('common.select.placeholder');

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!showSearch || !q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q),
    );
  }, [options, query, showSearch]);

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
    if (open && showSearch) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
  }, [open, showSearch]);

  const selectOption = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const sizeClass =
    size === 'sm'
      ? 'px-3 py-2 text-xs rounded-lg'
      : 'px-4 py-2.5 text-sm rounded-xl';

  const triggerClass = clsx(
    'w-full flex items-center justify-between gap-3 border text-left transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
    sizeClass,
    isLight
      ? 'bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-300 hover:border-zinc-300'
      : 'bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-600 hover:border-zinc-700',
    !selectedOption && 'text-zinc-500',
    open &&
      (isLight
        ? 'border-zinc-400 ring-1 ring-zinc-200'
        : 'border-zinc-600 ring-1 ring-zinc-700/50'),
    disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
  );

  const panelClass = clsx(
    'absolute left-0 right-0 top-0 z-50 border shadow-xl overflow-hidden',
    size === 'sm' ? 'rounded-lg' : 'rounded-xl',
    isLight
      ? 'bg-white border-zinc-200 shadow-zinc-900/15'
      : 'bg-zinc-950 border-zinc-800 shadow-black/50',
  );

  const searchRowClass = clsx(
    'flex items-center gap-2 px-3 border-b',
    size === 'sm' ? 'py-2' : 'py-2.5',
    isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/80',
  );

  const listClass = clsx(
    'overflow-y-auto overscroll-contain',
    size === 'sm' ? 'max-h-52' : 'max-h-64',
    isLight ? 'divide-y divide-zinc-200' : 'divide-y divide-zinc-800/60',
  );

  const renderOptions = () =>
    filteredOptions.map((option) => {
      const selected = value === option.value;
      return (
        <button
          key={option.value || '__empty__'}
          type="button"
          role="option"
          aria-selected={selected}
          tabIndex={open ? 0 : -1}
          onClick={() => selectOption(option.value)}
          className={clsx(
            'w-full flex items-center justify-between gap-2 px-4 text-left transition-colors',
            size === 'sm' ? 'py-2 text-xs' : 'py-2.5 text-sm',
            selected &&
              (isLight
                ? 'border-l-2 border-zinc-900 bg-zinc-100 text-zinc-900 font-medium pl-[14px]'
                : 'border-l-2 border-zinc-200 bg-zinc-800 text-zinc-100 pl-[14px]'),
            !selected &&
              (isLight
                ? 'text-zinc-800 hover:bg-zinc-50'
                : 'text-zinc-300 hover:bg-zinc-900'),
          )}
        >
          <span className="truncate">{option.label}</span>
          {selected && (
            <Check
              size={size === 'sm' ? 12 : 14}
              className={isLight ? 'text-zinc-900' : 'text-zinc-200'}
            />
          )}
        </button>
      );
    });

  return (
    <div ref={rootRef} className={clsx('relative', open && 'z-50', className)}>
      {open ? (
        <>
          <div aria-hidden className={clsx(triggerClass, 'invisible pointer-events-none')}>
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown size={size === 'sm' ? 14 : 16} aria-hidden className="shrink-0" />
          </div>

          <div id={panelId} role="listbox" className={panelClass}>
            {showSearch && (
              <div className={searchRowClass}>
                <Search size={14} className="text-zinc-500 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder ?? t('common.select.searchPlaceholder')}
                  className={clsx(
                    'w-full bg-transparent focus:outline-none',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                    isLight
                      ? 'text-zinc-900 placeholder:text-zinc-400'
                      : 'text-zinc-200 placeholder:text-zinc-600',
                  )}
                />
              </div>
            )}

            <div className={listClass}>
              {filteredOptions.length === 0 ? (
                <p
                  className={clsx(
                    'px-4 py-6 text-zinc-500 text-center',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                  )}
                >
                  {emptyMessage ?? t('common.select.searchEmpty')}
                </p>
              ) : (
                renderOptions()
              )}
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={triggerClass}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown size={size === 'sm' ? 14 : 16} aria-hidden className="shrink-0 text-zinc-500" />
        </button>
      )}
    </div>
  );
}
