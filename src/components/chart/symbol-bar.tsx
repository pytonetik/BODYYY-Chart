import { useRef, useState, type RefObject } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Frame,
  LayoutGrid,
  MousePointer2,
} from "lucide-react";
import { PAIN_ID, SLOT_COUNT_NARROW, libraryOrder, nextOffset, slotWindow } from "@/lib/chart/recents";
import { SYMBOL_MAP } from "@/lib/chart/symbols";
import { useChartStore } from "@/lib/chart/store";
import type { SymbolId, VisibleGroups } from "@/lib/chart/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openChartFile } from "./chart-io";
import { PrintButton } from "./print-dialog";
import { SaveButton } from "./save-dialog";
import { ShowAllDialog } from "./show-all-dialog";
import { SymbolGlyph } from "./symbol-glyph";
import { LegalNotice } from "./legal-notice";
import { useNarrow } from "./use-narrow";

export function SymbolBar() {
  const narrow = useNarrow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAll, setShowAll] = useState(false);
  const active = useChartStore((s) => s.activeSymbol);
  const recents = useChartStore((s) => s.recents);
  const slotOffset = useChartStore((s) => s.slotOffset);
  const visible = useChartStore((s) => s.visible);
  const slotCount = narrow ? SLOT_COUNT_NARROW : 3;
  const slots = slotWindow(recents, narrow ? slotOffset : 0, slotCount);
  const canPage = narrow && libraryOrder(recents).length > slotCount;

  const stamp = (id: SymbolId) => {
    useChartStore.getState().setActiveSymbol(id);
  };

  return (
    <div
      className="app-chrome-bar shrink-0 border-t border-border touch-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
        <ViewCheck id="anterior" label="Anterior" checked={visible.anterior} />
        <ViewCheck id="posterior" label="Posterior" checked={visible.posterior} />
        <ViewCheck id="lateral" label="Lateral" checked={visible.lateral} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-11 shrink-0 px-2.5"
          onClick={() => useChartStore.getState().fitView()}
        >
          <Frame />
          Fit
        </Button>
      </div>
      <div className="flex flex-nowrap items-center gap-0.5 overflow-x-hidden border-t border-border px-1.5 py-1.5 md:gap-1 md:overflow-x-auto md:px-2">
        <Button
          type="button"
          variant={active === null ? "default" : "outline"}
          size="sm"
          className="h-11 shrink-0 px-2 md:px-2.5"
          aria-label="Select"
          aria-pressed={active === null}
          onClick={() => useChartStore.getState().setActiveSymbol(null)}
        >
          <MousePointer2 />
          <span className="hidden lg:inline">Select</span>
        </Button>
        <StampButton id={PAIN_ID} active={active === PAIN_ID} onSelect={stamp} />
        {slots.map((id) => (
          <StampButton key={id} id={id} active={active === id} onSelect={stamp} />
        ))}
        {canPage ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Previous symbols"
              onClick={() =>
                useChartStore.getState().setSlotOffset(nextOffset(recents, slotOffset, -1, slotCount))
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Next symbols"
              onClick={() =>
                useChartStore.getState().setSlotOffset(nextOffset(recents, slotOffset, 1, slotCount))
              }
            >
              <ChevronRight />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 shrink-0 whitespace-nowrap px-2 md:px-2.5"
          aria-label="Symbols"
          onClick={() => setShowAll(true)}
        >
          <LayoutGrid />
          <span>Symbols</span>
        </Button>
        {!narrow ? (
          <div className="ml-auto flex items-center gap-1">
            <FileButtons fileRef={fileRef} />
          </div>
        ) : null}
      </div>
      {narrow ? (
        <>
          <div className="grid grid-cols-3 gap-1 border-t border-border px-2 py-1.5">
            <FileButtons fileRef={fileRef} full />
          </div>
          <LegalNotice placement="footer" />
        </>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.bodychart,application/json"
        className="hidden"
        onChange={(e) => {
          void openChartFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <ShowAllDialog open={showAll} onOpenChange={setShowAll} />
    </div>
  );
}

function ViewCheck({
  id,
  label,
  checked,
}: {
  id: keyof VisibleGroups;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        onChange={(e) => useChartStore.getState().setVisible({ [id]: e.target.checked })}
      />
      {label}
    </label>
  );
}

function StampButton({
  id,
  active,
  onSelect,
}: {
  id: SymbolId;
  active: boolean;
  onSelect: (id: SymbolId) => void;
}) {
  const def = SYMBOL_MAP[id];
  return (
    <button
      type="button"
      aria-label={def.label}
      aria-pressed={active}
      onClick={() => onSelect(id)}
      className={cn(
        "flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm md:px-2",
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-sm bg-muted">
        <SymbolGlyph id={id} size={18} />
      </span>
      <span className="hidden max-w-16 truncate lg:inline">{def.short}</span>
    </button>
  );
}

function FileButtons({
  fileRef,
  full = false,
}: {
  fileRef: RefObject<HTMLInputElement | null>;
  full?: boolean;
}) {
  const cls = full ? "h-11 w-full" : "h-11";
  return (
    <>
      <SaveButton full={full} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cls}
        onClick={() => fileRef.current?.click()}
      >
        <FolderOpen />
        Open
      </Button>
      <PrintButton full={full} />
    </>
  );
}
