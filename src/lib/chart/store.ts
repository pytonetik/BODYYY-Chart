import { create } from "zustand";
import {
  defaultAppearance,
  parseAppearance,
  type ChartAppearance,
} from "./appearance";
import {
  DEFAULT_LABEL_SIZE,
  DEFAULT_LABEL_SCALE,
  DEFAULT_MARK_SIZE,
  clampLabelScale,
  clampLabelSize,
  defaultVisible,
  emptyCallout,
  emptyMeta,
  migrateMarkSize,
  newId,
  parseVisible,
  type Callout,
  type CalloutShow,
  type ChartDocument,
  type ChartMeta,
  type Mark,
  type SymbolId,
  type Transform,
  type ViewId,
  type VisibleGroups,
} from "./types";
import { parseShow } from "./fields";
import { parseRecents, pushRecent } from "./recents";
import { deleteWithPair, migratePainRadiating, nextFreeRank, retagMarks, setPair, setRadiatingPair } from "./ranks";
import type { LayoutMode } from "./geometry";

type Snapshot = {
  marks: Mark[];
  visible: VisibleGroups;
};

type ChartState = {
  meta: ChartMeta;
  marks: Mark[];
  appearance: ChartAppearance;
  selectedId: string | null;
  activeSymbol: SymbolId | null;
  transform: Transform;
  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;
  fileName: string | null;
  inspectorOpen: boolean;
  hydrated: boolean;
  layoutMode: LayoutMode;
  recents: SymbolId[];
  slotOffset: number;
  visible: VisibleGroups;
  viewport: { width: number; height: number };
  chartPane: "recent" | "previous" | "compare";
  previousDoc: ChartDocument | null;
  previousFileName: string | null;
  previousTransform: Transform;

  setMeta: (patch: Partial<ChartMeta>) => void;
  setAppearance: (patch: Partial<ChartAppearance>) => void;
  setActiveSymbol: (id: SymbolId | null) => void;
  setTransform: (t: Transform) => void;
  selectMark: (id: string | null) => void;
  addMark: (view: ViewId, nx: number, ny: number) => void;
  moveMark: (id: string, nx: number, ny: number, view?: ViewId, ox?: number, oy?: number) => void;
  moveLabel: (id: string, ox: number, oy: number) => void;
  commitMoveFrom: (previous: Mark[]) => void;
  updateCallout: (id: string, patch: Partial<Omit<Callout, "show">> & { show?: Partial<CalloutShow> }) => void;
  updateMark: (
    id: string,
    patch: Partial<Pick<Mark, "size" | "color" | "label" | "labelBorder" | "labelSize" | "labelScale">>,
  ) => void;
  setRank: (id: string, rank: number | null) => void;
  setLinked: (id: string, on: boolean) => void;
  setRadiating: (id: string, on: boolean) => void;
  deleteMark: (id: string) => void;
  deleteSelected: () => void;
  clearMarks: () => void;
  undo: () => void;
  redo: () => void;
  newChart: () => void;
  loadDocument: (doc: ChartDocument, fileName?: string) => void;
  toDocument: () => ChartDocument;
  setInspectorOpen: (open: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  markSaved: (fileName?: string) => void;
  hydrate: () => void;
  promoteRecent: (id: SymbolId) => void;
  setSlotOffset: (offset: number) => void;
  setVisible: (patch: Partial<VisibleGroups>) => void;
  setViewport: (size: { width: number; height: number }) => void;
  fitView: () => void;
  setChartPane: (pane: "recent" | "previous" | "compare") => void;
  loadPrevious: (doc: ChartDocument, fileName?: string) => void;
  clearPrevious: () => void;
  setPreviousTransform: (t: Transform) => void;
};

const MAX_HISTORY = 80;
export const STORAGE_KEY = "bodychart.current.v1";

function cloneMarks(marks: Mark[]): Mark[] {
  return marks.map((m) => ({
    ...m,
    callout: {
      ...m.callout,
      show: { ...m.callout.show },
      rom: (m.callout.rom ?? []).map((r) => ({ ...r })),
    },
  }));
}

function snapOf(s: { marks: Mark[]; visible: VisibleGroups }): Snapshot {
  return { marks: cloneMarks(s.marks), visible: { ...s.visible } };
}

function pushPast(s: ChartState) {
  return {
    past: [...s.past, snapOf(s)].slice(-MAX_HISTORY),
    future: [] as Snapshot[],
  };
}

function normalizeMark(m: Mark): Mark {
  const legacy = m as Mark & { radiating?: boolean };
  return {
    ...m,
    size: migrateMarkSize(m.size),
    color: m.color || "",
    label: m.label || "",
    labelOx: Number.isFinite(m.labelOx) ? m.labelOx : 0,
    labelOy: Number.isFinite(m.labelOy) ? m.labelOy : 0,
    labelPlaced: Boolean(m.labelPlaced),
    labelBorder: m.labelBorder || "",
    labelSize: clampLabelSize(m.labelSize),
    labelScale: clampLabelScale(m.labelScale),
    rank: Number.isInteger(m.rank) && (m.rank as number) >= 1 && (m.rank as number) <= 6 ? m.rank : null,
    pairTo: m.pairTo || null,
    pairFrom: m.pairFrom || null,
    radiatingTo: m.radiatingTo || null,
    radiatingFrom: m.radiatingFrom || null,
    callout: {
      ...emptyCallout(),
      ...m.callout,
      rom: Array.isArray(m.callout?.rom) ? m.callout.rom.map((r) => ({ ...r })) : [],
      show: parseShow(m.callout?.show),
    },
    ...(legacy.radiating === true ? { radiating: true } : {}),
  } as Mark;
}

function persist(state: ChartState) {
  if (typeof window === "undefined") return;
  try {
    const doc: ChartDocument = {
      kind: "bodychart.v1",
      version: 1,
      meta: state.meta,
      marks: state.marks,
      appearance: state.appearance,
      recents: state.recents,
      visible: state.visible,
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ doc, fileName: state.fileName, dirty: state.dirty }),
    );
  } catch {
    /* ignore */
  }
}

