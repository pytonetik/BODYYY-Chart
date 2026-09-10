import { viewLabel } from "@/lib/chart/geometry";
import { useChartStore } from "@/lib/chart/store";
import { Separator } from "@/components/ui/separator";
import { FigurePanel } from "./figure-panel";
import { MarkFieldsForm } from "./mark-controls";
import { SessionFields } from "./session-fields";

export function Inspector() {
  const marks = useChartStore((s) => s.marks);
  const selectedId = useChartStore((s) => s.selectedId);
  const mark = marks.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-5">
      {mark ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-tight">Symbol</h2>
          <p className="text-xs text-muted-foreground">{viewLabel(mark.view)}</p>
          <MarkFieldsForm mark={mark} idPrefix="inspector" />
        </section>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-tight">Mark</h2>
          <p className="text-sm text-muted-foreground">
            {marks.length === 0
              ? "Choose a symbol, then tap a figure to place it. Callouts are optional."
              : `${marks.length} mark${marks.length === 1 ? "" : "s"} on this chart. Select one to add a callout.`}
          </p>
        </section>
      )}

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">Figure</h2>
        <FigurePanel />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">Session</h2>
        <SessionFields idPrefix="inspector" />
      </section>
    </div>
  );
}
