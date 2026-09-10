import { emptyCallout, newId, type Mark, type SymbolId } from "./types";

export const RANK_MAX = 6;
export type RankN = 1 | 2 | 3 | 4 | 5 | 6;

export function isRankedSymbol(id: SymbolId): id is "pain" | "numbness" {
  return id === "pain" || id === "numbness";
}

export function parseRank(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > RANK_MAX) return null;
  return n;
}

export function parseId(raw: unknown): string | null {
  return typeof raw === "string" && raw ? raw : null;
}

export function isDest(mark: Mark): boolean {
  return Boolean(mark.pairFrom || mark.radiatingFrom);
}

export function isRadiatingDest(mark: Mark): boolean {
  return Boolean(mark.radiatingFrom);
}

export function rankTag(mark: Pick<Mark, "symbol" | "rank">): string {
  if (!mark.rank || mark.rank < 1 || mark.rank > RANK_MAX) return "";
  if (mark.symbol === "pain") return `P${mark.rank}`;
  if (mark.symbol === "numbness") return `N${mark.rank}`;
  return "";
}

export function usedRanks(marks: Mark[], symbol: SymbolId, exceptSourceId?: string): Set<number> {
  const used = new Set<number>();
  for (const m of marks) {
    if (m.symbol !== symbol || isDest(m)) continue;
    if (exceptSourceId && m.id === exceptSourceId) continue;
    if (m.rank && m.rank >= 1 && m.rank <= RANK_MAX) used.add(m.rank);
  }
  return used;
}

export function nextFreeRank(marks: Mark[], symbol: SymbolId): number | null {
  if (!isRankedSymbol(symbol)) return null;
  const used = usedRanks(marks, symbol);
  for (let i = 1; i <= RANK_MAX; i++) if (!used.has(i)) return i;
  return null;
}

export function resolveSource(marks: Mark[], mark: Mark): Mark {
  const sourceId = mark.pairFrom || mark.radiatingFrom;
  if (!sourceId) return mark;
  return marks.find((m) => m.id === sourceId) ?? mark;
}

export function retagMarks(marks: Mark[], id: string, nextRank: number | null): Mark[] {
  const picked = marks.find((m) => m.id === id);
  if (!picked || !isRankedSymbol(picked.symbol)) return marks;
  const source = resolveSource(marks, picked);
  const oldRank = source.rank ?? null;
  const next = nextRank && nextRank >= 1 && nextRank <= RANK_MAX ? nextRank : null;
  if (oldRank === next) return marks;

  const occupant = next
    ? marks.find(
        (m) =>
          m.symbol === source.symbol &&
          !isDest(m) &&
          m.rank === next &&
          m.id !== source.id,
      )
    : undefined;

  const pairOf = (m: Mark, src: Mark) =>
    m.id === src.id || m.pairFrom === src.id || m.radiatingFrom === src.id;

  return marks.map((m) => {
    if (pairOf(m, source)) return { ...m, rank: next };
    if (occupant && pairOf(m, occupant)) return { ...m, rank: oldRank };
    return m;
  });
}

export function spawnDest(source: Mark, link: "referred" | "radiating"): Mark {
  const toward = link === "radiating" ? -1 : 1;
  const nx = source.nx + toward * 0.16;
  const ny = source.ny + (link === "radiating" ? 0.14 : 0.1);
  return {
    ...source,
    id: newId(),
    nx: Math.min(1.4, Math.max(-0.4, nx)),
    ny: Math.min(1.4, Math.max(-0.4, ny)),
    label: "",
    labelOx: 0,
    labelOy: 0,
    labelPlaced: false,
    labelBorder: "",
    callout: emptyCallout(),
    pairTo: null,
    pairFrom: link === "referred" ? source.id : null,
    radiatingTo: null,
    radiatingFrom: link === "radiating" ? source.id : null,
  };
}

export function setPair(marks: Mark[], id: string, on: boolean): Mark[] {
  const picked = marks.find((m) => m.id === id);
  if (!picked || !isRankedSymbol(picked.symbol)) return marks;
  const source = resolveSource(marks, picked);
  const dest = source.pairTo ? marks.find((m) => m.id === source.pairTo) : undefined;
  if (on) {
    if (dest) return marks;
    const next = spawnDest(source, "referred");
    return marks.map((m) => (m.id === source.id ? { ...m, pairTo: next.id } : m)).concat(next);
  }
  if (!dest && !source.pairTo) return marks;
  return marks
    .filter((m) => m.id !== source.pairTo)
    .map((m) => (m.id === source.id ? { ...m, pairTo: null } : m));
}

