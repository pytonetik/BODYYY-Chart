import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ChartCanvasFrame } from "./body-figures";
import { SymbolGlyph } from "./symbol-glyph";
import { resolvedCanvas } from "@/lib/chart/appearance";
import {
  dropView,
  getChartLayout,
  hitViewIn,
  markCanvasPos,
  meetScale,
  viewInLayout,
} from "@/lib/chart/geometry";
import {
  HIT_PAD_PX,
  LABEL_VIEW_MAX,
  LABEL_VIEW_MIN,
  clampResizeScale,
  labelBoxLayout,
  labelFill,
  labelTextFill,
  lineOffsetY,
  pointInLabelBox,
  pointInResizeHandle,
  resolvedLabelBorder,
  type CalloutMetrics,
} from "@/lib/chart/label-box";
import { FONT_BODY, FONT_RANK, isRankLine } from "@/lib/chart/chart-font";
import { resolvedMarkColor } from "@/lib/chart/symbols";
import { useChartStore } from "@/lib/chart/store";
import { isRadiatingDest, lightningPath, rankTag, referralArrow } from "@/lib/chart/ranks";
import { DEFAULT_MARK_SIZE, type Mark } from "@/lib/chart/types";
import { useNarrow } from "./use-narrow";

const MIN_SCALE = 0.55;
const MAX_SCALE = 6;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function cloneMarkList(list: Mark[]): Mark[] {
  return list.map((m) => ({ ...m, callout: { ...m.callout, show: { ...m.callout.show } } }));
}

type DragState = {
  kind: "pan" | "mark" | "label" | "resize";
  id?: string;
  lastX: number;
  lastY: number;
  moved: boolean;
  originMarks?: Mark[];
  startScale?: number;
  startW?: number;
};

type PinchState = {
  mode: "chart" | "box";
  id?: string;
  distance: number;
  scale: number;
  originMarks?: Mark[];
};

