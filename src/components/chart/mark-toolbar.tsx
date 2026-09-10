import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useChartStore } from "@/lib/chart/store";
import { Button } from "@/components/ui/button";
import { MarkFieldsForm } from "./mark-controls";
import { useNarrow } from "./use-narrow";

export function MarkToolbar() {
  const mark = useChartStore((s) => s.marks.find((m) => m.id === s.selectedId) ?? null);
  const deleteMark = useChartStore((s) => s.deleteMark);
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [mark?.id]);

  if (!mark) return null;

  const chip = (
    <div
      className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-chrome-bar p-1 text-chrome-fg shadow-[var(--shadow-border)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant={open ? "default" : "ghost"}
        size="sm"
        className="h-11 px-3"
        onClick={() => setOpen((v) => !v)}
      >
        Details
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="h-11 px-3"
        aria-label="Delete symbol"
        onClick={() => deleteMark(mark.id)}
      >
        <Trash2 />
        Delete
      </Button>
    </div>
  );

  const form = <MarkFieldsForm mark={mark} idPrefix="editor" />;
  const back = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-11 w-11 shrink-0 px-0"
      aria-label="Back"
      onClick={() => setOpen(false)}
    >
      <ArrowLeft className="size-5" />
    </Button>
  );

  if (narrow) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30">
        {!open ? <div className="absolute inset-x-0 bottom-2 flex justify-center px-2">{chip}</div> : null}
        {open ? (
          <div className="pointer-events-auto absolute inset-0 z-40">
            <button
              type="button"
              className="absolute inset-x-0 top-0 bg-background/55"
              style={{ bottom: "42dvh" }}
              aria-label="Back"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-xl border-t border-border bg-chrome-bar text-chrome-fg shadow-[var(--shadow-border)]"
              style={{ height: "42dvh" }}
              role="dialog"
              aria-label="Details"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-chrome-bar px-2 py-1">
                <p className="min-w-0 flex-1 truncate pl-2 text-sm font-medium">Details</p>
                {back}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{form}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {!open ? <div className="absolute bottom-3 left-3">{chip}</div> : null}
      {open ? (
        <>
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-background/40"
            aria-label="Back"
            onClick={() => setOpen(false)}
          />
          <aside
            className="pointer-events-auto absolute inset-y-0 right-0 flex w-80 flex-col border-l border-border bg-chrome-bar text-chrome-fg shadow-[var(--shadow-border)]"
            role="dialog"
            aria-label="Details"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-chrome-bar px-2 py-1">
              <p className="min-w-0 flex-1 truncate pl-2 text-sm font-medium">Details</p>
              {back}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{form}</div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
