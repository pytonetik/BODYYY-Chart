import { printAppearance } from "./appearance";
import { getChartLayout, markCanvasPos, viewInLayout } from "./geometry";
import {
  labelBoxLayout,
  labelFill,
  labelTextFill,
  lineOffsetY,
  resolvedLabelBorderHex,
  type CalloutMetrics,
} from "./label-box";
import { FONT_BODY, FONT_RANK, SVG_FONT, chartFontFaceCss, isRankLine } from "./chart-font";
import { figuresMarkup } from "./render-figures";
import { loadPrintRasters } from "./figure-vectors";
import { isRadiatingDest, lightningPath, rankTag, referralArrow } from "./ranks";
import { SYMBOL_MAP, resolvedMarkColorHex } from "./symbols";
import { DEFAULT_MARK_SIZE, parseVisible, type ChartDocument, type Mark } from "./types";

export type PrintOrientation = "landscape" | "portrait";
export type PrintQuality = "draft" | "print" | "high";
export type PrintFormat = "png" | "pdf";

export const PRINT_DPI: Record<PrintQuality, number> = {
  draft: 150,
  print: 300,
  high: 600,
};

const A4_MM = { long: 297, short: 210 };
const A4_PT = { landscape: { w: 842, h: 595 }, portrait: { w: 595, h: 842 } };

export function printPagePixels(orientation: PrintOrientation, dpi: number): { w: number; h: number } {
  const long = Math.round((A4_MM.long / 25.4) * dpi);
  const short = Math.round((A4_MM.short / 25.4) * dpi);
  return orientation === "portrait" ? { w: short, h: long } : { w: long, h: short };
}

function pageMetrics(orientation: PrintOrientation, dpi: number) {
  const page = printPagePixels(orientation, dpi);
  const u = dpi / 300;
  return {
    page,
    u,
    margin: Math.round(72 * u),
    legendH: Math.round(100 * u),
  };
}
const AMP = "\u0026";

function escapeXml(s: string): string {
  return s
    .replaceAll("&", `${AMP}amp;`)
    .replaceAll("<", `${AMP}lt;`)
    .replaceAll(">", `${AMP}gt;`)
    .replaceAll('"', `${AMP}quot;`);
}

function markGlyphSvg(mark: Pick<Mark, "symbol" | "color">, x: number, y: number, size: number): string {
  const color = resolvedMarkColorHex(mark);
  const k = size / 24;
  const inner = glyphInner(mark.symbol, color);
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)}) translate(-12 -12)" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function glyphInner(id: Mark["symbol"], color: string): string {
  switch (id) {
    case "pain":
      return `<circle cx="12" cy="12" r="6.5" fill="${color}" stroke="none"/>`;
    case "tenderJoint":
      return `<circle cx="12" cy="12" r="7.5"/><path d="M8.2 8.2 15.8 15.8M15.8 8.2 8.2 15.8"/>`;
    case "tenderness":
      return `<path d="M12 4.5 19 18.5H5Z" fill="${color}" stroke="none"/>`;
    case "numbness":
      return `<path d="M13.2 2.2 6.1 12.8h5.3L9.4 21.8 18.4 10.6h-5.2L14.8 2.2Z" fill="${color}" stroke="none"/>`;
    case "paresthesia":
      return `<path d="M5 16 9 8l4 8 4-8 2 4"/>`;
    case "weakness":
      return `<rect x="6" y="6" width="12" height="12" rx="1.5"/>`;
    case "triggerPoint":
      return `<path d="M12 3.5 13.4 9.2 19.5 9.2 14.6 12.8 16.4 18.5 12 14.8 7.6 18.5 9.4 12.8 4.5 9.2 10.6 9.2Z" fill="${color}" stroke="none"/>`;
    case "radiation":
      return `<path d="M6 12h12" stroke-dasharray="2 2"/><path d="M12 12 18 6M12 12 18 12M12 12 18 18"/>`;
    case "inflammation":
      return `<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.6"/>`;
    case "swelling":
      return `<ellipse cx="12" cy="12" rx="8" ry="5.5" fill="${color}" stroke="none"/>`;
    case "spasm":
      return `<path d="M4 12c2-6 4 6 6 0s4 6 6 0 4 6 6 0"/>`;
    case "adhesion":
      return `<path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" stroke-width="2.2"/>`;
    case "friction":
      return `<path d="M8 6v12M12 6v12M16 6v12"/>`;
    case "hypomobility":
      return `<path d="M6 10h12M8 14h8M10 18h4"/>`;
    case "hypermobility":
      return `<path d="M6 14h12M8 10h8M10 6h4"/>`;
  }
}

