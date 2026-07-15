import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { getPrinciplesOverview, searchPrinciples } from '../api';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT } from '../i18n';
import { Input } from '../components/ui/Input';

export function PrinciplesPage() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const overview = useQuery({
    queryKey: ['principles-overview'],
    queryFn: getPrinciplesOverview,
  });
  const principles = useQuery({
    queryKey: ['public-principles', query, category],
    queryFn: ({ signal }) => searchPrinciples({ query: query.trim(), category }, signal),
  });

  return (
    <PageContainer>
      <PageHeader page="principles" subtitle={t('principles.subtitle')} />
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('principles.searchPlaceholder')}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
        />
        <Select.Root value={category} onValueChange={(value) => setCategory(value ?? '')}>
          <Select.Trigger className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-violet-500">
            <Select.Value />
            <Select.Icon>
              <ChevronDown size={16} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="z-50" sideOffset={4}>
              <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 py-1 text-sm shadow-xl">
                <Select.Item
                  value=""
                  className="flex cursor-default items-center justify-between gap-3 px-3 py-2 text-zinc-300 outline-none data-[highlighted]:bg-zinc-800"
                >
                  <Select.ItemText>{t('principles.allCategories')}</Select.ItemText>
                  <Select.ItemIndicator><Check size={14} /></Select.ItemIndicator>
                </Select.Item>
                {overview.data?.categories.map((item) => (
                  <Select.Item
                    key={item}
                    value={item}
                    className="flex cursor-default items-center justify-between gap-3 px-3 py-2 text-zinc-300 outline-none data-[highlighted]:bg-zinc-800"
                  >
                    <Select.ItemText>{item}</Select.ItemText>
                    <Select.ItemIndicator><Check size={14} /></Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {principles.data?.map((principle) => (
          <article
            key={principle.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
              {principle.category}
            </p>
            <h2 className="mt-2 font-semibold text-zinc-100">{principle.name}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{principle.description}</p>
            {principle.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {principle.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {!principles.isLoading && !principles.data?.length && (
        <p className="py-12 text-center text-sm text-zinc-500">{t('principles.empty')}</p>
      )}
    </PageContainer>
  );
}
