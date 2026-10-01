import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { ChevronDown } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  birthYear,
  courtesyNameText,
  genderVars,
  indexById,
  isDeceased,
  lifespan,
} from '@/lib/family-data';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

import { DeceasedMark } from './PersonParts';

import type { Person } from '@/lib/family-data';
import type { Edge, Node, NodeProps } from '@xyflow/react';

const W = 172;
const H = 64;
const GAP_SPOUSE = 16;
const GAP_UNIT = 40;
const GAP_ROW = 72;
const MOBILE = 768;

/** Invisible edge anchor: children hang from the bottom, parents from the top. */
const HiddenHandle = ({ type }: { type: 'source' | 'target' }) => (
  <Handle
    type={type}
    position={type === 'target' ? Position.Top : Position.Bottom}
    className="!pointer-events-none !opacity-0"
  />
);

type PData = {
  person: Person;
  selected: boolean;
  /** 1 or 2 when the person is picked for comparison, else 0. */
  mark: number;
  hiddenKids: number;
  onExpand: (id: string) => void;
};

function PersonNode({ data }: NodeProps<Node<PData>>) {
  const { t } = useT();
  const { person: p, selected, mark, hiddenKids, onExpand } = data;

  // Handles sit outside the animated card so React Flow measures them
  // correctly without offsetting the edges.
  return (
    <div className="relative" style={{ width: W }}>
      <HiddenHandle type="target" />
      <div
        data-selected={selected}
        className="relative node-in rounded-lg border border-(--c) bg-card px-3 py-2 shadow-sm transition-colors hover:bg-(--c-soft) data-[selected=true]:bg-(--c) data-[selected=true]:text-background data-[selected=true]:hover:bg-(--c)"
        style={genderVars(p.gender)}
      >
        {mark > 0 && (
          <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground shadow">
            {mark}
          </span>
        )}
        {isDeceased(p) && (
          <DeceasedMark className="absolute top-1.5 right-1.5" />
        )}
        <div className="truncate pr-4 text-sm font-medium">{p.name}</div>
        <div className="truncate text-xs opacity-75">
          {p.courtesyName ? `${courtesyNameText(p)} · ` : ''}
          {lifespan(p)}
        </div>
        {hiddenKids > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('moreChildren', { n: hiddenKids })}
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand(p.id);
                }}
                className="nodrag nopan absolute -bottom-3 left-1/2 z-10 flex h-6 min-w-6 -translate-x-1/2 cursor-pointer items-center justify-center gap-0.5 rounded-full border border-(--c) bg-card px-1.5 text-[11px] leading-none text-foreground shadow-sm transition-all hover:scale-110 hover:bg-(--c) hover:text-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
              >
                <ChevronDown className="h-3 w-3" />
                {hiddenKids}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('moreChildren', { n: hiddenKids })}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <HiddenHandle type="source" />
    </div>
  );
}

function UnionNode() {
  return (
    <div className="h-2 w-2 rounded-full bg-muted-foreground">
      <HiddenHandle type="target" />
      <HiddenHandle type="source" />
    </div>
  );
}

const nodeTypes = { person: PersonNode, union: UnionNode };

/** A couple (or single person) drawn side by side, with their children below. */
type Unit = {
  id: string;
  members: Person[];
  /** The member whose parents attach this unit to the tree. */
  anchor: Person;
  children: Unit[];
  /** Everyone whose edges touch this unit's union dot. */
  linked: Set<string>;
  x: number;
  y: number;
  width: number;
};

const unitWidth = (u: Unit) =>
  u.members.length * W + (u.members.length - 1) * GAP_SPOUSE;

/**
 * Balanced top-down layout: each couple is centered above its children.
 * Children attach through the father when both parents are present; a
 * member's own parents, when they are elsewhere, are linked with a dashed edge.
 */
