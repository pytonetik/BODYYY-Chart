export type FigureStyleId = "glow" | "sketch";
export type CanvasBackground = "black" | "white";

export type ChartAppearance = {
  background: CanvasBackground;
  figureStyle: FigureStyleId;
  fillAuto: boolean;
  strokeAuto: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
};

export const CANVAS_HEX: Record<CanvasBackground, string> = {
  black: "#050506",
  white: "#f4f3ef",
};

export const AUTO_FILL: Record<CanvasBackground, string> = {
  black: "#e8e6e1",
  white: "#1c1d20",
};

export const AUTO_STROKE: Record<CanvasBackground, string> = {
  black: "#f2f0ea",
  white: "#111213",
};

export const AUTO_LABEL: Record<CanvasBackground, string> = {
  black: "#9a9891",
  white: "#6a6862",
};

export const FILL_SWATCHES: { id: string; label: string; color: string }[] = [
  { id: "bone", label: "Bone", color: "#e8e6e1" },
  { id: "steel", label: "Steel", color: "#8b919a" },
  { id: "slate", label: "Slate", color: "#4a5560" },
  { id: "ink", label: "Ink", color: "#1c1d20" },
  { id: "paper", label: "Paper", color: "#f7f6f2" },
];

export function defaultAppearance(): ChartAppearance {
  return {
    background: "black",
    figureStyle: "glow",
    fillAuto: true,
    strokeAuto: true,
    fillColor: AUTO_FILL.black,
    strokeColor: AUTO_STROKE.black,
    strokeWidth: 0,

  };
}

export function resolvedFill(a: ChartAppearance): string {
  return a.fillAuto ? AUTO_FILL[a.background] : a.fillColor;
}

export function resolvedStroke(a: ChartAppearance): string {
  return a.strokeAuto ? AUTO_STROKE[a.background] : a.strokeColor;
}

export function resolvedCanvas(a: ChartAppearance): string {
  return CANVAS_HEX[a.background];
}

export function resolvedLabel(a: ChartAppearance): string {
  return AUTO_LABEL[a.background];
}

export function printAppearance(figureStyle: FigureStyleId): ChartAppearance {
  return {
    background: "white",
    figureStyle,
    fillAuto: false,
    strokeAuto: true,
    fillColor: "#1c1d20",
    strokeColor: "#111213",
    strokeWidth: 0,
  };
}

export function parseAppearance(raw: unknown): ChartAppearance {
  const d = defaultAppearance();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const background: CanvasBackground = o.background === "white" ? "white" : "black";
  const figureStyle: FigureStyleId = o.figureStyle === "sketch" ? "sketch" : "glow";
  const fillColor = typeof o.fillColor === "string" && /^#[0-9a-fA-F]{6}$/.test(o.fillColor)
    ? o.fillColor
    : d.fillColor;
  const strokeColor =
    typeof o.strokeColor === "string" && /^#[0-9a-fA-F]{6}$/.test(o.strokeColor)
      ? o.strokeColor
      : d.strokeColor;
  const strokeWidth = Number(o.strokeWidth);
  const width = Number.isFinite(strokeWidth) ? Math.min(8, Math.max(0, strokeWidth)) : d.strokeWidth;
  return {
    background,
    figureStyle,
    fillAuto: o.fillAuto !== false,
    strokeAuto: o.strokeAuto !== false,
    fillColor,
    strokeColor,
    strokeWidth: width === 1.6 ? 0 : width,
  };
}