export function BodyCanvas({ pane = "recent" }: { pane?: "recent" | "previous" }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const readOnly = pane === "previous";
  const transform = useChartStore((s) => (pane === "previous" ? s.previousTransform : s.transform));
  const setTransform = useChartStore((s) =>
    pane === "previous" ? s.setPreviousTransform : s.setTransform,
  );
  const marks = useChartStore((s) => (pane === "previous" ? (s.previousDoc?.marks ?? []) : s.marks));
  const selectedId = useChartStore((s) => (pane === "previous" ? null : s.selectedId));
  const activeSymbol = useChartStore((s) => s.activeSymbol);
  const appearance = useChartStore((s) => s.appearance);
  const visible = useChartStore((s) => s.visible);
  const viewport = useChartStore((s) => s.viewport);
  const addMark = useChartStore((s) => s.addMark);
  const moveMark = useChartStore((s) => s.moveMark);
  const moveLabel = useChartStore((s) => s.moveLabel);
  const selectMark = useChartStore((s) => s.selectMark);
  const commitMoveFrom = useChartStore((s) => s.commitMoveFrom);
  const updateMark = useChartStore((s) => s.updateMark);
  const narrow = useNarrow();

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<PinchState | null>(null);
  const drag = useRef<DragState | null>(null);

  const paneMarks = () =>
    pane === "previous"
      ? (useChartStore.getState().previousDoc?.marks ?? [])
      : useChartStore.getState().marks;

  const { views, canvas } = getChartLayout(visible);
  const boxFill = labelFill(appearance.background);
  const boxText = labelTextFill(appearance.background);

  const metrics: CalloutMetrics = useMemo(() => {
    const svg = svgRef.current;
    const meet = svg && viewport.width > 2 ? meetScale(svg, canvas) : 1;
    const zoom = transform.scale;
    return {
      fitPerPx: meet > 0 ? 1 / meet : 1,
      zoomPerPx: meet * zoom > 0 ? 1 / (meet * zoom) : 1,
      chartZoom: zoom,
      viewportW: viewport.width || 1200,
      isNarrow: narrow,
    };
  }, [canvas, transform.scale, viewport.width, narrow]);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2 && pane === "recent") {
        useChartStore.getState().setViewport({ width: r.width, height: r.height });
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pane]);

  const eventToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const eventToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const p = eventToViewBox(clientX, clientY);
      const t = pane === "previous" ? useChartStore.getState().previousTransform : useChartStore.getState().transform;
      return { x: (p.x - t.x) / t.scale, y: (p.y - t.y) / t.scale };
    },
    [eventToViewBox],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const t = pane === "previous" ? useChartStore.getState().previousTransform : useChartStore.getState().transform;
      const p = eventToViewBox(clientX, clientY);
      const canvasX = (p.x - t.x) / t.scale;
      const canvasY = (p.y - t.y) / t.scale;
      const scale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      setTransform({
        scale,
        x: p.x - canvasX * scale,
        y: p.y - canvasY * scale,
      });
    },
    [eventToViewBox, setTransform],
  );

  const hitTarget = useCallback(
    (cx: number, cy: number, list: Mark[]) => {
      const t = pane === "previous" ? useChartStore.getState().previousTransform : useChartStore.getState().transform;
      const s = useChartStore.getState();
      const layout = getChartLayout(s.visible);
      const svg = svgRef.current;
      const meet = svg ? meetScale(svg, layout.canvas) : 1;
      const mtr: CalloutMetrics = {
        fitPerPx: 1 / meet,
        zoomPerPx: 1 / (meet * t.scale),
        chartZoom: t.scale,
        viewportW: s.viewport.width || 1200,
        isNarrow: narrow,
      };
      const pad = HIT_PAD_PX * mtr.zoomPerPx;
      let bestMark: { mark: Mark; d: number } | null = null;
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i]!;
        const view = viewInLayout(layout.views, m.view);
        if (!view) continue;
        const pos = markCanvasPos(view, m.nx, m.ny);
        const box = labelBoxLayout(m, view, pos.x, pos.y, layout.canvas, mtr);
        if (box && !narrow && s.selectedId === m.id && pointInResizeHandle(cx, cy, box)) {
          return { mark: m, kind: "resize" as const };
        }
        if (box && pointInLabelBox(cx, cy, box, pad)) {
          return { mark: m, kind: "label" as const };
        }
        const threshold = Math.max(32 * mtr.zoomPerPx, m.size * 0.7);
        const d = dist(cx, cy, pos.x, pos.y);
        if (d <= threshold && (!bestMark || d < bestMark.d)) bestMark = { mark: m, d };
      }
      return bestMark ? { mark: bestMark.mark, kind: "mark" as const } : null;
    },
    [narrow],
  );

  const clampBoxScale = (_mark: Mark, next: number) => clampResizeScale(next);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const onBox = drag.current?.kind === "label" || drag.current?.kind === "resize";
      const id = onBox ? drag.current?.id : undefined;
      const mark = id ? paneMarks().find((m) => m.id === id) : undefined;
      pinch.current = {
        mode: mark && !readOnly ? "box" : "chart",
        id: mark?.id,
        distance: dist(pts[0]!.x, pts[0]!.y, pts[1]!.x, pts[1]!.y),
        scale: mark && !readOnly ? mark.labelScale || 1 : (pane === "previous" ? useChartStore.getState().previousTransform.scale : useChartStore.getState().transform.scale),
        originMarks: mark && !readOnly ? cloneMarkList(paneMarks()) : undefined,
      };
      drag.current = null;
      return;
    }

    const canvasPt = eventToCanvas(e.clientX, e.clientY);
    const hit = readOnly ? null : hitTarget(canvasPt.x, canvasPt.y, paneMarks());
    if (hit) {
      const layout = getChartLayout(useChartStore.getState().visible);
      const view = viewInLayout(layout.views, hit.mark.view);
      const pin = view ? markCanvasPos(view, hit.mark.nx, hit.mark.ny) : { x: 0, y: 0 };
      const box = view ? labelBoxLayout(hit.mark, view, pin.x, pin.y, layout.canvas, metrics) : null;
      drag.current = {
        kind: hit.kind,
        id: hit.mark.id,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
        originMarks: cloneMarkList(paneMarks()),
        startScale: hit.mark.labelScale || 1,
        startW: box?.w,
      };
      selectMark(hit.mark.id);
      return;
    }

    drag.current = {
      kind: "pan",
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointers.current.size === 2 && pinch.current) {
      const pts = [...pointers.current.values()];
      const dNow = dist(pts[0]!.x, pts[0]!.y, pts[1]!.x, pts[1]!.y);
      const factor = dNow / (pinch.current.distance || 1);
      if (pinch.current.mode === "box" && pinch.current.id) {
        const mark = paneMarks().find((m) => m.id === pinch.current?.id);
        if (mark) {
          updateMark(mark.id, { labelScale: clampBoxScale(mark, pinch.current.scale * factor) });
        }
        return;
      }
      const midX = (pts[0]!.x + pts[1]!.x) / 2;
      const midY = (pts[0]!.y + pts[1]!.y) / 2;
      const t = pane === "previous" ? useChartStore.getState().previousTransform : useChartStore.getState().transform;
      const target = clamp(pinch.current.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = target / t.scale;
      zoomAt(midX, midY, ratio);
      return;
    }

    const dnd = drag.current;
    if (!dnd) return;
    const dx = e.clientX - dnd.lastX;
    const dy = e.clientY - dnd.lastY;
    if (Math.hypot(dx, dy) > 3) dnd.moved = true;

    if (dnd.kind === "pan") {
      const t = pane === "previous" ? useChartStore.getState().previousTransform : useChartStore.getState().transform;
      const p0 = eventToViewBox(dnd.lastX, dnd.lastY);
      const p1 = eventToViewBox(e.clientX, e.clientY);
      setTransform({
        scale: t.scale,
        x: t.x + (p1.x - p0.x),
        y: t.y + (p1.y - p0.y),
      });
      dnd.lastX = e.clientX;
      dnd.lastY = e.clientY;
      return;
    }

    if (!dnd.id) return;
    const canvasPt = eventToCanvas(e.clientX, e.clientY);
    const mark = paneMarks().find((m) => m.id === dnd.id);
    if (!mark) return;
    const layout = getChartLayout(useChartStore.getState().visible);
    const view = viewInLayout(layout.views, mark.view);
    if (!view) return;

    if (dnd.kind === "mark") {
      const target = dropView(layout.views, canvasPt.x, canvasPt.y);
      if (!target) return;
      const nx = clamp((canvasPt.x - target.x) / target.width, LABEL_VIEW_MIN, LABEL_VIEW_MAX);
      const ny = clamp((canvasPt.y - target.y) / target.height, LABEL_VIEW_MIN, LABEL_VIEW_MAX);
      let ox = mark.labelOx;
      let oy = mark.labelOy;
      if (target.id !== mark.view) {
        const prev = viewInLayout(layout.views, mark.view);
        if (prev) {
          ox = (mark.labelOx * prev.width) / target.width;
          oy = (mark.labelOy * prev.height) / target.height;
        }
      }
      moveMark(mark.id, nx, ny, target.id, ox, oy);
      return;
    }

    if (dnd.kind === "resize") {
      const pin = markCanvasPos(view, mark.nx, mark.ny);
      const box = labelBoxLayout(
        { ...mark, labelScale: dnd.startScale || 1 },
        view,
        pin.x,
        pin.y,
        layout.canvas,
        metrics,
      );
      const baseW = box?.w || 1;
      const newW = Math.max(8, canvasPt.x - (box?.x ?? canvasPt.x));
      const next = ((dnd.startScale || 1) * newW) / baseW;
      updateMark(mark.id, { labelScale: clampBoxScale(mark, next) });
      return;
    }

    if (dnd.kind === "label") {
      const pin = markCanvasPos(view, mark.nx, mark.ny);
      const box = labelBoxLayout(mark, view, pin.x, pin.y, layout.canvas, metrics);
      const hw = (box?.w ?? 72) / 2;
      const hh = (box?.h ?? 36) / 2;
      const pad = box?.pad ?? 8;
      let cx = canvasPt.x;
      let cy = canvasPt.y;
      const viewNx = clamp((cx - view.x) / view.width, LABEL_VIEW_MIN, LABEL_VIEW_MAX);
      const viewNy = clamp((cy - view.y) / view.height, LABEL_VIEW_MIN, LABEL_VIEW_MAX);
      cx = view.x + viewNx * view.width;
      cy = view.y + viewNy * view.height;
      cx = clamp(cx, hw + pad, layout.canvas.width - hw - pad);
      cy = clamp(cy, hh + pad, layout.canvas.height - hh - pad);
      moveLabel(mark.id, (cx - pin.x) / view.width, (cy - pin.y) / view.height);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      const p = pinch.current;
      pinch.current = null;
      if (p?.mode === "box" && p.originMarks) {
        commitMoveFrom(p.originMarks);
      }
    }

    const dnd = drag.current;
    drag.current = null;
    if (!dnd) return;

    if (
      (dnd.kind === "mark" || dnd.kind === "label" || dnd.kind === "resize") &&
      dnd.moved &&
      dnd.originMarks
    ) {
      commitMoveFrom(dnd.originMarks);
      return;
    }

    if (dnd.kind === "pan" && !dnd.moved) {
      if (readOnly) return;
      const canvasPt = eventToCanvas(e.clientX, e.clientY);
      const layout = getChartLayout(useChartStore.getState().visible);
      const view = hitViewIn(layout.views, canvasPt.x, canvasPt.y);
      const symbol = useChartStore.getState().activeSymbol;
      if (view && symbol) {
        const nx = clamp((canvasPt.x - view.x) / view.width, 0, 1);
        const ny = clamp((canvasPt.y - view.y) / view.height, 0, 1);
        addMark(view.id, nx, ny);
      } else if (!symbol) {
        selectMark(null);
      }
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomAt(ev.clientX, ev.clientY, factor);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const cursor = readOnly ? "grab" : activeSymbol ? "crosshair" : "grab";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      className="size-full touch-none select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor, background: resolvedCanvas(appearance), touchAction: "none" }}
      role="img"
      aria-label={pane === "previous" ? "Previous body chart" : "Body chart canvas"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
        <ChartCanvasFrame />
        {marks.flatMap((m) => {
          const destIds = [m.pairTo, m.radiatingTo].filter(Boolean) as string[];
          return destIds.map((destId) => {
            const dest = marks.find((d) => d.id === destId);
            const sv = viewInLayout(views, m.view);
            const dv = dest ? viewInLayout(views, dest.view) : null;
            if (!dest || !sv || !dv) return null;
            const a = markCanvasPos(sv, m.nx, m.ny);
            const b = markCanvasPos(dv, dest.nx, dest.ny);
            const arrow = referralArrow(a, b, m.size || DEFAULT_MARK_SIZE);
            if (!arrow) return null;
            const color = resolvedMarkColor(m);
            return (
              <g key={`arrow-${m.id}-${destId}`} pointerEvents="none">
                <line
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  stroke={color}
                  strokeWidth={arrow.stroke}
                  strokeLinecap="round"
                />
                <polygon points={arrow.points} fill={color} />
              </g>
            );
          });
        })}
        {marks.map((m) => {
          const view = viewInLayout(views, m.view);
          if (!view) return null;
          const pos = markCanvasPos(view, m.nx, m.ny);
          const selected = m.id === selectedId;
          const size = m.size || DEFAULT_MARK_SIZE;
          const color = resolvedMarkColor(m);
          const box = labelBoxLayout(m, view, pos.x, pos.y, canvas, metrics);
          const border = resolvedLabelBorder(m, appearance.background);
          return (
            <g key={m.id} data-mark={m.id}>
              {box ? (
                <g>
                  {box.hasLeader ? (
                    <line
                      x1={box.startX}
                      y1={box.startY}
                      x2={box.endX}
                      y2={box.endY}
                      stroke={border}
                      strokeWidth={box.stroke}
                      strokeLinecap="round"
                    />
                  ) : null}
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    rx={Math.min(6, box.pad * 0.4)}
                    fill={boxFill}
                    stroke={selected ? "var(--color-primary)" : border}
                    strokeWidth={selected ? box.stroke * 1.3 : box.stroke}
                  />
                  {box.lines.map((line, i) => (
                    <text
                      key={i}
                      x={box.x + box.pad}
                      y={box.y + lineOffsetY(i, box.fontSize, box.pad)}
                      fill={boxText}
                      fontSize={box.fontSize}
                      fontFamily="IBM Plex Sans"
                      fontWeight={isRankLine(line) ? FONT_RANK : FONT_BODY}
                      style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                    >
                      {line}
                    </text>
                  ))}
                  {selected && !narrow ? (
                    <rect
                      x={box.x + box.w - box.handle * 0.55}
                      y={box.y + box.h - box.handle * 0.55}
                      width={box.handle}
                      height={box.handle}
                      rx={box.handle * 0.15}
                      fill="var(--color-primary)"
                      stroke={boxFill}
                      strokeWidth={box.handle * 0.12}
                    />
                  ) : null}
                </g>
              ) : null}
              <g transform={`translate(${pos.x} ${pos.y})`}>
                {selected ? (
                  <circle
                    r={size * 0.72}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth={1.2 * metrics.fitPerPx}
                    opacity={0.9}
                  />
                ) : null}
                <g transform={`translate(${-size / 2} ${-size / 2})`}>
                  {isRadiatingDest(m) ? (
                    <path d={lightningPath(size * 0.9)} transform={`translate(${size / 2} ${size / 2})`} fill={color} />
                  ) : (
                    <SymbolGlyph id={m.symbol} size={size} color={color} />
                  )}
                </g>
                {rankTag(m) && !isRadiatingDest(m) ? (
                  <text
                    textAnchor="middle"
                    y={size * 0.62}
                    fontSize={Math.max(11, size * 0.3)}
                    fontWeight={FONT_RANK}
                    fill={appearance.background === "white" ? "#1c1d20" : "#f4f1ea"}
                    stroke={appearance.background === "white" ? "#ffffff" : "#121315"}
                    strokeWidth={Math.max(2, size * 0.06)}
                    paintOrder="stroke"
                    style={{ fontFamily: "IBM Plex Sans", fontVariantNumeric: "tabular-nums lining-nums" }}
                  >
                    {rankTag(m)}
                  </text>
                ) : null}
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
