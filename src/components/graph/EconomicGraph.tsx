'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import { Expand, Focus, Layers as LayersIcon, Map as MapIcon, Minimize2, Network, RotateCcw, Search, X } from 'lucide-react';
import { getRegistry, type Registry } from '@/lib/data/client';
import { computeLayout } from '@/lib/graph/layout';
import { cx } from '@/lib/utils';
import { NODE_TYPES } from './nodes';
import { GraphLegend } from './GraphLegend';
import { EntityDetail } from './EntityDetail';

const TYPE_ORDER = ['company', 'sector', 'index', 'event'] as const;
type Depth = 0 | 1 | 2;

const EDGE_STYLE: Record<string, string> = {
  classified_in: 'rgb(var(--c-ink-faint))',
  index_of: 'rgb(var(--c-commodity))',
  published_by: 'rgb(var(--c-event))',
  listed_on: 'rgb(var(--c-company))',
};

export interface EconomicGraphProps {
  /** lock the graph to a neighbourhood of this entity */
  rootId?: string;
  depth?: 1 | 2;
  /** opening selection when the graph is not locked */
  initialRoot?: string;
  initialDepth?: 0 | 1 | 2;
  height?: string;
  className?: string;
  compact?: boolean;
  showPanel?: boolean;
}

function GraphInner({
  rootId,
  depth: lockedDepth,
  initialRoot,
  initialDepth = 1,
  height = 'h-[600px]',
  className,
  compact = false,
  showPanel = true,
}: EconomicGraphProps) {
  const { fitView, setCenter } = useReactFlow();

  const [active, setActive] = useState<Set<string>>(() => new Set(TYPE_ORDER));
  const [selected, setSelected] = useState<string | null>(initialRoot ?? null);
  const [depth, setDepth] = useState<Depth>(lockedDepth ?? (initialRoot ? initialDepth : 0));
  const [query, setQuery] = useState('');
  const [queryOpen, setQueryOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(!compact);
  const [showMinimap, setShowMinimap] = useState(false);
  const [full, setFull] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const prevScope = useRef<string>('');

  const locked = Boolean(rootId);

  /* ── derived visibility ───────────────────────────────────────────────── */

  const [reg, setReg] = useState<Registry | null>(null);
  useEffect(() => {
    let on = true;
    void getRegistry().then((r) => {
      if (on) setReg(r);
    });
    return () => {
      on = false;
    };
  }, []);

  const REGISTRY = useMemo(() => reg?.nodes ?? [], [reg]);
  const RELATIONS = useMemo(() => reg?.relations ?? [], [reg]);
  const adjacency = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of RELATIONS) {
      (m.get(r.from) ?? m.set(r.from, []).get(r.from)!).push(r.to);
      (m.get(r.to) ?? m.set(r.to, []).get(r.to)!).push(r.from);
    }
    return m;
  }, [RELATIONS]);

  const neighbors1 = useCallback(
    (id: string) => adjacency.get(id) ?? [],
    [adjacency],
  );

  const neighborsOf = useCallback(
    (id: string, hops: number) => {
      const seen = new Set<string>([id]);
      let frontier = [id];
      for (let h = 0; h < hops; h++) {
        const next: string[] = [];
        frontier.forEach((f) =>
          neighbors1(f).forEach((n) => {
            if (!seen.has(n)) {
              seen.add(n);
              next.push(n);
            }
          }),
        );
        frontier = next;
      }
      return seen;
    },
    [neighbors1],
  );

  /**
   * The official classification spine: every sector and every issuer the AMMC
   * register classifies into one. This is the only part of the registry the
   * Bourse and the AMMC both publish a relation for, so it is what the graph
   * opens on. Index levels and dated records are reachable by search but have
   * no published relation to join them here.
   */
  /**
   * The graph opens on the AMMC sector ring alone. All sixteen sectors at once
   * is the largest scope that stays legible in a viewport; every issuer, index
   * and record is reached by selecting a sector or searching for it. Opening
   * on the whole registry made every node too small to read.
   */
  const sectorIds = useMemo(
    () => new Set(REGISTRY.filter((n) => n.type === 'sector').map((n) => n.id)),
    [REGISTRY],
  );

  const visibleIds = useMemo(() => {
    if (rootId) return neighborsOf(rootId, lockedDepth ?? 1);
    if (depth > 0 && selected) return neighborsOf(selected, depth);
    return sectorIds;
  }, [rootId, lockedDepth, depth, selected, neighborsOf, sectorIds]);

  /** The sector ring is the only scope the graph opens on. */
  const showScopeHint = !rootId && !selected && depth === 0;

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const set = new Set<string>();
    REGISTRY.forEach((r) => {
      if (
        r.label.toLowerCase().includes(q) ||
        r.sublabel.toLowerCase().includes(q) ||
        r.type.includes(q)
      )
        set.add(r.id);
    });
    return set;
  }, [q, REGISTRY]);

  const selectedNeighbors = useMemo(
    () => (selected ? new Set([selected, ...neighbors1(selected)]) : null),
    [selected, neighbors1],
  );

  /* ── positions follow the visible scope, then reframe ─────────────────── */

  const visibleList = useMemo(
    () => REGISTRY.filter((r) => active.has(r.type) && visibleIds.has(r.id)).map((r) => r.id),
    [active, visibleIds, REGISTRY],
  );
  const scopeKey = visibleList.join(',');
  const pos = useMemo(
    () => (reg ? computeLayout(reg, { ids: visibleList }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeKey, reg],
  );

  useEffect(() => {
    if (prevScope.current === '') {
      prevScope.current = scopeKey;
      return;
    }
    if (prevScope.current === scopeKey) return;
    prevScope.current = scopeKey;
    const t = window.setTimeout(
      () => fitView({ padding: 0.08, duration: 520, maxZoom: 1.15 }),
      60,
    );
    return () => window.clearTimeout(t);
  }, [scopeKey, fitView]);

  const EDGE_DIM = 'rgb(var(--c-ink) / 0.18)';

  const nodes: Node[] = useMemo(() => {
    return REGISTRY.filter((r) => active.has(r.type) && visibleIds.has(r.id)).map((r) => {
      const dimmed =
        selectedNeighbors && !selectedNeighbors.has(r.id)
          ? true
          : matches !== null && !matches.has(r.id);
      return {
        id: r.id,
        type: r.type,
        position: pos[r.id] ?? { x: 0, y: 0 },
        data: {
          type: r.type,
          label: r.label,
          sublabel: r.sublabel,
          selected: selected === r.id,
          dimmed: dimmed && Boolean(selected || q),
          matched: Boolean(matches?.has(r.id)),
          meta:
            r.type === 'sector'
              ? r.id.replace(/^sec:/, '')
              : r.type === 'index'
                ? (r.code ?? undefined)
                : r.type === 'event'
                  ? (r.sublabel ?? '')
                  : undefined,
          count:
            r.type === 'sector'
              ? REGISTRY.filter((x) => x.type === 'company' && x.sublabel.includes(r.label)).length
              : undefined,
        },
        draggable: true,
      } satisfies Node;
    });
  }, [active, visibleIds, pos, selected, selectedNeighbors, matches, q, REGISTRY]);

  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges: Edge[] = useMemo(() => {
    return RELATIONS.filter((r) => nodeIds.has(r.from) && nodeIds.has(r.to)).map((r) => {
      const touching = selected ? r.from === selected || r.to === selected : false;
      const isMatchEdge = Boolean(matches) && matches!.has(r.from) && matches!.has(r.to);
      const colour = EDGE_STYLE[r.kind] ?? 'rgb(var(--c-ink-faint))';
      const emphasise = touching || isMatchEdge;
      const color = emphasise ? colour : EDGE_DIM;
      return {
        id: `${r.from}~${r.to}`,
        source: r.from,
        target: r.to,
        type: 'smoothstep' as const,
        animated: emphasise,
        style: {
          stroke: color,
          strokeWidth: emphasise ? 1.6 : r.basis === 'VERIFIED' ? 1.1 : 0.7,
          strokeOpacity: emphasise ? 0.85 : selectedNeighbors ? 0.07 : 0.24,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: emphasise ? 12 : 10,
          height: emphasise ? 12 : 10,
          color,
        },
        zIndex: emphasise ? 3 : 0,
      } satisfies Edge;
    });
  }, [nodeIds, selected, selectedNeighbors, matches, RELATIONS]);


  /* ── effects ──────────────────────────────────────────────────────────── */

  const focusOn = useCallback(
    (id: string, hop: Depth = 1) => {
      setSelected(id);
      setDepth(hop);
      if (hop === 0) {
        window.requestAnimationFrame(() =>
          fitView({ padding: 0.12, duration: 620, maxZoom: 1.05 }),
        );
      } else {
        const p = pos[id];
        if (p) window.setTimeout(() => setCenter(p.x, p.y, { zoom: 1.05, duration: 620 }), 40);
      }
    },
    [fitView, setCenter, pos],
  );

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [full]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Cmd/Ctrl+K is reserved for the global command palette; "/" is the
      // in-graph shortcut so the two never fire together.
      if (e.key === '/' && !locked) {
        e.preventDefault();
        setQueryOpen(true);
        window.setTimeout(() => searchRef.current?.focus(), 30);
      }
      if (e.key === 'Escape') {
        setQueryOpen(false);
        if (!locked) setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (locked) return;
      setSelected((cur) => (cur === node.id ? null : node.id));
    },
    [locked],
  );

  const toggleType = (t: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t) && next.size > 1) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const soloType = (t: string) => setActive(new Set([t]));

  const reset = () => {
    if (locked) {
      fitView({ padding: 0.16, duration: 560 });
      return;
    }
    setSelected(null);
    setDepth(0);
    setQuery('');
    setActive(new Set(TYPE_ORDER));
    window.setTimeout(() => fitView({ padding: 0.12, duration: 620 }), 30);
  };

  const activeCount = nodes.length;

  /* ── render ───────────────────────────────────────────────────────────── */

  const panelOpen = showPanel && Boolean(selected);

  return (
    <div
      className={cx(
        'relative isolate flex w-full overflow-hidden border border-line bg-bg',
        full
          ? 'fixed inset-0 z-[60] h-dvh w-screen rounded-none'
          : cx(height, className),
      )}
    >
      {/* ambient field */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, rgb(var(--c-accent)/0.045), transparent 70%)',
        }}
      />

      {showScopeHint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <p className="max-w-lg border border-line bg-bg/85 px-4 py-2 text-center font-mono text-2xs uppercase leading-relaxed tracking-[0.1em] text-ink-faint backdrop-blur-sm">
            This view is the AMMC sector ring. Select a sector to open its listed members, or
            search for an issuer, index or record to see it on its own.
          </p>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={(_, node) => focusOn(node.id, 1)}
          onPaneClick={() => !locked && setSelected(null)}
          minZoom={0.2}
          maxZoom={2.4}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
          nodesConnectable={false}
          elementsSelectable={!locked}
          selectNodesOnDrag={false}
          panOnScroll={false}
          zoomOnDoubleClick={false}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Lines} gap={44} size={0.6} color="rgb(var(--c-ink) / 0.07)" />
          <Controls showInteractive={false} position="bottom-left" className="!bottom-4 !left-4" />
          {showMinimap ? (
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              className="!bottom-4 !right-4 !h-[92px] !w-[148px] !rounded-sm"
              maskColor="rgb(var(--c-bg) / 0.72)"
              nodeColor={(n) => {
                const t = (n.data as { type?: string })?.type ?? 'company';
                return {
                  company: 'rgb(var(--c-company))',
                  sector: 'rgb(var(--c-sector))',
                  index: 'rgb(var(--c-commodity))',
                  event: 'rgb(var(--c-event))',
                }[t] ?? 'rgb(var(--c-ink-faint))';
              }}
              nodeStrokeWidth={0}
              nodeBorderRadius={1}
            />
          ) : null}
        </ReactFlow>
      </div>

      {/* ── top-left: title + legend ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3.5 sm:p-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="glass flex items-center gap-2.5 border border-line px-2.5 py-1.5">
            <Network size={13} className="text-accent" strokeWidth={1.8} />
            <span className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-soft">
              Economic network
            </span>
            <span className="num border-l border-line pl-2.5 text-2xs tabular-nums text-ink-mute">
              {activeCount} nodes · {edges.length} links
            </span>
          </div>
          {showLegend ? <GraphLegend active={active} onToggle={toggleType} onSolo={soloType} /> : null}
        </div>

        {/* ── top-right: controls ─────────────────────────────────────── */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {queryOpen || q ? (
            <div className="glass flex items-center gap-1.5 border border-line px-2 py-1 animate-rise-in">
              <Search size={12} className="text-ink-mute" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find entity…"
                autoFocus
                className="w-24 bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none sm:w-36"
              />
              {q ? (
                <span className="num border-l border-line pl-1.5 text-2xs tabular-nums text-accent">
                  {matches?.size ?? 0}
                </span>
              ) : null}
              <button
                onClick={() => {
                  setQuery('');
                  setQueryOpen(false);
                }}
                className="text-ink-mute transition-colors hover:text-ink"
                aria-label="Close graph search"
              >
                <X size={12} />
              </button>
            </div>
          ) : null}

          <div className="glass flex items-center gap-0.5 border border-line p-0.5">
            {!locked ? (
              <IconBtn onClick={() => { setQueryOpen(true); searchRef.current?.focus(); }} title="Search graph (/)">
                <Search size={13} />
              </IconBtn>
            ) : null}
            <IconBtn onClick={reset} title="Reset view">
              <RotateCcw size={13} />
            </IconBtn>
            <IconBtn onClick={() => setShowMinimap((s) => !s)} title="Toggle minimap" active={showMinimap}>
              <MapIcon size={13} />
            </IconBtn>
            <IconBtn
              onClick={() => setShowLegend((s) => !s)}
              title={showLegend ? 'Hide layers' : 'Show layers'}
              active={showLegend}
            >
              <LayersIcon size={13} />
            </IconBtn>
            {!locked ? (
              <IconBtn onClick={() => setFull((f) => !f)} title={full ? 'Exit fullscreen' : 'Fullscreen'}>
                {full ? <Minimize2 size={13} /> : <Expand size={13} />}
              </IconBtn>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── bottom-left: depth control ─────────────────────────────────── */}
      {!locked && !full ? (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-5">
          <DepthControl depth={depth} selected={selected} onChange={setDepth} />
        </div>
      ) : null}

      {full ? (
        <button
          onClick={() => setFull(false)}
          className="glass absolute bottom-4 right-4 z-10 flex items-center gap-2 border border-line px-3 py-2 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ink"
        >
          <Minimize2 size={12} /> Exit
        </button>
      ) : null}

      {/* ── detail panel ───────────────────────────────────────────────── */}
      {panelOpen && selected ? (
        <EntityDetail
          id={selected}
          onClose={() => setSelected(null)}
          onSelect={locked ? undefined : setSelected}
          variant={full ? 'overlay' : 'inline'}
        />
      ) : null}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cx(
        'flex h-7 w-7 items-center justify-center transition-colors duration-200',
        active ? 'text-accent' : 'text-ink-mute hover:bg-ink/[0.06] hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function DepthControl({
  depth,
  selected,
  onChange,
}: {
  depth: Depth;
  selected: string | null;
  onChange: (d: Depth) => void;
}) {
  const opts: Array<{ v: Depth; label: string }> = [
    { v: 0, label: 'Sector ring' },
    { v: 1, label: '1 hop' },
    { v: 2, label: '2 hops' },
  ];
  return (
    <div className="glass flex items-center gap-0.5 border border-line p-0.5">
      <span className="hidden items-center gap-1.5 px-2 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint sm:flex">
        <LayersIcon size={11} />
        Scope
      </span>
      {opts.map((o) => {
        const disabled = o.v > 0 && !selected;
        return (
          <button
            key={o.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={cx(
              'flex items-center gap-1 px-2 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] transition-all duration-200',
              disabled && 'pointer-events-none opacity-30',
              depth === o.v
                ? 'bg-accent/12 text-accent'
                : 'text-ink-mute hover:bg-ink/[0.06] hover:text-ink',
            )}
          >
            {o.v === 0 ? <Focus size={11} /> : null}
            <span className="hidden sm:inline">{o.label}</span>
            <span className="sm:hidden">{o.v === 0 ? 'All' : `${o.v}h`}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EconomicGraph(props: EconomicGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}