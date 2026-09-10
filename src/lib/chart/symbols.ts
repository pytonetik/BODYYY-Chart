import type { SymbolId } from "./types";

export type SymbolGroup = "symptoms" | "palpation" | "motion";

export type SymbolDef = {
  id: SymbolId;
  label: string;
  short: string;
  group: SymbolGroup;
  colorVar: string;
};

export const SYMBOLS: SymbolDef[] = [
  { id: "pain", label: "Pain", short: "Pain", group: "symptoms", colorVar: "--color-mark-pain" },
  {
    id: "tenderJoint",
    label: "Tender joint",
    short: "Jt. tender",
    group: "palpation",
    colorVar: "--color-mark-tender-joint",
  },
  {
    id: "tenderness",
    label: "Tenderness",
    short: "Tender",
    group: "palpation",
    colorVar: "--color-mark-tenderness",
  },
  {
    id: "numbness",
    label: "Numbness",
    short: "Numb",
    group: "symptoms",
    colorVar: "--color-mark-numbness",
  },
  {
    id: "paresthesia",
    label: "Paresthesia",
    short: "Paresth.",
    group: "symptoms",
    colorVar: "--color-mark-paresthesia",
  },
  {
    id: "weakness",
    label: "Weakness",
    short: "Weak",
    group: "symptoms",
    colorVar: "--color-mark-weakness",
  },
  {
    id: "triggerPoint",
    label: "Trigger point",
    short: "TrP",
    group: "palpation",
    colorVar: "--color-mark-trigger",
  },
  {
    id: "radiation",
    label: "Radiation",
    short: "Radiates",
    group: "symptoms",
    colorVar: "--color-mark-radiation",
  },
  {
    id: "inflammation",
    label: "Inflammation",
    short: "Inflam.",
    group: "palpation",
    colorVar: "--color-mark-inflammation",
  },
  {
    id: "swelling",
    label: "Swelling",
    short: "Swelling",
    group: "palpation",
    colorVar: "--color-mark-swelling",
  },
  { id: "spasm", label: "Spasm", short: "Spasm", group: "palpation", colorVar: "--color-mark-spasm" },
  {
    id: "adhesion",
    label: "Adhesion",
    short: "Adhesion",
    group: "palpation",
    colorVar: "--color-mark-adhesion",
  },
  {
    id: "friction",
    label: "Friction",
    short: "Friction",
    group: "palpation",
    colorVar: "--color-mark-friction",
  },
  {
    id: "hypomobility",
    label: "Hypomobility",
    short: "Hypo",
    group: "motion",
    colorVar: "--color-mark-hypomobility",
  },
  {
    id: "hypermobility",
    label: "Hypermobility",
    short: "Hyper",
    group: "motion",
    colorVar: "--color-mark-hypermobility",
  },
];

export const SYMBOL_MAP: Record<SymbolId, SymbolDef> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s]),
) as Record<SymbolId, SymbolDef>;

export const GROUPS: { id: SymbolGroup; label: string }[] = [
  { id: "symptoms", label: "Symptoms" },
  { id: "palpation", label: "Palpation" },
  { id: "motion", label: "Motion" },
];

export const MARK_COLOR_HEX: Record<string, string> = {
  "--color-mark-pain": "#e23b2e",
  "--color-mark-tender-joint": "#c41e3a",
  "--color-mark-tenderness": "#e07a2f",
  "--color-mark-numbness": "#3d9b64",
  "--color-mark-paresthesia": "#2b7fdb",
  "--color-mark-weakness": "#3a4a8c",
  "--color-mark-trigger": "#d4a017",
  "--color-mark-radiation": "#5ba3b5",
  "--color-mark-inflammation": "#d4526e",
  "--color-mark-swelling": "#c76b8a",
  "--color-mark-spasm": "#1a9b8e",
  "--color-mark-adhesion": "#c4bfb6",
  "--color-mark-friction": "#b08968",
  "--color-mark-hypomobility": "#8a8880",
  "--color-mark-hypermobility": "#d6d3cd",
};

export const MARK_SWATCHES: { id: string; label: string; color: string }[] = [
  { id: "red", label: "Red", color: "#e23b2e" },
  { id: "orange", label: "Orange", color: "#e07a2f" },
  { id: "gold", label: "Gold", color: "#d4a017" },
  { id: "green", label: "Green", color: "#3d9b64" },
  { id: "blue", label: "Blue", color: "#2b7fdb" },
  { id: "teal", label: "Teal", color: "#1a9b8e" },
  { id: "bone", label: "Bone", color: "#e8e6e1" },
  { id: "ink", label: "Ink", color: "#1c1d20" },
];

export function symbolColor(id: SymbolId): string {
  return `var(${SYMBOL_MAP[id].colorVar})`;
}

export function symbolColorHex(id: SymbolId): string {
  return MARK_COLOR_HEX[SYMBOL_MAP[id].colorVar] ?? "#e8e6e1";
}

export function resolvedMarkColor(mark: { symbol: SymbolId; color: string }): string {
  return mark.color || symbolColor(mark.symbol);
}

export function resolvedMarkColorHex(mark: { symbol: SymbolId; color: string }): string {
  return mark.color || symbolColorHex(mark.symbol);
}