export function setRadiatingPair(marks: Mark[], id: string, on: boolean): Mark[] {
  const picked = marks.find((m) => m.id === id);
  if (!picked || picked.symbol !== "pain") return marks;
  const source = resolveSource(marks, picked);
  const dest = source.radiatingTo ? marks.find((m) => m.id === source.radiatingTo) : undefined;
  if (on) {
    if (dest) return marks;
    const next = spawnDest(source, "radiating");
    return marks.map((m) => (m.id === source.id ? { ...m, radiatingTo: next.id } : m)).concat(next);
  }
  if (!dest && !source.radiatingTo) return marks;
  return marks
    .filter((m) => m.id !== source.radiatingTo)
    .map((m) => (m.id === source.id ? { ...m, radiatingTo: null } : m));
}

export function deleteWithPair(marks: Mark[], id: string): Mark[] {
  const m = marks.find((x) => x.id === id);
  if (!m) return marks;
  const drop = new Set<string>([id]);
  if (m.pairTo) drop.add(m.pairTo);
  if (m.radiatingTo) drop.add(m.radiatingTo);
  return marks
    .filter((x) => !drop.has(x.id))
    .map((x) => {
      if (x.pairTo === id) return { ...x, pairTo: null };
      if (x.radiatingTo === id) return { ...x, radiatingTo: null };
      return x;
    });
}

export function migratePainRadiating(marks: Mark[]): Mark[] {
  type Legacy = Mark & { radiating?: boolean };
  const move = new Map<string, string>();
  for (const m of marks as Legacy[]) {
    if (m.symbol === "pain" && m.radiating === true && m.pairTo && !m.radiatingTo) {
      move.set(m.id, m.pairTo);
    }
  }
  return marks.map((m) => {
    const destId = move.get(m.id);
    if (destId) return { ...m, radiatingTo: destId, pairTo: null };
    for (const [srcId, dId] of move) {
      if (m.id === dId) return { ...m, radiatingFrom: srcId, pairFrom: null };
    }
    return {
      ...m,
      radiatingTo: m.radiatingTo ?? null,
      radiatingFrom: m.radiatingFrom ?? null,
    };
  });
}

export type ArrowGeom = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: string;
  stroke: number;
};

export function referralArrow(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
): ArrowGeom | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return null;
  const ux = dx / len;
  const uy = dy / len;
  const gap = Math.max(10, size * 0.48);
  const x1 = from.x + ux * gap;
  const y1 = from.y + uy * gap;
  const x2 = to.x - ux * gap;
  const y2 = to.y - uy * gap;
  const head = Math.max(9, size * 0.32);
  const lx = x2 - ux * head + -uy * head * 0.55;
  const ly = y2 - uy * head + ux * head * 0.55;
  const rx = x2 - ux * head + uy * head * 0.55;
  const ry = y2 - uy * head + -ux * head * 0.55;
  return {
    x1,
    y1,
    x2,
    y2,
    points: `${x2.toFixed(2)},${y2.toFixed(2)} ${lx.toFixed(2)},${ly.toFixed(2)} ${rx.toFixed(2)},${ry.toFixed(2)}`,
    stroke: Math.max(1.6, size * 0.05),
  };
}

export function arrowBoltAt(arrow: ArrowGeom, size: number) {
  const dx = arrow.x2 - arrow.x1;
  const dy = arrow.y2 - arrow.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const gap = Math.max(10, size * 0.28);
  return { x: arrow.x2 + ux * gap, y: arrow.y2 + uy * gap, s: Math.max(10, size * 0.42) };
}

export function lightningPath(s: number) {
  const k = s / 12;
  return `M ${(-1.2 * k).toFixed(2)} ${(-7 * k).toFixed(2)} L ${(2.4 * k).toFixed(2)} ${(-0.6 * k).toFixed(2)} L ${(-0.4 * k).toFixed(2)} ${(-0.6 * k).toFixed(2)} L ${(1.4 * k).toFixed(2)} ${(7 * k).toFixed(2)} L ${(-2.6 * k).toFixed(2)} ${(0.8 * k).toFixed(2)} L ${(0.6 * k).toFixed(2)} ${(0.8 * k).toFixed(2)} Z`;
}
