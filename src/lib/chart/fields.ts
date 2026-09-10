import { DEFAULT_SHOW, type CalloutShow, type Mark } from "./types";
import { isDest, rankTag } from "./ranks";

export const PATTERNS = [
  "constant",
  "intermittent",
  "episodic",
  "morningPredominant",
  "nightPredominant",
  "activityRelated",
  "restRelated",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export const FLUCTUATIONS = [
  "variable",
  "static",
  "progressive",
  "improving",
  "activityLimited",
] as const;
export type Fluctuation = (typeof FLUCTUATIONS)[number];

export const DEPTHS = ["superficial", "deep"] as const;
export type Depth = (typeof DEPTHS)[number];

export const QUALITIES = [
  "sharp",
  "dull",
  "aching",
  "burning",
  "shooting",
  "throbbing",
  "tight",
  "stabbing",
  "tingling",
] as const;
export type Quality = (typeof QUALITIES)[number];

export const PATTERN_LABEL: Record<Pattern, string> = {
  constant: "Constant",
  intermittent: "Intermittent",
  episodic: "Episodic",
  morningPredominant: "Morning predominant",
  nightPredominant: "Night predominant",
  activityRelated: "Activity-related",
  restRelated: "Rest-related",
};

export const FLUCTUATION_LABEL: Record<Fluctuation, string> = {
  variable: "Variable",
  static: "Static",
  progressive: "Progressive",
  improving: "Improving",
  activityLimited: "Activity-limited",
};

export const DEPTH_LABEL: Record<Depth, string> = {
  superficial: "Superficial",
  deep: "Deep",
};

export const QUALITY_LABEL: Record<Quality, string> = {
  sharp: "Sharp",
  dull: "Dull",
  aching: "Aching",
  burning: "Burning",
  shooting: "Shooting",
  throbbing: "Throbbing",
  tight: "Tight",
  stabbing: "Stabbing",
  tingling: "Tingling",
};

export const SHOW_KEYS = [
  "pattern",
  "fluctuation",
  "quality",
  "depth",
  "b",
  "w",
  "text",
  "rom",
] as const;
export type ShowKey = (typeof SHOW_KEYS)[number];

export const ROM_SIDES = ["L", "R"] as const;
export type RomSide = (typeof ROM_SIDES)[number];

export const ROM_KINDS = ["AROM", "PROM"] as const;
export type RomKind = (typeof ROM_KINDS)[number];

export const ROM_FRACTIONS = ["1/2", "1/3", "1/4", "2/3", "3/4", "4/5"] as const;

export type RomLine = {
  id: string;
  side: RomSide | "";
  joint: string;
  kind: RomKind | "";
  amount: string;
};

export function emptyRomLine(): RomLine {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `rom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return { id, side: "", joint: "", kind: "", amount: "" };
}

export function parseRom(raw: unknown): RomLine[] {
  if (!Array.isArray(raw)) return [];
  const out: RomLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const side = o.side === "L" || o.side === "R" ? o.side : "";
    const kind = o.kind === "AROM" || o.kind === "PROM" ? o.kind : "";
    const joint = typeof o.joint === "string" ? o.joint : "";
    const amount = typeof o.amount === "string" ? o.amount.trim() : "";
    const id = typeof o.id === "string" && o.id ? o.id : emptyRomLine().id;
    if (!side && !joint.trim() && !kind && !amount) continue;
    out.push({ id, side, joint, kind, amount });
  }
  return out;
}

export function formatRomLine(line: RomLine): string {
  return [line.side, line.joint.trim(), line.kind, line.amount.trim()].filter(Boolean).join(" ");
}

export function optionsAz<T extends string>(
  ids: readonly T[],
  labels: Record<T, string>,
): { id: T; label: string }[] {
  return [...ids]
    .map((id) => ({ id, label: labels[id] }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export function parseEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | "" {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

export function parseScore(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.min(10, Math.max(0, Math.round(raw)));
}

export function parseShow(raw: unknown): CalloutShow {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next = { ...DEFAULT_SHOW };
  for (const key of SHOW_KEYS) {
    if (src[key] === false) next[key] = false;
  }
  return next;
}

export function calloutLines(mark: Mark): string[] {
  if (isDest(mark)) return [];
  const c = mark.callout;
  const lines: string[] = [];
  const tag = rankTag(mark);
  if (c.show.pattern && c.pattern) lines.push(PATTERN_LABEL[c.pattern]);
  if (c.show.fluctuation && c.fluctuation) lines.push(FLUCTUATION_LABEL[c.fluctuation]);
  if (c.show.quality && c.quality) lines.push(QUALITY_LABEL[c.quality]);
  if (c.show.depth && c.depth) lines.push(DEPTH_LABEL[c.depth]);
  if (c.show.b && c.b !== null) lines.push(`Pre Rx ${c.b}/10`);
  if (c.show.w && c.w !== null) lines.push(`Post Rx ${c.w}/10`);
  if (c.show.text && mark.label.trim()) lines.push(mark.label.trim());
  if (c.show.rom) {
    for (const line of c.rom ?? []) {
      const text = formatRomLine(line);
      if (text) lines.push(text);
    }
  }
  if (tag && lines.length) lines.unshift(tag);
  return lines;
}
