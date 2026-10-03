import { useCallback, useMemo, useState } from 'react';

import {
  ClientOnly,
  createFileRoute,
  useHydrated,
} from '@tanstack/react-router';
import { ArrowLeftRight, Plus, Sprout } from 'lucide-react';

import { AdminButton } from '@/components/AdminButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorNotice } from '@/components/ErrorNotice';
import { CompareBar } from '@/components/family/CompareBar';
import { KinshipView } from '@/components/family/KinshipView';
import { Library } from '@/components/family/Library';
import { MemorialList } from '@/components/family/MemorialList';
import { PersonForm } from '@/components/family/PersonForm';
import { PersonPanel } from '@/components/family/PersonPanel';
import { SuggestionList } from '@/components/family/SuggestionList';
import TreeView from '@/components/family/TreeView';
import { Footer } from '@/components/Footer';
import { SearchBox } from '@/components/SearchBox';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dialog } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import {
  familyAround,
  generationLevels,
  hiddenChildren,
  houseOf,
  mainRootId,
  matches,
  reveal,
  revealChildren,
  surname,
} from '@/lib/family-data';
import { FamilyProvider, useFamily } from '@/lib/family-store';
import { LANGS, LangProvider, useT } from '@/lib/i18n';
import { btn, btnPrimary } from '@/lib/utils';
import { loadFamily } from '@/server/family';

const TABS = [
  'tree',
  'library',
  'memorials',
  'kinship',
  'suggestions',
] as const;

type Tab = (typeof TABS)[number];

/**
 * What the URL keeps, so a link opens the same view: the tab (absent = tree),
 * the selected person and the search text.
 */
type Search = { tab?: Tab; person?: string; q?: string };

const text = (v: unknown) =>
  // `?q=1970` is parsed as a number.
  typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;

export const Route = createFileRoute('/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab:
      TABS.includes(s.tab as Tab) && s.tab !== 'tree'
        ? (s.tab as Tab)
        : undefined,
    person: text(s.person) || undefined,
    q: text(s.q) || undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Gia Phả — Family Tree' },
      {
        name: 'description',
        content:
          'Explore the family tree, relatives, memorial days, and corrections.',
      },
      { property: 'og:title', content: 'Gia Phả — Family Tree' },
      {
        property: 'og:description',
        content: 'Explore the family tree, relatives, and memorial days.',
      },
    ],
  }),
  // The data only changes through writes, which call `router.invalidate()`;
  // changing the URL search (e.g. typing in the search box) must not refetch.
  shouldReload: false,
  loader: {
    handler: () => loadFamily(),
    // A write resolves once the fresh data is in: a background reload could
    // be dropped by the navigation that follows (e.g. closing the panel).
    staleReloadMode: 'blocking',
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <LangProvider>
      <FamilyProvider data={data}>
        <App />
      </FamilyProvider>
    </LangProvider>
  );
}

type Scope = 'main' | 'all' | 'custom';
/** Generations of the main house shown on first load. */
const MAIN_DEPTH = 4;

