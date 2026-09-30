import { useCallback, useEffect, useMemo, useState } from 'react'

import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { ArrowLeftRight, Lock, LogOut, Plus, Search } from 'lucide-react'

import { AddPersonForm } from '@/components/family/AddPersonForm'
import { CompareBar } from '@/components/family/CompareBar'
import { KinshipView } from '@/components/family/KinshipView'
import { Library } from '@/components/family/Library'
import { MemorialList } from '@/components/family/MemorialList'
import { PersonPanel } from '@/components/family/PersonPanel'
import { SuggestionList } from '@/components/family/SuggestionList'
import TreeView from '@/components/family/TreeView'
import { Footer } from '@/components/Footer'
import { Segmented } from '@/components/ui/segmented'
import {
  childrenOf,
  familyAround,
  houseOf,
  mainRootId,
  matches,
  reveal,
  revealChildren,
  surname,
} from '@/lib/family-data'
import { FamilyProvider, useFamily } from '@/lib/family-store'
import { LangProvider, useT } from '@/lib/i18n'
import { btn, btnPrimary } from '@/lib/utils'

import type { Lang } from '@/lib/i18n'

export const Route = createFileRoute('/')({
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
  component: () => (
    <LangProvider>
      <FamilyProvider>
        <App />
      </FamilyProvider>
    </LangProvider>
  ),
})

type Tab = 'tree' | 'library' | 'memorials' | 'kinship' | 'suggestions'
type Scope = 'main' | 'all' | 'custom'
/** Generations of the main house shown on first load. */
const MAIN_DEPTH = 4
const LANGS: Lang[] = ['vi', 'en']

function App() {
  const { people, byId, suggestions, isAdmin, login, logout } = useFamily()
  const { t, lang, setLang } = useT()
  const [tab, setTab] = useState<Tab>('tree')
  const [selectedId, setSelectedId] = useState<string>()
  /** People drawn in the tree; null = the main house at MAIN_DEPTH. */
  const [visible, setVisible] = useState<Set<string> | null>(null)
  /** Family to frame after an expansion; null = fit the whole tree. */
  const [focus, setFocus] = useState<string[] | null>(null)
  const [q, setQ] = useState('')
  /** The two people compared in the kinship view. */
  const [pair, setPair] = useState<[string, string]>(['', ''])
  /** When on, tapping cards in the tree fills the pair instead of selecting. */
  const [compare, setCompare] = useState(false)
  const [adding, setAdding] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const mainIds = useMemo(() => {
    const root = mainRootId(people)

    return root
      ? houseOf(people, root, MAIN_DEPTH)
      : new Set(people.map((p) => p.id))
  }, [people])

  const shown = visible ?? mainIds

  const visiblePeople = useMemo(
    () => people.filter((p) => shown.has(p.id)),
    [people, shown],
  )

  const hiddenKids = useMemo(() => {
    const m = new Map<string, number>()

    visiblePeople.forEach((p) => {
      const n = childrenOf(people, p.id).filter((c) => !shown.has(c.id)).length
      if (n) m.set(p.id, n)
    })

    return m
  }, [people, visiblePeople, shown])

  const scope: Scope =
    visible === null
      ? 'main'
      : visible.size === people.length
        ? 'all'
        : 'custom'

  const selected = selectedId ? byId.get(selectedId) : undefined
  const results = q ? people.filter((p) => matches(p, q)) : people

  /** Select a person; make them visible in the tree if they are hidden. */
  const select = (id: string) => {
    setSelectedId(id)
    setTab('tree')

    if (!shown.has(id)) {
      setVisible(reveal(people, shown, id))
      setFocus(null)
    }
  }

  const expand = useCallback(
    (id: string) => {
      setVisible((v) => revealChildren(people, v ?? mainIds, id))
      setFocus(familyAround(people, id))
    },
    [people, mainIds],
  )

  /** Compare mode: first tap fills slot 1, second fills slot 2, then restart. */
  const pick = (id: string) =>
    setPair(([a, b]) => (!a ? [id, b] : !b && a !== id ? [a, id] : [id, '']))

  const show = (ids: Set<string> | null) => {
    setVisible(ids)
    setFocus(null)
  }

  /** Show a person's house (họ) and make them the selected person. */
  const showHouse = (id: string) => {
    show(houseOf(people, id))
    setSelectedId(id)
  }

  const setScope = (s: Scope) =>
    show(s === 'all' ? new Set(people.map((p) => p.id)) : null)

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'tree', label: t('tree') },
    { value: 'library', label: t('library') },
    { value: 'memorials', label: t('memorials') },
    { value: 'kinship', label: t('kinship') },
  ]

  if (isAdmin)
    tabs.push({
      value: 'suggestions',
      label: `${t('suggestions')}${suggestions.length ? ` (${suggestions.length})` : ''}`,
    })

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
            {isAdmin && (
              <button
                onClick={() => setAdding(true)}
                className={`${btnPrimary} flex items-center gap-1`}
              >
                <Plus className="h-3.5 w-3.5" /> {t('add')}
              </button>
            )}
            <button
              onClick={() => {
                if (isAdmin) {
                  if (tab === 'suggestions') setTab('tree')

                  return logout()
                }

                const c = prompt(t('adminPasscode'))
                if (c && !login(c)) alert(t('wrongPasscode'))
              }}
              className={`${btn} flex items-center gap-1`}
            >
              {isAdmin ? (
                <LogOut className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {t('admin')}
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            className="w-full rounded-md border bg-background py-2 pr-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {q && tab === 'tree' && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
              {results.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    select(p.id)
                    setQ('')
                  }}
                  className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                >
                  {p.name}{' '}
                  <span className="text-muted-foreground">{p.birthYear}</span>
                </button>
              ))}
              {!results.length && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t('noMatch')}
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="mt-2 -mb-px flex gap-4 overflow-x-auto text-sm">
          {tabs.map((x) => (
            <button
              key={x.value}
              onClick={() => setTab(x.value)}
              className={`border-b-2 py-2 whitespace-nowrap ${tab === x.value ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {x.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {tab === 'tree' && (
          <>
            <div className="relative min-h-0 flex-1">
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
              <aside className="max-h-[55dvh] shrink-0 overflow-auto border-t bg-card md:max-h-none md:w-96 md:border-t-0 md:border-l">
                <PersonPanel
                  person={selected}
                  onClose={() => setSelectedId(undefined)}
                  onSelect={select}
                  onHouse={showHouse}
                  onCompare={(id) => {
                    setPair(([, b]) => [id, b === id ? '' : b])
                    setTab('kinship')
                  }}
                />
              </aside>
            )}
          </>
        )}
        {tab === 'library' && (
          <Library people={results} now={now} onSelect={select} />
        )}
        {tab === 'memorials' && (
          <MemorialList people={people} now={now} onSelect={select} />
        )}
        {tab === 'kinship' && (
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

      {adding && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 sm:items-center"
          onClick={() => setAdding(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border bg-card p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 font-medium">{t('addPerson')}</h2>
            <AddPersonForm onDone={() => setAdding(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
