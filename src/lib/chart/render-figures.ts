import {
  resolvedLabel,
  type ChartAppearance,
} from "./appearance";
import { FIGURE_SIZE } from "./figure-vectors";
import { PLATE, type ViewBox } from "./geometry";

const FIGURE_PAD = 8;

export function figureScaleForView(view: ViewBox, fig: { w: number; h: number }): number {
  return Math.max(0.01, (view.height - FIGURE_PAD * 2) / fig.h);
}

export function fitFigure(view: ViewBox, fig: { w: number; h: number }, scale: number) {
  const dw = fig.w * scale;
  const dh = fig.h * scale;
  return {
    scale,
    ox: view.x + (view.width - dw) / 2,
    oy: view.y + (view.height - dh) / 2,
  };
}

export function figuresMarkup(
  appearance: ChartAppearance,
  views: ViewBox[],
  rasters: { plate: string; views: Record<string, string> },
): string {
  const label = resolvedLabel(appearance);
  const allFour = views.length === 4;
  const plate = allFour
    ? `<image href="${rasters.plate}" x="0" y="0" width="${PLATE.width}" height="${PLATE.height}" preserveAspectRatio="none"/>`
    : "";
  const figs = views
    .map((view) => {
      const fig = FIGURE_SIZE[view.id];
      const scale = figureScaleForView(view, fig);
      const { ox, oy } = fitFigure(view, fig, scale);
      const img = allFour
        ? ""
        : `<image href="${rasters.views[view.id]}" x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${(fig.w * scale).toFixed(2)}" height="${(fig.h * scale).toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`;
      const lx = view.x + view.width / 2;
      const ly = view.y + view.height + 22;
      return `<g pointer-events="none">${img}<text x="${lx}" y="${ly}" text-anchor="middle" fill="${label}" font-size="13" font-family="IBM Plex Sans" letter-spacing="0.04em">${view.label}</text></g>`;
    })
    .join("\n");
  return `${plate}\n${figs}`;
}