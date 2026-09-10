import { calloutLines } from "./fields";
import { resolvedMarkColor, resolvedMarkColorHex } from "./symbols";
import {
  DEFAULT_LABEL_SCALE,
  DEFAULT_LABEL_SIZE,
  DEFAULT_MARK_SIZE,
  MAX_LABEL_SCALE,
  MIN_LABEL_SCALE,
  MIN_LABEL_SIZE,
  clampLabelScale,
  type Mark,
} from "./types";
import type { ViewBox } from "./geometry";
import type { CanvasBackground } from "./appearance";
import { FONT_BODY, FONT_RANK, chartFontCss, isRankLine } from "./chart-font";

export const HIT_PAD_PX = 24;
export const HANDLE_SCREEN = 14;
const TEXT_PAD = 8;
const CHAR_FALLBACK = 0.5;
export const LABEL_VIEW_MIN = -0.4;
export const LABEL_VIEW_MAX = 1.4;

export type CalloutMetrics = {
  fitPerPx: number;
  zoomPerPx: number;
  chartZoom: number;
  viewportW: number;
  isNarrow: boolean;
  print?: boolean;
};

export type LabelBoxLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  handle: number;
  fontSize: number;
  pad: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lines: string[];
  hasLeader: boolean;
  stroke: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function labelFontSizePx(mark: Mark, _isNarrow?: boolean): number {
  if (Number.isFinite(mark.labelSize) && mark.labelSize >= MIN_LABEL_SIZE) return mark.labelSize;
  return DEFAULT_LABEL_SIZE;
}

export function boxScaleFor(mark: Mark): number {
  return clampLabelScale(mark.labelScale ?? DEFAULT_LABEL_SCALE);
}

export function clampResizeScale(next: number): number {
  return clamp(next, MIN_LABEL_SCALE, MAX_LABEL_SCALE);
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  try {
    const c = document.createElement("canvas");
    measureCtx = c.getContext("2d");
  } catch {
    measureCtx = null;
  }
  return measureCtx;
}

function longestLineWidthPx(lines: string[], fontPx: number): number {
  const ctx = typeof document !== "undefined" ? getMeasureCtx() : null;
  if (ctx) {
    (ctx as CanvasRenderingContext2D & { fontVariantNumeric?: string }).fontVariantNumeric =
      "tabular-nums lining-nums";
    let w = 0;
    for (const s of lines) {
      ctx.font = chartFontCss(isRankLine(s) ? FONT_RANK : FONT_BODY, fontPx);
      w = Math.max(w, ctx.measureText(s).width);
    }
    return w;
  }
  const longest = lines.reduce((n, s) => Math.max(n, s.length), 0);
  return longest * fontPx * CHAR_FALLBACK;
}

export function measureCallout(
  lines: string[],
  fontPx: number,
  metrics: CalloutMetrics,
  scale: number,
): { w: number; h: number; fontSize: number; pad: number; stroke: number; handle: number } {
  const k = metrics.print ? (300 / 72) * scale : metrics.fitPerPx * scale;
  const fontSize = fontPx * k;
  const pad = TEXT_PAD * k;
  const textW = longestLineWidthPx(lines, fontPx) * k;
  const lineCount = Math.max(1, lines.length);
  const lineH = fontSize * (metrics.print ? 1.32 : 1.35);
  return {
    w: pad + textW + pad,
    h: pad + lineCount * lineH + pad,
    fontSize,
    pad,
    stroke: metrics.print ? 2 * scale : 1.2 * k,
    handle: metrics.print ? 0 : HANDLE_SCREEN * metrics.zoomPerPx,
  };
}

export function resolvedLabelBorder(mark: Mark, background: CanvasBackground = "black"): string {
  if (mark.labelBorder) return mark.labelBorder;
  return background === "white" ? "#1c1d20" : resolvedMarkColor(mark);
}

export function resolvedLabelBorderHex(mark: Mark, background: CanvasBackground = "black"): string {
  if (mark.labelBorder) return mark.labelBorder;
  return background === "white" ? "#1c1d20" : resolvedMarkColorHex(mark);
}

export function labelBoxLayout(
  mark: Mark,
  view: ViewBox,
  pinX: number,
  pinY: number,
  canvas: { width: number; height: number },
  metrics: CalloutMetrics,
): LabelBoxLayout | null {
  const lines = calloutLines(mark);
  if (lines.length === 0) return null;
  const fontPx = metrics.print ? 11 : labelFontSizePx(mark);
  const scale = boxScaleFor(mark);
  const { w, h, fontSize, pad, stroke, handle } = measureCallout(lines, fontPx, metrics, scale);
  const size = mark.size || DEFAULT_MARK_SIZE;
  const edge = pad;
  let x: number;
  let y: number;
  if (mark.labelPlaced) {
    x = pinX + mark.labelOx * view.width - w / 2;
    y = pinY + mark.labelOy * view.height - h / 2;
  } else {
    x = pinX - w / 2;
    y = view.y - h - pad;
  }
  x = clamp(x, edge, canvas.width - w - edge);
  y = clamp(y, edge, canvas.height - h - edge);

  let endX = clamp(pinX, x, x + w);
  let endY = clamp(pinY, y, y + h);
  if (pinX >= x && pinX <= x + w && pinY >= y && pinY <= y + h) {
    const dL = pinX - x;
    const dR = x + w - pinX;
    const dT = pinY - y;
    const dB = y + h - pinY;
    const min = Math.min(dL, dR, dT, dB);
    if (min === dL) endX = x;
    else if (min === dR) endX = x + w;
    else if (min === dT) endY = y;
    else endY = y + h;
  }

  const dx = endX - pinX;
  const dy = endY - pinY;
  const len = Math.hypot(dx, dy) || 1;
  const gap = size * 0.52;
  const startX = pinX + (dx / len) * gap;
  const startY = pinY + (dy / len) * gap;
  const hasLeader = len > gap + 4;

  return { x, y, w, h, handle, fontSize, pad, startX, startY, endX, endY, lines, hasLeader, stroke };
}

export function pointInLabelBox(
  px: number,
  py: number,
  box: LabelBoxLayout,
  pad: number,
): boolean {
  return px >= box.x - pad && px <= box.x + box.w + pad && py >= box.y - pad && py <= box.y + box.h + pad;
}

export function pointInResizeHandle(
  px: number,
  py: number,
  box: LabelBoxLayout,
): boolean {
  const hs = Math.max(box.handle, 8);
  const cx = box.x + box.w;
  const cy = box.y + box.h;
  return px >= cx - hs && px <= cx + hs * 0.4 && py >= cy - hs && py <= cy + hs * 0.4;
}

export function labelFill(background: "black" | "white"): string {
  return background === "white" ? "#ffffff" : "#121315";
}

export function labelTextFill(background: "black" | "white"): string {
  return background === "white" ? "#1c1d20" : "#f4f1ea";
}

export function lineOffsetY(index: number, fontSize: number, pad: number): number {
  return pad + fontSize * 0.9 + index * fontSize * 1.35;
}
