import { resolvedCanvas, resolvedLabel } from "@/lib/chart/appearance";
import {
  FIGURE_SIZE,
  displayPlateUrl,
  displayViewUrl,
  preloadDisplayPlate,
  preloadDisplayViews,
} from "@/lib/chart/figure-vectors";
import { PLATE, getChartLayout } from "@/lib/chart/geometry";
import { figureScaleForView, fitFigure } from "@/lib/chart/render-figures";
import { useChartStore } from "@/lib/chart/store";
import { useEffect } from "react";

export function BodyFigures() {
  const appearance = useChartStore((s) => s.appearance);
  const visible = useChartStore((s) => s.visible);
  const { views } = getChartLayout(visible);
  const label = resolvedLabel(appearance);
  const style = appearance.figureStyle;
  const background = appearance.background;
  const allFour = visible.anterior && visible.posterior && visible.lateral;

  useEffect(() => {
    preloadDisplayPlate(background, style);
  }, [background, style]);

  useEffect(() => {
    if (!allFour) preloadDisplayViews(background, style);
  }, [allFour, background, style]);

  return (
    <g>
      {allFour ? (
        <image
          href={displayPlateUrl(background, style)}
          x={0}
          y={0}
          width={PLATE.width}
          height={PLATE.height}
          preserveAspectRatio="none"
        />
      ) : null}
      {views.map((view) => {
        const fig = FIGURE_SIZE[view.id];
        const scale = figureScaleForView(view, fig);
        const { ox, oy } = fitFigure(view, fig, scale);
        return (
          <g key={view.id} pointerEvents="none">
            <rect
              x={view.x}
              y={view.y}
              width={view.width}
              height={view.height}
              fill="transparent"
            />
            {allFour ? null : (
              <image
                href={displayViewUrl(background, style, view.id)}
                x={ox}
                y={oy}
                width={fig.w * scale}
                height={fig.h * scale}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            <text
              x={view.x + view.width / 2}
              y={view.y + view.height + 22}
              textAnchor="middle"
              fill={label}
              fontSize={13}
              fontFamily="var(--font-sans)"
              letterSpacing="0.04em"
            >
              {view.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ChartCanvasFrame() {
  const appearance = useChartStore((s) => s.appearance);
  const visible = useChartStore((s) => s.visible);
  const { canvas } = getChartLayout(visible);
  return (
    <>
      <rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        fill={resolvedCanvas(appearance)}
      />
      <BodyFigures />
    </>
  );
}