function layout(people: Person[]) {
  const byId = indexById(people);

  const parentOf = (p: Person) =>
    [p.fatherId, p.motherId].find((id) => id && byId.has(id));

  const unitOf = new Map<string, Unit>();
  const units: Unit[] = [];

  people.forEach((p) => {
    if (unitOf.has(p.id)) return;
    const members: Person[] = [];
    const queue = [p];

    while (queue.length) {
      const x = queue.shift()!;
      if (members.includes(x)) continue;
      members.push(x);

      x.spouseIds.forEach((s) => {
        const sp = byId.get(s);
        if (sp) queue.push(sp);
      });
    }

    members.sort(
      (a, b) => Number(b.gender === 'male') - Number(a.gender === 'male'),
    );

    const anchor =
      members.find((m) => m.gender === 'male' && parentOf(m)) ??
      members.find(parentOf) ??
      members[0];

    const u: Unit = {
      id: `u:${members.map((m) => m.id).join('+')}`,
      members,
      anchor,
      children: [],
      linked: new Set(members.map((m) => m.id)),
      x: 0,
      y: 0,
      width: 0,
    };

    members.forEach((m) => unitOf.set(m.id, u));
    units.push(u);
  });

  const roots: Unit[] = [];
  const edges: Edge[] = [];

  const link = (from: Unit, to: Person, dashed: boolean) => {
    from.linked.add(to.id);

    edges.push({
      id: `${from.id}>${to.id}`,
      source: from.id,
      target: to.id,
      type: 'smoothstep',
      data: { unit: from, dashed },
    });
  };

  units.forEach((u) => {
    const pid = parentOf(u.anchor);
    const parent = pid ? unitOf.get(pid) : undefined;
    if (parent && parent !== u) parent.children.push(u);
    else roots.push(u);

    u.members.forEach((m) => {
      if (m === u.anchor) return;
      const mp = parentOf(m);
      const mu = mp ? unitOf.get(mp) : undefined;
      if (mu && mu !== u) link(mu, m, true);
    });
  });

  const byBirth = (a: Unit, b: Unit) =>
    (birthYear(a.anchor) ?? 9999) - (birthYear(b.anchor) ?? 9999);

  const seen = new Set<string>();

  const measure = (u: Unit): number => {
    if (seen.has(u.id)) return 0;
    seen.add(u.id);
    u.children.sort(byBirth);
    const kids = u.children.reduce((s, c) => s + measure(c), 0);
    const gaps = Math.max(0, u.children.length - 1) * GAP_UNIT;
    u.width = Math.max(unitWidth(u), kids + gaps);

    return u.width;
  };

  const place = (u: Unit, x0: number, depth: number) => {
    u.y = depth * (H + GAP_ROW);
    u.x = x0 + (u.width - unitWidth(u)) / 2;

    const kids =
      u.children.reduce((s, c) => s + c.width, 0) +
      Math.max(0, u.children.length - 1) * GAP_UNIT;

    let cx = x0 + (u.width - kids) / 2;

    u.children.forEach((c) => {
      place(c, cx, depth + 1);
      cx += c.width + GAP_UNIT;
    });
  };

  roots.forEach(measure);
  roots.sort((a, b) => b.width - a.width);
  let x = 0;

  roots.forEach((r) => {
    place(r, x, 0);
    x += r.width + GAP_UNIT * 2;
  });

  const nodes: Node[] = [];

  units.forEach((u) => {
    u.members.forEach((m, i) =>
      nodes.push({
        id: m.id,
        type: 'person',
        width: W,
        height: H,
        position: { x: u.x + i * (W + GAP_SPOUSE), y: u.y },
        data: {},
      }),
    );

    u.children.forEach((c) => link(u, c.anchor, false));
    if (u.members.length < 2 && u.linked.size <= u.members.length) return;
    const cx = u.x + unitWidth(u) / 2;

    nodes.push({
      id: u.id,
      type: 'union',
      width: 8,
      height: 8,
      position: { x: cx - 4, y: u.y + H + GAP_ROW / 2 - 4 },
      data: {},
      selectable: false,
    });

    u.members.forEach((m) =>
      edges.push({
        id: `${m.id}>${u.id}`,
        source: m.id,
        target: u.id,
        type: 'smoothstep',
        data: { unit: u, dashed: false },
      }),
    );
  });

  const root = roots.at(0);
  const rootCenterX = root ? root.x + unitWidth(root) / 2 : 0;

  return { nodes, edges, rootCenterX };
}

