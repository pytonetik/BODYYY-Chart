import { parseAppearance } from "./appearance";
import { parseRecents } from "./recents";
import {
  DEPTHS,
  FLUCTUATIONS,
  PATTERNS,
  QUALITIES,
  parseEnum,
  parseScore,
  parseShow,
  parseRom,
} from "./fields";
import {
  SYMBOL_IDS,
  VIEW_IDS,
  emptyCallout,
  emptyMeta,
  migrateMarkSize,
  parseMarkColor,
  parseVisible,
  clampLabelScale,
  clampLabelSize,
  todayIsoDate,
  type ChartDocument,
  type Mark,
} from "./types";
import { parseId, parseRank, migratePainRadiating } from "./ranks";

export function parseChartDocument(raw: unknown): ChartDocument {
  if (!raw || typeof raw !== "object") {
    throw new Error("Not a BODYYY Chart file.");
  }
  const data = raw as Record<string, unknown>;
  if (data.kind !== "bodychart.v1") {
    throw new Error("Unrecognized file format.");
  }
  const metaIn = (data.meta ?? {}) as Record<string, unknown>;
  const base = emptyMeta();
  const marksIn = Array.isArray(data.marks) ? data.marks : [];
  const marks: Mark[] = [];
  for (const item of marksIn) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const symbol = String(m.symbol);
    const view = String(m.view);
    if (!SYMBOL_IDS.includes(symbol as Mark["symbol"])) continue;
    if (!VIEW_IDS.includes(view as Mark["view"])) continue;
    const nx = Number(m.nx);
    const ny = Number(m.ny);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;
    const calloutIn = (m.callout ?? {}) as Record<string, unknown>;
    const empty = emptyCallout();
    marks.push({
      id: typeof m.id === "string" && m.id ? m.id : crypto.randomUUID(),
      symbol: symbol as Mark["symbol"],
      view: view as Mark["view"],
      nx: Math.min(1, Math.max(0, nx)),
      ny: Math.min(1, Math.max(0, ny)),
      size: migrateMarkSize(Number(m.size)),
      color: parseMarkColor(m.color),
      label: typeof m.label === "string" ? m.label : "",
      labelOx: Number.isFinite(Number(m.labelOx)) ? Number(m.labelOx) : 0,
      labelOy: Number.isFinite(Number(m.labelOy)) ? Number(m.labelOy) : 0,
      labelPlaced: m.labelPlaced === true,
      labelBorder: parseMarkColor(m.labelBorder),
      labelSize: clampLabelSize(Number(m.labelSize)),
      labelScale: clampLabelScale(Number(m.labelScale)),
      rank: parseRank(m.rank),
      pairTo: parseId(m.pairTo),
      pairFrom: parseId(m.pairFrom),
      radiatingTo: parseId(m.radiatingTo),
      radiatingFrom: parseId(m.radiatingFrom),
      callout: {
        ...empty,
        pattern: parseEnum(calloutIn.pattern, PATTERNS),
        fluctuation: parseEnum(calloutIn.fluctuation, FLUCTUATIONS),
        quality: parseEnum(calloutIn.quality, QUALITIES),
        depth: parseEnum(calloutIn.depth, DEPTHS),
        b: parseScore(calloutIn.b),
        w: parseScore(calloutIn.w),
        notes: typeof calloutIn.notes === "string" ? calloutIn.notes : "",
        rom: parseRom(calloutIn.rom),
        show: parseShow(calloutIn.show),
      },
    } as Mark & { radiating?: boolean });
    if (m.radiating === true) {
      (marks[marks.length - 1] as Mark & { radiating?: boolean }).radiating = true;
    }
  }
  return {
    kind: "bodychart.v1",
    version: 1,
    meta: {
      patient: typeof metaIn.patient === "string" ? metaIn.patient : base.patient,
      clinician: typeof metaIn.clinician === "string" ? metaIn.clinician : base.clinician,
      date: typeof metaIn.date === "string" && metaIn.date ? metaIn.date : base.date,
      notes: typeof metaIn.notes === "string" ? metaIn.notes : base.notes,
    },
    marks: migratePainRadiating(marks),
    appearance: parseAppearance(data.appearance),
    recents: parseRecents(data.recents),
    visible: parseVisible(data.visible),
  };
}

export function downloadJson(doc: ChartDocument, filename: string) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function defaultFileStem(date = todayIsoDate()): string {
  return `bodychart-${date}`;
}

export function sanitizeFileStem(raw: string, fallback = defaultFileStem()): string {
  let s = raw.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  s = s.replace(/\.(json|png|pdf|bodychart\.json)$/i, "");
  s = s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\.+$/g, "").trim();
  return s || fallback;
}

export function suggestedFileName(patient: string, date: string): string {
  return `${defaultFileStem(date)}.json`;
}

export async function readChartFile(file: File): Promise<ChartDocument> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  return parseChartDocument(parsed);
}
