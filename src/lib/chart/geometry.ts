import { VIEW_IDS, defaultVisible, type ViewId, type VisibleGroups } from "./types";

export type Pt = { x: number; y: number };

export type ViewBox = {
  id: ViewId;
  label: string;
  short: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const FIGURE_H = 760;
export const VIEW_GAP = 36;
export const LABEL_H = 32;
export const SIDE_FRAC = 0.22;
export const VERT_FRAC = 0.16;

export const VIEW_ASPECT: Record<ViewId, number> = {
  anterior: 368 / 831,
  posterior: 364 / 831,
  left: 154 / 834,
  right: 154 / 832,
};

const VIEW_META: Record<ViewId, { label: string; short: string }> = {
  anterior: { label: "Anterior", short: "Ant." },
  posterior: { label: "Posterior", short: "Post." },
  left: { label: "Left lateral", short: "L lat." },
  right: { label: "Right lateral", short: "R lat." },
};

export function viewWidthForHeight(id: ViewId, height: number): number {
  return height * VIEW_ASPECT[id];
}

export function visibleViewIds(visible: VisibleGroups): ViewId[] {
  const ids: ViewId[] = [];
  if (visible.anterior) ids.push("anterior");
  if (visible.posterior) ids.push("posterior");
  if (visible.lateral) {
    ids.push("left");
    ids.push("right");
  }
  return ids;
}

function packRow(ids: ViewId[], x0: number, y: number, height: number, gap: number): ViewBox[] {
  let x = x0;
  return ids.map((id) => {
    const width = viewWidthForHeight(id, height);
    const box: ViewBox = {
      id,
      label: VIEW_META[id].label,
      short: VIEW_META[id].short,
      x,
      y,
      width,
      height,
    };
    x += width + gap;
    return box;
  });
}

export function packCentered(
  ids: ViewId[],
  innerW: number,
  padX: number,
  y: number,
  maxH: number,
  gap: number,
): ViewBox[] {
  if (ids.length === 0) return [];
  const aspectSum = ids.reduce((s, id) => s + VIEW_ASPECT[id], 0);
  const hFromW = (innerW - gap * (ids.length - 1)) / aspectSum;
  const h = Math.max(80, Math.min(maxH, hFromW));
  const rowW = aspectSum * h + gap * (ids.length - 1);
  return packRow(ids, padX + Math.max(0, innerW - rowW) / 2, y, h, gap);
}

const ROW_W =
  VIEW_IDS.reduce((sum, id) => sum + viewWidthForHeight(id, FIGURE_H), 0) + VIEW_GAP * (VIEW_IDS.length - 1);
const CONTENT_H = FIGURE_H + LABEL_H;

export const PLATE = {
  width: ROW_W / (1 - 2 * SIDE_FRAC),
  height: CONTENT_H / (1 - 2 * VERT_FRAC),
};

export const PLATE_PAD_X = PLATE.width * SIDE_FRAC;
export const PLATE_PAD_Y = PLATE.height * VERT_FRAC;

export type LayoutMode = "row";

/** Locked 4-across plate on every device. Letterbox; do not stack. */
export function getChartLayout(
  visible: VisibleGroups = defaultVisible(),
): { views: ViewBox[]; canvas: { width: number; height: number } } {
  const canvas = { width: PLATE.width, height: PLATE.height };
  const ids = visibleViewIds(visible);
  if (ids.length === 0) return { views: [], canvas };
  const views = packCentered(
    ids,
    canvas.width - PLATE_PAD_X * 2,
    PLATE_PAD_X,
    PLATE_PAD_Y,
    FIGURE_H,
    VIEW_GAP,
  );
  return { views, canvas };
}

export const VIEWS: ViewBox[] = getChartLayout().views;
export const CANVAS = PLATE;

export function viewInLayout(views: ViewBox[], id: ViewId): ViewBox | undefined {
  return views.find((v) => v.id === id);
}

export function viewLabel(id: ViewId): string {
  return VIEW_META[id].label;
}

export function hitViewIn(views: ViewBox[], x: number, y: number): ViewBox | null {
  for (const v of views) {
    if (x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height) {
      return v;
    }
  }
  return null;
}

export function nearestView(views: ViewBox[], x: number, y: number): ViewBox | null {
  if (views.length === 0) return null;
  let best = views[0]!;
  let bestD = Infinity;
  for (const v of views) {
    const dx = x < v.x ? v.x - x : x > v.x + v.width ? x - (v.x + v.width) : 0;
    const dy = y < v.y ? v.y - y : y > v.y + v.height ? y - (v.y + v.height) : 0;
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function dropView(views: ViewBox[], x: number, y: number): ViewBox | null {
  return hitViewIn(views, x, y) ?? nearestView(views, x, y);
}

export function markCanvasPos(view: ViewBox, nx: number, ny: number): Pt {
  return {
    x: view.x + nx * view.width,
    y: view.y + ny * view.height,
  };
}

export function canvasToMark(view: ViewBox, x: number, y: number): Pt {
  return {
    x: (x - view.x) / view.width,
    y: (y - view.y) / view.height,
  };
}

export function fitTransform(): { scale: number; x: number; y: number } {
  return { scale: 1, x: 0, y: 0 };
}

export function meetScale(
  svg: SVGSVGElement,
  canvas: { width: number; height: number },
): number {
  const r = svg.getBoundingClientRect();
  return Math.min(r.width / canvas.width, r.height / canvas.height) || 1;
}

export function canvasUnitsPerCssPx(
  svg: SVGSVGElement,
  canvas: { width: number; height: number },
  zoom: number,
): number {
  const px = meetScale(svg, canvas) * Math.max(0.05, zoom);
  return px > 0 ? 1 / px : 1;
}