export function readPersisted(): {
  doc: ChartDocument;
  fileName: string | null;
  dirty: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      doc?: ChartDocument;
      fileName?: string | null;
      dirty?: boolean;
    };
    if (parsed.doc?.kind !== "bodychart.v1") return null;
    return {
      doc: parsed.doc,
      fileName: parsed.fileName ?? null,
      dirty: Boolean(parsed.dirty),
    };
  } catch {
    return null;
  }
}

export const useChartStore = create<ChartState>((set, get) => ({
  meta: emptyMeta(),
  marks: [],
  appearance: defaultAppearance(),
  selectedId: null,
  activeSymbol: "pain",
  transform: { scale: 1, x: 0, y: 0 },
  past: [],
  future: [],
  dirty: false,
  fileName: null,
  inspectorOpen: false,
  hydrated: false,
  layoutMode: "row",
  recents: [],
  slotOffset: 0,
  visible: defaultVisible(),
  viewport: { width: 0, height: 0 },
  chartPane: "recent",
  previousDoc: null,
  previousFileName: null,
  previousTransform: { scale: 1, x: 0, y: 0 },

  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersisted();
    if (!persisted) {
      set({ hydrated: true });
      return;
    }
    set({
      meta: { ...emptyMeta(), ...persisted.doc.meta },
      marks: cloneMarks(migratePainRadiating((persisted.doc.marks ?? []).map(normalizeMark))),
      appearance: parseAppearance(persisted.doc.appearance),
      recents: parseRecents(persisted.doc.recents),
      visible: parseVisible(persisted.doc.visible),
      slotOffset: 0,
      dirty: persisted.dirty,
      fileName: persisted.fileName,
      hydrated: true,
    });
  },

  setMeta: (patch) => {
    set({ meta: { ...get().meta, ...patch }, dirty: true });
    persist(get());
  },

  setAppearance: (patch) => {
    set({ appearance: { ...get().appearance, ...patch }, dirty: true });
    persist(get());
  },

  setActiveSymbol: (id) => set({ activeSymbol: id, selectedId: id ? null : get().selectedId }),

  setTransform: (t) => set({ transform: t }),

  selectMark: (id) =>
    set({
      selectedId: id,
      activeSymbol: id ? null : get().activeSymbol,
    }),

  addMark: (view, nx, ny) => {
    const s = get();
    const symbol = s.activeSymbol;
    if (!symbol) return;
    const mark: Mark = {
      id: newId(),
      symbol,
      view,
      nx,
      ny,
      size: DEFAULT_MARK_SIZE,
      color: "",
      label: "",
      labelOx: 0,
      labelOy: 0,
      labelPlaced: false,
      labelBorder: "",
      labelSize: DEFAULT_LABEL_SIZE,
      labelScale: DEFAULT_LABEL_SCALE,
      rank: nextFreeRank(s.marks, symbol),
      pairTo: null,
      pairFrom: null,
      radiatingTo: null,
      radiatingFrom: null,
      callout: emptyCallout(),
    };
    set({
      ...pushPast(s),
      marks: [...s.marks, mark],
      selectedId: null,
      recents: pushRecent(s.recents, symbol),
      slotOffset: 0,
      dirty: true,
    });
    persist(get());
  },

  moveMark: (id, nx, ny, view, ox, oy) => {
    set({
      marks: get().marks.map((m) =>
        m.id === id
          ? {
              ...m,
              nx,
              ny,
              view: view ?? m.view,
              labelOx: ox ?? m.labelOx,
              labelOy: oy ?? m.labelOy,
            }
          : m,
      ),
      dirty: true,
    });
  },

  moveLabel: (id, ox, oy) => {
    set({
      marks: get().marks.map((m) =>
        m.id === id ? { ...m, labelOx: ox, labelOy: oy, labelPlaced: true } : m,
      ),
      dirty: true,
    });
  },

  commitMoveFrom: (previous) => {
    const s = get();
    set({
      past: [...s.past, { marks: cloneMarks(previous), visible: { ...s.visible } }].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
    persist(get());
  },

  updateCallout: (id, patch) => {
    set({
      marks: get().marks.map((m) => {
        if (m.id !== id) return m;
        const show = patch.show ? { ...m.callout.show, ...patch.show } : m.callout.show;
        const { show: _ignore, ...rest } = patch;
        return { ...m, callout: { ...m.callout, ...rest, show } };
      }),
      dirty: true,
    });
    persist(get());
  },

  updateMark: (id, patch) => {
    set({
      marks: get().marks.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      dirty: true,
    });
    persist(get());
  },

  setRank: (id, rank) => {
    const s = get();
    const next = retagMarks(s.marks, id, rank);
    if (next === s.marks) return;
    set({
      ...pushPast(s),
      marks: next,
      dirty: true,
    });
    persist(get());
  },

  setLinked: (id, on) => {
    const s = get();
    const next = setPair(s.marks, id, on);
    if (next === s.marks) return;
    set({
      ...pushPast(s),
      marks: next,
      dirty: true,
    });
    persist(get());
  },

  setRadiating: (id, on) => {
    const s = get();
    const next = setRadiatingPair(s.marks, id, on);
    if (next === s.marks) return;
    set({
      ...pushPast(s),
      marks: next,
      dirty: true,
    });
    persist(get());
  },

  deleteMark: (id) => {
    const s = get();
    set({
      ...pushPast(s),
      marks: deleteWithPair(s.marks, id),
      selectedId:
        s.selectedId === id ||
        s.marks.some(
          (m) =>
            m.id === s.selectedId &&
            (m.pairFrom === id ||
              m.pairTo === id ||
              m.radiatingFrom === id ||
              m.radiatingTo === id),
        )
          ? null
          : s.selectedId,
      dirty: true,
    });
    persist(get());
  },

  deleteSelected: () => {
    const id = get().selectedId;
    if (id) get().deleteMark(id);
  },

  clearMarks: () => {
    const s = get();
    if (s.marks.length === 0) return;
    set({
      ...pushPast(s),
      marks: [],
      selectedId: null,
      dirty: true,
    });
    persist(get());
  },

  undo: () => {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    set({
      past: s.past.slice(0, -1),
      future: [...s.future, snapOf(s)],
      marks: cloneMarks(prev.marks),
      visible: prev.visible ? { ...prev.visible } : s.visible,
      selectedId: null,
      dirty: true,
    });
    persist(get());
  },

  redo: () => {
    const s = get();
    const next = s.future[s.future.length - 1];
    if (!next) return;
    set({
      past: [...s.past, snapOf(s)].slice(-MAX_HISTORY),
      future: s.future.slice(0, -1),
      marks: cloneMarks(next.marks),
      visible: next.visible ? { ...next.visible } : s.visible,
      selectedId: null,
      dirty: true,
    });
    persist(get());
  },

  newChart: () => {
    set({
      meta: emptyMeta(),
      marks: [],
      selectedId: null,
      activeSymbol: "pain",
      past: [],
      future: [],
      dirty: false,
      fileName: null,
      inspectorOpen: false,
      recents: [],
      slotOffset: 0,
      visible: defaultVisible(),
      transform: { scale: 1, x: 0, y: 0 },
    });
    persist(get());
  },

  loadDocument: (doc, fileName) => {
    set({
      meta: { ...emptyMeta(), ...doc.meta },
      marks: cloneMarks(migratePainRadiating((doc.marks ?? []).map(normalizeMark))),
      appearance: doc.appearance ? parseAppearance(doc.appearance) : get().appearance,
      recents: parseRecents(doc.recents),
      visible: parseVisible(doc.visible),
      slotOffset: 0,
      selectedId: null,
      past: [],
      future: [],
      dirty: false,
      fileName: fileName ?? null,
      inspectorOpen: false,
    });
    persist(get());
  },

  toDocument: () => ({
    kind: "bodychart.v1",
    version: 1,
    meta: { ...get().meta },
    marks: cloneMarks(get().marks),
    appearance: { ...get().appearance },
    recents: [...get().recents],
    visible: { ...get().visible },
  }),

  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  setLayoutMode: (mode) => {
    if (get().layoutMode === mode) return;
    set({ layoutMode: mode, transform: { scale: 1, x: 0, y: 0 } });
  },

  markSaved: (fileName) => {
    set({ dirty: false, fileName: fileName ?? get().fileName });
    persist(get());
  },

  promoteRecent: (id) => {
    set({ recents: pushRecent(get().recents, id), slotOffset: 0 });
    persist(get());
  },

  setSlotOffset: (offset) => set({ slotOffset: offset }),

  setVisible: (patch) => {
    const s = get();
    const next = { ...s.visible, ...patch };
    if (!next.anterior && !next.posterior && !next.lateral) return;
    if (
      next.anterior === s.visible.anterior &&
      next.posterior === s.visible.posterior &&
      next.lateral === s.visible.lateral
    ) {
      return;
    }
    set({
      ...pushPast(s),
      visible: next,
      transform: { scale: 1, x: 0, y: 0 },
      previousTransform: { scale: 1, x: 0, y: 0 },
      dirty: true,
    });
    persist(get());
  },

  setViewport: (size) => {
    const cur = get().viewport;
    if (Math.abs(cur.width - size.width) < 1 && Math.abs(cur.height - size.height) < 1) return;
    set({ viewport: size });
  },

  fitView: () =>
    set({ transform: { scale: 1, x: 0, y: 0 }, previousTransform: { scale: 1, x: 0, y: 0 } }),

  setChartPane: (pane) => set({ chartPane: pane, selectedId: pane === "previous" ? null : get().selectedId }),

  loadPrevious: (doc, fileName) =>
    set({
      previousDoc: {
        ...doc,
        marks: cloneMarks(migratePainRadiating((doc.marks ?? []).map(normalizeMark))),
      },
      previousFileName: fileName ?? null,
      previousTransform: { scale: 1, x: 0, y: 0 },
    }),

  clearPrevious: () =>
    set({
      previousDoc: null,
      previousFileName: null,
      previousTransform: { scale: 1, x: 0, y: 0 },
      chartPane: get().chartPane === "previous" ? "recent" : get().chartPane,
    }),

  setPreviousTransform: (t) => set({ previousTransform: t }),
}));
