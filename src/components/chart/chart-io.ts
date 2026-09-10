import { toast } from "sonner";
import { downloadJson, readChartFile } from "@/lib/chart/file";
import {
  downloadBlob,
  exportPdfBlob,
  exportPngBlob,
  type PrintOrientation,
  type PrintQuality,
} from "@/lib/chart/export-png";
import { useChartStore } from "@/lib/chart/store";

export function saveChart(filename: string) {
  const doc = useChartStore.getState().toDocument();
  downloadJson(doc, filename);
  useChartStore.getState().markSaved(filename);
  toast("Chart saved");
}

export async function openChartFile(file: File | undefined) {
  if (!file) return;
  try {
    const doc = await readChartFile(file);
    useChartStore.getState().loadDocument(doc, file.name);
    toast("Chart opened");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Could not open file");
  }
}

export async function openPreviousChartFile(file: File | undefined) {
  if (!file) return;
  try {
    const doc = await readChartFile(file);
    useChartStore.getState().loadPrevious(doc, file.name);
    toast("Previous chart opened");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Could not open file");
  }
}

export async function exportChartPng(opts: {
  orientation: PrintOrientation;
  quality: PrintQuality;
  filename: string;
}) {
  try {
    const state = useChartStore.getState();
    const blob = await exportPngBlob(state.toDocument(), state.viewport, opts.orientation, opts.quality);
    downloadBlob(blob, opts.filename);
    toast("PNG saved");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "PNG export failed");
    throw err;
  }
}

export async function exportChartPdf(opts: {
  orientation: PrintOrientation;
  quality: PrintQuality;
  filename: string;
}) {
  try {
    const state = useChartStore.getState();
    const blob = await exportPdfBlob(state.toDocument(), state.viewport, opts.orientation, opts.quality);
    downloadBlob(blob, opts.filename);
    toast("PDF saved");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "PDF export failed");
    throw err;
  }
}