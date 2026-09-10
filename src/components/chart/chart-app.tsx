import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { SymbolBar } from "./symbol-bar";
import { AppHeader } from "./app-header";
import { ChartStage, CompareBar } from "./compare-stage";
import { PAIN_ID, slotWindow } from "@/lib/chart/recents";
import { useChartStore } from "@/lib/chart/store";

export function ChartApp() {
  const canvasWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useChartStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        window.dispatchEvent(new Event("bodychart:save"));
        return;
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useChartStore.getState().redo();
        else useChartStore.getState().undo();
        return;
      }
      if (typing) return;
      if (e.key === "Escape") {
        useChartStore.getState().setActiveSymbol(null);
        useChartStore.getState().selectMark(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (useChartStore.getState().chartPane === "previous") return;
        e.preventDefault();
        useChartStore.getState().deleteSelected();
      }
      if (e.key === "v" || e.key === "V") {
        useChartStore.getState().setActiveSymbol(null);
      }
      if (e.key === "0" && meta) {
        e.preventDefault();
        useChartStore.getState().fitView();
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 4) {
        const s = useChartStore.getState();
        const slots = slotWindow(s.recents, s.slotOffset);
        const id = num === 1 ? PAIN_ID : slots[num - 2];
        if (id) s.setActiveSymbol(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-chrome flex h-dvh flex-col overflow-hidden">
      <AppHeader />
      <CompareBar />
      <main
        ref={canvasWrap}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chrome"
      >
        <ChartStage />
      </main>
      <SymbolBar />
      <Toaster theme="dark" position="bottom-center" />
    </div>
  );
}
