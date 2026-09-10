import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  SwatchBook,
  Undo2,
  Redo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChartStore } from "@/lib/chart/store";
import { cn } from "@/lib/utils";
import { FigurePanel } from "./figure-panel";
import { FileDialog } from "./file-dialog";
import { LegalNotice } from "./legal-notice";
import { SessionFields } from "./session-fields";
import { useNarrow } from "./use-narrow";

const SWIPE_MIN = 56;
const HEADER_ACTIONS = [
  { id: "patient", label: "Patient details", short: "Patient", icon: UserRound },
  { id: "style", label: "Style", short: "Style", icon: SwatchBook },
  { id: "clear", label: "Clear", short: "Clear", icon: Eraser },
] as const;

type HeaderActionId = (typeof HEADER_ACTIONS)[number]["id"];

export function AppHeader() {
  const narrow = useNarrow();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [figureOpen, setFigureOpen] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);
  const [carousel, setCarousel] = useState(0);
  const meta = useChartStore((s) => s.meta);
  const dirty = useChartStore((s) => s.dirty);
  const marks = useChartStore((s) => s.marks);
  const past = useChartStore((s) => s.past);
  const future = useChartStore((s) => s.future);

  const runAction = (id: HeaderActionId) => {
    if (id === "patient") setPatientOpen(true);
    if (id === "style") setFigureOpen(true);
    if (id === "clear") setConfirmClear(true);
  };

  return (
    <header
      className="app-chrome flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 md:px-3 touch-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-base font-medium tracking-tight">BODYYY Chart</h1>
          <span className="hidden truncate text-xs text-muted-foreground md:inline">
            {meta.patient.trim() || "New chart"}
            {dirty ? " · unsaved" : ""}
          </span>
        </div>
        {narrow ? null : <LegalNotice placement="header" />}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 px-2"
          aria-label="Undo"
          disabled={past.length === 0}
          onClick={() => useChartStore.getState().undo()}
        >
          <Undo2 />
          <span className="hidden md:inline">Undo</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 px-2"
          aria-label="Redo"
          disabled={future.length === 0}
          onClick={() => useChartStore.getState().redo()}
        >
          <Redo2 />
          <span className="hidden md:inline">Redo</span>
        </Button>

        {narrow ? (
          <ActionCarousel
            index={carousel}
            onIndex={setCarousel}
            disabledClear={marks.length === 0}
            onAction={runAction}
          />
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => setPatientOpen(true)}
            >
              <UserRound />
              Patient details
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => setFigureOpen(true)}
            >
              <SwatchBook />
              Style
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11"
              aria-label="Clear marks"
              disabled={marks.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Eraser />
              Clear
            </Button>
          </>
        )}
      </div>

      <Dialog open={patientOpen} onOpenChange={setPatientOpen}>
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient details</DialogTitle>
            <DialogDescription>Session fields stay when you clear marks.</DialogDescription>
          </DialogHeader>
          <SessionFields idPrefix="header" />
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmNew(true)}>
              New chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={figureOpen} onOpenChange={setFigureOpen}>
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Style</DialogTitle>
            <DialogDescription>
              Black for screen, white for print. Artwork and color can change without moving marks.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <FigurePanel />
          </div>
        </DialogContent>
      </Dialog>

      <FileDialog
        open={confirmClear}
        title="Clear"
        okLabel="Clear"
        okVariant="destructive"
        onCancel={() => setConfirmClear(false)}
        onOk={() => {
          useChartStore.getState().clearMarks();
          setConfirmClear(false);
          toast("Marks cleared");
        }}
      >
        <p className="text-sm text-muted-foreground">Clear all symbols and callouts?</p>
      </FileDialog>

      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new chart?</DialogTitle>
            <DialogDescription>
              {dirty || marks.length
                ? "Unsaved marks stay only if you save first. This clears the current session."
                : "This resets patient fields and marks."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmNew(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                useChartStore.getState().newChart();
                setConfirmNew(false);
                setPatientOpen(false);
              }}
            >
              New chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function ActionCarousel({
  index,
  onIndex,
  disabledClear,
  onAction,
}: {
  index: number;
  onIndex: (n: number) => void;
  disabledClear: boolean;
  onAction: (id: HeaderActionId) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const action = HEADER_ACTIONS[index]!;
  const Icon = action.icon;
  const disabled = action.id === "clear" && disabledClear;

  const step = (dir: 1 | -1) => {
    onIndex((index + dir + HEADER_ACTIONS.length) % HEADER_ACTIONS.length);
  };

  return (
    <div
      className="flex min-w-0 items-center gap-0.5"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const origin = start.current;
        start.current = null;
        if (!origin) return;
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2) {
          swiped.current = true;
          step(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-11 min-w-0 px-2.5", disabled && "opacity-40")}
        disabled={disabled}
        onClick={(e) => {
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
            return;
          }
          onAction(action.id);
        }}
      >
        <Icon />
        <span className="truncate">{action.short}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        aria-label="Previous action"
        onClick={(e) => {
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
            return;
          }
          step(-1);
        }}
      >
        <ChevronLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        aria-label="Next action"
        onClick={(e) => {
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
            return;
          }
          step(1);
        }}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
