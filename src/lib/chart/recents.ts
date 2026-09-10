import { SYMBOLS } from "./symbols";
import { SYMBOL_IDS, type SymbolId } from "./types";

export const PAIN_ID: SymbolId = "pain";
export const DEFAULT_SLOT_FILL: SymbolId[] = ["tenderJoint", "triggerPoint", "adhesion"];
export const SLOT_COUNT = 3;
export const SLOT_COUNT_NARROW = 2;

export function parseRecents(raw: unknown): SymbolId[] {
  if (!Array.isArray(raw)) return [];
  const out: SymbolId[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (item === PAIN_ID) continue;
    if (!(SYMBOL_IDS as readonly string[]).includes(item)) continue;
    const id = item as SymbolId;
    if (out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function pushRecent(list: SymbolId[], id: SymbolId): SymbolId[] {
  if (id === PAIN_ID) return list;
  return [id, ...list.filter((x) => x !== id)];
}

export function libraryOrder(recents: SymbolId[]): SymbolId[] {
  const seen = new Set<SymbolId>();
  const out: SymbolId[] = [];
  const add = (id: SymbolId) => {
    if (id === PAIN_ID || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  recents.forEach(add);
  DEFAULT_SLOT_FILL.forEach(add);
  SYMBOLS.forEach((s) => add(s.id));
  return out;
}

export function slotWindow(recents: SymbolId[], offset: number, count = SLOT_COUNT): SymbolId[] {
  const lib = libraryOrder(recents);
  if (lib.length === 0) return [];
  const n = lib.length;
  const take = Math.min(count, n);
  const start = ((offset % n) + n) % n;
  const slots: SymbolId[] = [];
  for (let i = 0; i < take; i++) slots.push(lib[(start + i) % n]!);
  return slots;
}

export function nextOffset(
  recents: SymbolId[],
  offset: number,
  dir: 1 | -1,
  count = SLOT_COUNT,
): number {
  const n = libraryOrder(recents).length;
  if (n <= count) return 0;
  return ((offset + dir * count) % n + n) % n;
}
