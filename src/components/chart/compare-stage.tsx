import { useRef } from "react";
import { BodyCanvas } from "./body-canvas";
import { MarkToolbar } from "./mark-toolbar";
import { useChartStore } from "@/lib/chart/store";
import { Button } from "@/components/ui/button";
import { openPreviousChartFile } from "./chart-io";
import { useNarrow } from "./use-narrow";
import { cn } from "@/lib/utils";

const PANES = [
  { id: "previous", label: "Previous" },
  { id: "recent", label: "Recent" },
  { id: "compare", label: "Compare" },
] as const;

export function CompareBar() {
  const pane = useChartStore((s) => s.chartPane);
  const hasPrev = useChartStore((s) => Boolean(s.previousDoc));
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="app-chrome-bar flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1 touch-none md:px-3 md:py-1.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-0.5 rounded-md bg-muted p-0.5 md:mx-auto md:max-w-md md:gap-1 md:rounded-lg md:p-1">
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              "h-8 rounded text-xs font-medium md:h-10 md:rounded-md md:text-sm",
              pane === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            aria-pressed={pane === p.id}
            onClick={() => useChartStore.getState().setChartPane(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {pane !== "recent" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs md:h-10 md:px-2.5 md:text-sm"
          onClick={() => fileRef.current?.click()}
        >
          {hasPrev ? "Replace" : "Open"}
        </Button>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.bodychart,application/json"
        className="hidden"
        onChange={(e) => {
          void openPreviousChartFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ChartStage() {
  const pane = useChartStore((s) => s.chartPane);
  const previousDoc = useChartStore((s) => s.previousDoc);
  const narrow = useNarrow();

  if (pane === "previous") {
    return (
      <div className="relative h-full min-h-0 w-full flex-1">
        {previousDoc ? (
          <>
            <PaneLabel text="Previous" />
            <BodyCanvas pane="previous" />
          </>
        ) : (
          <PreviousEmpty />
        )}
      </div>
    );
  }

  if (pane === "compare") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-1",
          narrow ? "flex-col" : "flex-row",
        )}
      >
        <div className={cn("relative min-h-0 min-w-0 flex-1", narrow ? "border-b border-border" : "border-r border-border")}>
          {previousDoc ? (
            <>
              <PaneLabel text="Previous" />
              <BodyCanvas pane="previous" />
            </>
          ) : (
            <PreviousEmpty />
          )}
        </div>
        <div className="relative min-h-0 min-w-0 flex-1">
          <PaneLabel text="Recent" />
          <BodyCanvas pane="recent" />
          <MarkToolbar />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <BodyCanvas pane="recent" />
      <MarkToolbar />
    </div>
  );
}

function PaneLabel({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-md border border-border bg-chrome-bar/90 px-2 py-0.5 text-xs font-medium text-chrome-fg">
      {text}
    </div>
  );
}

function PreviousEmpty() {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-chrome px-6 text-center">
      <p className="text-sm text-muted-foreground">Open a previous JSON. This side is view-only.</p>
      <Button type="button" className="h-11" onClick={() => fileRef.current?.click()}>
        Open previous
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.bodychart,application/json"
        className="hidden"
        onChange={(e) => {
          void openPreviousChartFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