function App() {
  const { people, byId, suggestions, isAdmin } = useFamily();
  const { t, lang, setLang } = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const tab: Tab =
    search.tab === 'suggestions' && !isAdmin ? 'tree' : (search.tab ?? 'tree');

  const selectedId = search.person;
  const q = search.q ?? '';

  /** Change some of the URL state; typing replaces history instead of adding. */
  const go = useCallback(
    (patch: Search, replace = false) =>
      void navigate({
        search: (prev) => {
          const next = { ...prev, ...patch };

          return {
            tab: next.tab === 'tree' ? undefined : next.tab,
            person: next.person || undefined,
            q: next.q || undefined,
          };
        },
        replace,
        resetScroll: false,
      }),
    [navigate],
  );

  const setTab = (x: Tab) => go({ tab: x });
  /** People drawn in the tree; null = the main house at MAIN_DEPTH. */
  const [visible, setVisible] = useState<Set<string> | null>(null);
  /** Family to frame after an expansion; null = fit the whole tree. */
  const [focus, setFocus] = useState<string[] | null>(null);
  /** The two people compared in the kinship view. */
  const [pair, setPair] = useState<[string, string]>(['', '']);
  /** When on, tapping cards in the tree fills the pair instead of selecting. */
  const [compare, setCompare] = useState(false);
  const [adding, setAdding] = useState(false);
  const hydrated = useHydrated();
  /** Today, on the client only: the server's clock and time zone may differ. */
  const now = useMemo(() => (hydrated ? new Date() : null), [hydrated]);

  const mainIds = useMemo(() => {
    const root = mainRootId(people);

    return root
      ? houseOf(people, root, MAIN_DEPTH)
      : new Set(people.map((p) => p.id));
  }, [people]);

  const levels = useMemo(() => generationLevels(people), [people]);

  const shown = visible ?? mainIds;

  const visiblePeople = useMemo(
    () => people.filter((p) => shown.has(p.id)),
    [people, shown],
  );

  const hiddenKids = useMemo(
    () => hiddenChildren(people, shown),
    [people, shown],
  );

  /** The selected person last made visible, so it happens once each. */
  const [revealed, setRevealed] = useState<string>();

  // A newly selected person (a tap, a link or Back) is added to the tree if
  // hidden. Done while rendering, so the tree never draws without them.
  if (selectedId !== revealed) {
    setRevealed(selectedId);

    if (selectedId && byId.has(selectedId) && !shown.has(selectedId)) {
      setVisible(reveal(people, shown, selectedId));
      setFocus(null);
    }
  }

  const scope: Scope =
    visible === null
      ? 'main'
      : visible.size === people.length
        ? 'all'
        : 'custom';

  const selected = selectedId ? byId.get(selectedId) : undefined;
  /** Nobody saved yet: every people view shows one placeholder. */
  const empty = people.length === 0;
  const results = q ? people.filter((p) => matches(p, q)) : people;

  /** Select a person and show them on the tree. */
  const select = (id: string) => go({ person: id, tab: 'tree' });

  const expand = useCallback(
    (id: string) => {
      setVisible((v) => revealChildren(people, v ?? mainIds, id));
      setFocus(familyAround(people, id));
    },
    [people, mainIds],
  );

  /** Compare mode: first tap fills slot 1, second fills slot 2, then restart. */
  const pick = (id: string) =>
    setPair(([a, b]) => (!a ? [id, b] : !b && a !== id ? [a, id] : [id, '']));

  const show = (ids: Set<string> | null) => {
    setVisible(ids);
    setFocus(null);
  };

  /** Show a person's house (họ) and make them the selected person. */
  const showHouse = (id: string) => {
    show(houseOf(people, id));
    setRevealed(id);
    go({ person: id });
  };

  const setScope = (s: Scope) =>
    show(s === 'all' ? new Set(people.map((p) => p.id)) : null);

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'tree', label: t('tree') },
    { value: 'library', label: t('library') },
    { value: 'memorials', label: t('memorials') },
    { value: 'kinship', label: t('kinship') },
  ];

  if (isAdmin)
    tabs.push({
      value: 'suggestions',
      label: `${t('suggestions')}${suggestions.length ? ` (${suggestions.length})` : ''}`,
    });

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b bg-card px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-bold">
            {tab === 'tree' && selected
              ? t('titleFor', { s: surname(selected) })
              : t('title')}
          </h1>
          <div className="flex items-center gap-2">
            <Segmented
              value={lang}
              onChange={setLang}
              options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
            />
            <ThemeToggle />
            {isAdmin && (
              <button
                onClick={() => setAdding(true)}
                className={`${btnPrimary} flex items-center gap-1`}
              >
                <Plus className="h-3.5 w-3.5" /> {t('add')}
              </button>
            )}
            <AdminButton
              onLogout={() => tab === 'suggestions' && setTab('tree')}
            />
          </div>
        </div>

        <SearchBox
          value={q}
          onChange={(x) => go({ q: x }, true)}
          results={results}
          dropdown={tab === 'tree'}
          onPick={(id) => go({ person: id, tab: 'tree', q: '' })}
        />

        <nav className="mt-2 -mb-px flex gap-4 overflow-x-auto text-sm">
          {tabs.map((x) => (
            <button
              key={x.value}
              onClick={() => setTab(x.value)}
              aria-current={tab === x.value ? 'page' : undefined}
              className={`border-b-2 py-2 whitespace-nowrap ${tab === x.value ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {x.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {empty && tab !== 'suggestions' && (
          <EmptyState
            icon={Sprout}
            title={t('noPeople')}
            description={
              isAdmin ? t('noPeopleHintAdmin') : t('noPeopleHintGuest')
            }
          >
            {isAdmin && (
              <button
                onClick={() => setAdding(true)}
                className={`${btnPrimary} flex items-center gap-1`}
              >
                <Plus className="h-3.5 w-3.5" /> {t('addPerson')}
              </button>
            )}
          </EmptyState>
        )}
        {!empty && tab === 'tree' && (
          <>
            <div className="relative min-h-48 flex-1">
              <ClientOnly
                fallback={
                  <div className="p-6 text-sm text-muted-foreground">
                    {t('loadingTree')}
                  </div>
                }
              >
                <TreeView
                  people={visiblePeople}
                  selectedId={selectedId}
                  focus={focus}
                  marks={compare ? pair : undefined}
                  hiddenKids={hiddenKids}
                  onSelect={compare ? pick : select}
                  onExpand={expand}
                />
              </ClientOnly>
              <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2 md:top-3 md:bottom-auto">
                <button
                  onClick={() => setCompare((v) => !v)}
                  aria-pressed={compare}
                  className={`${btn} flex items-center gap-1 shadow-sm ${compare ? 'bg-accent' : ''}`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" /> {t('kinship')}
                </button>
                <Segmented
                  className="shadow-sm"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: 'main', label: t('mainTree') },
                    { value: 'all', label: t('everyone') },
                  ]}
                />
              </div>
              {compare && (
                <CompareBar
                  people={people}
                  pair={pair}
                  onClear={() => setPair(['', ''])}
                  onClose={() => setCompare(false)}
                  onDetails={() => setTab('kinship')}
                />
              )}
            </div>
            {selected && (
              <aside className="max-h-[55dvh] min-h-0 overflow-auto border-t bg-card md:max-h-none md:w-96 md:shrink-0 md:border-t-0 md:border-l">
                <PersonPanel
                  person={selected}
                  onClose={() => go({ person: undefined })}
                  onSelect={select}
                  onHouse={showHouse}
                  onCompare={(id) => {
                    setPair(([, b]) => [id, b === id ? '' : b]);
                    setTab('kinship');
                  }}
                />
              </aside>
            )}
          </>
        )}
        {!empty && tab === 'library' && (
          <Library
            people={results}
            levels={levels}
            now={now}
            onSelect={select}
          />
        )}
        {!empty && tab === 'memorials' && (
          <MemorialList
            people={results}
            searching={!!q}
            now={now}
            onSelect={select}
          />
        )}
        {!empty && tab === 'kinship' && (
          <KinshipView
            people={people}
            pair={pair}
            onChange={setPair}
            onSelect={select}
          />
        )}
        {tab === 'suggestions' && isAdmin && (
          <SuggestionList onSelect={select} />
        )}
      </main>
      <Footer />
      <ErrorNotice />

      <Dialog open={adding} onOpenChange={setAdding} title={t('addPerson')}>
        <PersonForm onDone={() => setAdding(false)} />
      </Dialog>
    </div>
  );
}