export async function buildExportSvg(
  doc: ChartDocument,
  viewport: { width: number; height: number } = { width: 390, height: 520 },
  orientation: PrintOrientation = "landscape",
  quality: PrintQuality = "print",
  fontCss = "",
): Promise<{ svg: string; width: number; height: number }> {
  const dpi = PRINT_DPI[quality];
  const { page, u, margin, legendH } = pageMetrics(orientation, dpi);
  const style = doc.appearance?.figureStyle === "sketch" ? "sketch" : "glow";
  const appearance = printAppearance(style);
  const visible = parseVisible(doc.visible);
  const rasters = await loadPrintRasters(style);
  const { views, canvas } = getChartLayout(visible);
  const innerW = page.w - margin * 2;
  const innerH = page.h - margin * 2 - legendH;
  const s = Math.min(innerW / canvas.width, innerH / canvas.height);
  const tx = (page.w - canvas.width * s) / 2;
  const ty = margin + Math.max(0, (innerH - canvas.height * s) / 2);

  const meet = Math.min(
    Math.max(80, viewport.width) / canvas.width,
    Math.max(80, viewport.height) / canvas.height,
  );
  const fitPerPx = 1 / Math.max(0.12, meet);

  const metrics: CalloutMetrics = {
    fitPerPx,
    zoomPerPx: fitPerPx,
    chartZoom: 1,
    viewportW: viewport.width || 390,
    isNarrow: (viewport.width || 390) < 768,
  };

  const used = new Map<string, number>();
  for (const m of doc.marks) {
    if (!viewInLayout(views, m.view) || m.pairFrom || m.radiatingFrom) continue;
    used.set(m.symbol, (used.get(m.symbol) ?? 0) + 1);
  }
  const fill = labelFill("white");
  const textFill = labelTextFill("white");
  const ink = "#1c1d20";

  const arrows = doc.marks
    .flatMap((m) => {
      const destIds = [m.pairTo, m.radiatingTo].filter(Boolean) as string[];
      return destIds.map((destId) => {
        const dest = doc.marks.find((d) => d.id === destId);
        const sv = viewInLayout(views, m.view);
        const dv = dest ? viewInLayout(views, dest.view) : null;
        if (!dest || !sv || !dv) return "";
        const a = markCanvasPos(sv, m.nx, m.ny);
        const b = markCanvasPos(dv, dest.nx, dest.ny);
        const arrow = referralArrow(a, b, m.size || DEFAULT_MARK_SIZE);
        if (!arrow) return "";
        const color = resolvedMarkColorHex(m);
        return `<line x1="${arrow.x1.toFixed(2)}" y1="${arrow.y1.toFixed(2)}" x2="${arrow.x2.toFixed(2)}" y2="${arrow.y2.toFixed(2)}" stroke="${color}" stroke-width="${arrow.stroke.toFixed(2)}" stroke-linecap="round"/><polygon points="${arrow.points}" fill="${color}"/>`;
      });
    })
    .join("\n");

  const marks = doc.marks
    .map((m) => {
      const view = viewInLayout(views, m.view);
      if (!view) return "";
      const pos = markCanvasPos(view, m.nx, m.ny);
      const size = m.size || DEFAULT_MARK_SIZE;
      const glyph = isRadiatingDest(m)
        ? `<path d="${lightningPath(size * 0.9)}" transform="translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})" fill="${resolvedMarkColorHex(m)}"/>`
        : markGlyphSvg(m, pos.x, pos.y, size);
      const tag = !isRadiatingDest(m) ? rankTag(m) : "";
      const rank = tag
        ? `<text x="${pos.x.toFixed(2)}" y="${(pos.y + size * 0.62).toFixed(2)}" text-anchor="middle" font-size="${Math.max(11, size * 0.3).toFixed(2)}" font-weight="${FONT_RANK}" fill="#1c1d20" stroke="#ffffff" stroke-width="${Math.max(2, size * 0.06).toFixed(2)}" paint-order="stroke" ${SVG_FONT}>${escapeXml(tag)}</text>`
        : "";
      const box = labelBoxLayout(m, view, pos.x, pos.y, canvas, metrics);
      if (!box) return `${glyph}${rank}`;
      const border = resolvedLabelBorderHex(m, "white");
      const leader = box.hasLeader
        ? `<line x1="${box.startX.toFixed(2)}" y1="${box.startY.toFixed(2)}" x2="${box.endX.toFixed(2)}" y2="${box.endY.toFixed(2)}" stroke="${border}" stroke-width="${box.stroke.toFixed(2)}" stroke-linecap="round"/>`
        : "";
      const lines = box.lines
        .map(
          (line, i) =>
            `<text x="${(box.x + box.pad).toFixed(2)}" y="${(box.y + lineOffsetY(i, box.fontSize, box.pad)).toFixed(2)}" fill="${textFill}" font-size="${box.fontSize.toFixed(2)}" font-weight="${isRankLine(line) ? FONT_RANK : FONT_BODY}" ${SVG_FONT}>${escapeXml(line)}</text>`,
        )
        .join("");
      return `${leader}${glyph}${rank}<rect x="${box.x.toFixed(2)}" y="${box.y.toFixed(2)}" width="${box.w.toFixed(2)}" height="${box.h.toFixed(2)}" rx="${Math.min(6, box.pad * 0.4).toFixed(2)}" fill="${fill}" stroke="${border}" stroke-width="${box.stroke.toFixed(2)}"/>${lines}`;
    })
    .join("\n");

  let legendX = margin;
  const legendY = page.h - margin - Math.round(28 * u);
  const glyph = Math.round(32 * u);
  const legendFont = Math.round(28 * u);
  const legendGap = Math.round(320 * u);
  const legendItems = [...used.entries()]
    .map(([symbol]) => {
      const def = SYMBOL_MAP[symbol as Mark["symbol"]];
      const item = `<g transform="translate(${legendX} ${legendY})">${markGlyphSvg({ symbol: def.id, color: "" }, Math.round(16 * u), 0, glyph)}<text x="${Math.round(40 * u)}" y="${Math.round(8 * u)}" fill="${ink}" font-size="${legendFont}" font-weight="${FONT_BODY}" ${SVG_FONT}>${escapeXml(def.label)}</text></g>`;
      legendX += legendGap;
      return item;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${page.w}" height="${page.h}" viewBox="0 0 ${page.w} ${page.h}">
  <defs><style><![CDATA[${fontCss}
text{font-family:"IBM Plex Sans";font-variant-numeric:tabular-nums lining-nums;}]]></style></defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})">
    ${figuresMarkup(appearance, views, rasters)}
    ${arrows}
    ${marks}
  </g>
  ${legendItems}
</svg>`;
  return { svg, width: page.w, height: page.h };
}

async function rasterizeChart(
  doc: ChartDocument,
  viewport?: { width: number; height: number },
  orientation: PrintOrientation = "landscape",
  quality: PrintQuality = "print",
): Promise<HTMLCanvasElement> {
  const fontCss = await chartFontFaceCss();
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all([
      document.fonts.load('400 12px "IBM Plex Sans"'),
      document.fonts.load('600 12px "IBM Plex Sans"'),
    ]).catch(() => undefined);
  }
  const { svg, width, height } = await buildExportSvg(doc, viewport, orientation, quality, fontCss);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterize chart."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed."))), type, quality);
  });
}

export async function exportPngBlob(
  doc: ChartDocument,
  viewport?: { width: number; height: number },
  orientation: PrintOrientation = "landscape",
  quality: PrintQuality = "print",
): Promise<Blob> {
  const canvas = await rasterizeChart(doc, viewport, orientation, quality);
  return canvasBlob(canvas, "image/png");
}

function jpegToPdf(jpeg: Uint8Array, imgW: number, imgH: number, orientation: PrintOrientation): Blob {
  const page = A4_PT[orientation];
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let pos = 0;
  const push = (data: Uint8Array | string) => {
    const b = typeof data === "string" ? encoder.encode(data) : data;
    parts.push(b);
    pos += b.length;
  };
  const obj = (body: string | (() => void)) => {
    offsets.push(pos);
    if (typeof body === "string") push(body);
    else body();
  };

  push("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");
  obj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  obj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  obj(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w} ${page.h}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  );
  const content = `q ${page.w} 0 0 ${page.h} 0 0 cm /Im0 Do Q\n`;
  obj(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  obj(() => {
    push(
      `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    push(jpeg);
    push("\nendstream\nendobj\n");
  });
  const xrefPos = pos;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const out = new Uint8Array(pos);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

export async function exportPdfBlob(
  doc: ChartDocument,
  viewport?: { width: number; height: number },
  orientation: PrintOrientation = "landscape",
  quality: PrintQuality = "print",
): Promise<Blob> {
  const canvas = await rasterizeChart(doc, viewport, orientation, quality);
  const jpegQ = quality === "draft" ? 0.82 : quality === "high" ? 0.95 : 0.93;
  const jpeg = await canvasBlob(canvas, "image/jpeg", jpegQ);
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  return jpegToPdf(bytes, canvas.width, canvas.height, orientation);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
