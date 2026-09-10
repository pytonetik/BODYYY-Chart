import type { ChartAppearance } from "./appearance";
import type { Depth, Fluctuation, Pattern, Quality, RomLine } from "./fields";

export const VIEW_IDS = ["anterior", "posterior", "left", "right"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export const SYMBOL_IDS = [
  "pain",
  "tenderJoint",
  "tenderness",
  "numbness",
  "paresthesia",
  "weakness",
  "triggerPoint",
  "radiation",
  "inflammation",
  "swelling",
  "spasm",
  "adhesion",
  "friction",
  "hypomobility",
  "hypermobility",
] as const;
export type SymbolId = (typeof SYMBOL_IDS)[number];

export type { Depth, Fluctuation, Pattern, Quality, RomLine };

export type CalloutShow = {
  pattern: boolean;
  fluctuation: boolean;
  quality: boolean;
  depth: boolean;
  b: boolean;
  w: boolean;
  text: boolean;
  rom: boolean;
};

export const DEFAULT_SHOW: CalloutShow = {
  pattern: true,
  fluctuation: true,
  quality: true,
  depth: true,
  b: true,
  w: true,
  text: true,
  rom: true,
};

export type Callout = {
  pattern: Pattern | "";
  fluctuation: Fluctuation | "";
  quality: Quality | "";
  depth: Depth | "";
  b: number | null;
  w: number | null;
  notes: string;
  rom: RomLine[];
  show: CalloutShow;
};

export type Mark = {
  id: string;
  symbol: SymbolId;
  view: ViewId;
  nx: number;
  ny: number;
  size: number;
  color: string;
  label: string;
  labelOx: number;
  labelOy: number;
  labelPlaced: boolean;
  labelBorder: string;
  labelSize: number;
  labelScale: number;
  callout: Callout;
  rank: number | null;
  pairTo: string | null;
  pairFrom: string | null;
  radiatingTo: string | null;
  radiatingFrom: string | null;
};

export const DEFAULT_MARK_SIZE = 45;
export const MIN_MARK_SIZE = 20;
export const MAX_MARK_SIZE = 100;
export const LEGACY_SIZE_FLOOR = 30;
export const DEFAULT_LABEL_SIZE = 12;
export const MIN_LABEL_SIZE = 1;
export const MAX_LABEL_SIZE = 30;
export const DEFAULT_LABEL_SCALE = 0.65;
export const MIN_LABEL_SCALE = 0.1;
export const MAX_LABEL_SCALE = 1;
export const MIN_BOX_SCREEN_H = 36;

export type ChartMeta = {
  patient: string;
  clinician: string;
  date: string;
  notes: string;
};

export type VisibleGroups = {
  anterior: boolean;
  posterior: boolean;
  lateral: boolean;
};

export function defaultVisible(): VisibleGroups {
  return { anterior: true, posterior: true, lateral: true };
}

export type ChartDocument = {
  kind: "bodychart.v1";
  version: 1;
  meta: ChartMeta;
  marks: Mark[];
  appearance?: ChartAppearance;
  recents?: SymbolId[];
  visible?: VisibleGroups;
};

export type Transform = {
  scale: number;
  x: number;
  y: number;
};

export function emptyCallout(): Callout {
  return {
    pattern: "",
    fluctuation: "",
    quality: "",
    depth: "",
    b: null,
    w: null,
    notes: "",
    rom: [],
    show: { ...DEFAULT_SHOW },
  };
}

export const EMPTY_CALLOUT: Callout = emptyCallout();

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyMeta(): ChartMeta {
  return {
    patient: "",
    clinician: "",
    date: todayIsoDate(),
    notes: "",
  };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function markHasCallout(mark: Mark): boolean {
  const c = mark.callout;
  return Boolean(
    c.pattern ||
      c.fluctuation ||
      c.quality ||
      c.depth ||
      c.b !== null ||
      c.w !== null ||
      c.notes.trim() ||
      (c.rom ?? []).some((r) => r.side || r.joint.trim() || r.kind || r.amount.trim()) ||
      mark.label.trim(),
  );
}

export function clampMarkSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MARK_SIZE;
  return Math.min(MAX_MARK_SIZE, Math.max(MIN_MARK_SIZE, n));
}

export function migrateMarkSize(n: number): number {
  if (!Number.isFinite(n) || n < LEGACY_SIZE_FLOOR) return DEFAULT_MARK_SIZE;
  return clampMarkSize(n);
}

export function clampLabelSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LABEL_SIZE;
  return Math.min(MAX_LABEL_SIZE, Math.max(MIN_LABEL_SIZE, n));
}

export function clampLabelScale(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LABEL_SCALE;
  return Math.min(MAX_LABEL_SCALE, Math.max(MIN_LABEL_SCALE, n));
}

export function parseMarkColor(raw: unknown): string {
  return typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "";
}

export function parseVisible(raw: unknown): VisibleGroups {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next = defaultVisible();
  if (src.anterior === false) next.anterior = false;
  if (src.posterior === false) next.posterior = false;
  if (src.lateral === false) next.lateral = false;
  if (!next.anterior && !next.posterior && !next.lateral) return defaultVisible();
  return next;
}
