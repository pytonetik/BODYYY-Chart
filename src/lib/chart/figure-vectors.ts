import type { CanvasBackground, FigureStyleId } from "./appearance";
import type { ViewId } from "./types";

export type FigureLayer = { o: number; d: string };
export type FigureVector = { w: number; h: number; sil: string; layers: FigureLayer[] };
export type FigureSet = Record<ViewId, FigureVector>;

export const FIGURE_STYLE_IDS = ["glow", "sketch"] as const satisfies readonly FigureStyleId[];

export const FIGURE_SIZE: Record<ViewId, { w: number; h: number }> = {
  anterior: { w: 368, h: 831 },
  posterior: { w: 364, h: 831 },
  left: { w: 154, h: 834 },
  right: { w: 154, h: 832 },
};

const cache = new Map<FigureStyleId, FigureSet>();
const inflight = new Map<FigureStyleId, Promise<FigureSet>>();
const preloaded = new Set<string>();

export function displayPlateUrl(background: CanvasBackground, style: FigureStyleId): string {
  return `/figures/${background}-${style}.webp`;
}

export function displayViewUrl(
  background: CanvasBackground,
  style: FigureStyleId,
  view: ViewId,
): string {
  return `/figures/${background}-${style}-${view}.webp`;
}

function warm(url: string) {
  if (typeof document === "undefined" || preloaded.has(url)) return;
  preloaded.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

export function preloadDisplayPlate(background: CanvasBackground, style: FigureStyleId) {
  warm(displayPlateUrl(background, style));
}

export function preloadDisplayViews(background: CanvasBackground, style: FigureStyleId) {
  for (const view of Object.keys(FIGURE_SIZE) as ViewId[]) {
    warm(displayViewUrl(background, style, view));
  }
}

const printCache = new Map<string, string>();

async function toDataUri(url: string): Promise<string> {
  const hit = printCache.get(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load figure image.");
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  const mime = url.endsWith(".webp") ? "image/webp" : "image/png";
  const uri = `data:${mime};base64,${btoa(bin)}`;
  printCache.set(url, uri);
  return uri;
}

/** Print-only rasters. Do not call on startup. */
export async function loadPrintRasters(
  style: FigureStyleId,
): Promise<{ plate: string; views: Record<ViewId, string> }> {
  const plate = await toDataUri(displayPlateUrl("white", style));
  const views = {} as Record<ViewId, string>;
  for (const view of Object.keys(FIGURE_SIZE) as ViewId[]) {
    views[view] = await toDataUri(displayViewUrl("white", style, view));
  }
  return { plate, views };
}

/** Print-only vector set. Do not call on startup. */
export async function loadFigureStyle(style: FigureStyleId): Promise<FigureSet> {
  const hit = cache.get(style);
  if (hit) return hit;
  const pending = inflight.get(style);
  if (pending) return pending;
  const task = fetch(`/figures/${style}.json`)
    .then((res) => {
      if (!res.ok) throw new Error("Could not load figures.");
      return res.json() as Promise<FigureSet>;
    })
    .then((data) => {
      cache.set(style, data);
      inflight.delete(style);
      return data;
    })
    .catch((err) => {
      inflight.delete(style);
      throw err;
    });
  inflight.set(style, task);
  return task;
}