type Props = {
  people: Person[];
  selectedId?: string | undefined;
  /** People to frame after the visible set changes; null = fit everything. */
  focus?: string[] | null;
  /** Ids picked for comparison, shown as badges 1 and 2. */
  marks?: [string, string];
  hiddenKids: Map<string, number>;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
};

function Inner({
  people,
  selectedId,
  focus,
  marks,
  hiddenKids,
  onSelect,
  onExpand,
}: Props) {
  const rf = useReactFlow();
  const { theme } = useTheme();
  const box = useRef<HTMLDivElement>(null);
  /** React Flow has measured its nodes; viewport calls are reliable from here. */
  const [ready, setReady] = useState(false);

  const {
    nodes: baseNodes,
    edges: baseEdges,
    rootCenterX,
  } = useMemo(() => layout(people), [people]);

  const byId = useMemo(() => indexById(people), [people]);

  const nodes = useMemo(
    () =>
      baseNodes.map((n) =>
        n.type === 'person'
          ? {
              ...n,
              data: {
                person: byId.get(n.id) as Person,
                selected: n.id === selectedId,
                mark: marks ? marks.indexOf(n.id) + 1 : 0,
                hiddenKids: hiddenKids.get(n.id) ?? 0,
                onExpand,
              } satisfies PData,
            }
          : n,
      ),
    [baseNodes, byId, selectedId, marks, hiddenKids, onExpand],
  );

  const edges = useMemo(
    () =>
      baseEdges.map((e) => {
        const { unit, dashed } = e.data as { unit: Unit; dashed: boolean };
        const related = !!selectedId && unit.linked.has(selectedId);

        return {
          ...e,
          animated: related,
          style: {
            stroke: related ? 'var(--primary)' : 'var(--muted-foreground)',
            strokeWidth: related ? 2 : 1.2,
            strokeDasharray: dashed ? '4 3' : undefined,
          },
        };
      }),
    [baseEdges, selectedId],
  );

  // Frame the focused family or fit the tree; mobile keeps the root readable.
  useEffect(() => {
    if (!ready) return;

    const t = setTimeout(() => {
      const cw = box.current?.clientWidth ?? 0;
      const framed = focus?.filter((id) => rf.getNode(id)) ?? [];
      if (framed.length) {
        rf.fitView({
          nodes: framed.map((id) => ({ id })),
          duration: 600,
          padding: 0.2,
          maxZoom: 1,
        });
      } else if (cw && cw < MOBILE) {
        const zoom = Math.min(1, Math.max(0.5, cw / (2.4 * W)));

        rf.setViewport(
          { x: cw / 2 - rootCenterX * zoom, y: 24, zoom },
          { duration: 500 },
        );
      } else rf.fitView({ duration: 600, padding: 0.1, maxZoom: 1 });
    }, 50);

    return () => clearTimeout(t);
  }, [ready, people, rootCenterX, focus, rf]);

  // Center on the selected person (runs after the fit above when both change).
  useEffect(() => {
    if (!ready || !selectedId) return;

    const t = setTimeout(() => {
      const n = rf.getNode(selectedId);
      if (!n) return;

      rf.setCenter(n.position.x + W / 2, n.position.y + H / 2, {
        zoom: Math.max(rf.getZoom(), 0.9),
        duration: 500,
      });
    }, 60);

    return () => clearTimeout(t);
  }, [ready, selectedId, rf]);

  // Absolute so the canvas always has a measurable size, even in flex layouts.
  return (
    <div ref={box} className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => n.type === 'person' && onSelect(n.id)}
        nodesDraggable={false}
        nodesConnectable={false}
        minZoom={0.1}
        colorMode={theme}
        onInit={() => setReady(true)}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default function TreeView(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
