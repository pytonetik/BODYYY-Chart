import {
  FILL_SWATCHES,
  type CanvasBackground,
  type FigureStyleId,
} from "@/lib/chart/appearance";
import { useChartStore } from "@/lib/chart/store";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const BACKGROUNDS: { id: CanvasBackground; label: string; hint: string }[] = [
  { id: "black", label: "Black", hint: "Screen" },
  { id: "white", label: "White", hint: "Print" },
];

const STYLES: { id: FigureStyleId; label: string; hint: string }[] = [
  { id: "glow", label: "Glow", hint: "Display lines" },
  { id: "sketch", label: "Sketch", hint: "Print shading" },
];

export function FigurePanel() {
  const appearance = useChartStore((s) => s.appearance);
  const setAppearance = useChartStore((s) => s.setAppearance);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>Background</Label>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUNDS.map((opt) => {
            const on = appearance.background === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={on}
                onClick={() => setAppearance({ background: opt.id })}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg border px-3 text-left transition-colors duration-150",
                  on
                    ? "border-primary bg-secondary text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className="size-6 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: opt.id === "black" ? "#050506" : "#f4f3ef" }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Artwork</Label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((opt) => {
            const on = appearance.figureStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={on}
                onClick={() => setAppearance({ figureStyle: opt.id })}
                className={cn(
                  "flex h-12 flex-col justify-center rounded-lg border px-3 text-left transition-colors duration-150",
                  on
                    ? "border-primary bg-secondary text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Symbols and notes stay in place when you change artwork or background.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Anatomy color</Label>
          <button
            type="button"
            className={cn(
              "text-xs",
              appearance.fillAuto ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setAppearance({ fillAuto: true })}
          >
            Auto
          </button>
        </div>
        <SwatchRow
          auto={appearance.fillAuto}
          value={appearance.fillColor}
          onPick={(color) => setAppearance({ fillAuto: false, fillColor: color })}
        />
      </div>
    </div>
  );
}

function SwatchRow({
  auto,
  value,
  onPick,
}: {
  auto: boolean;
  value: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILL_SWATCHES.map((s) => {
        const on = !auto && value.toLowerCase() === s.color.toLowerCase();
        return (
          <button
            key={s.id}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-pressed={on}
            onClick={() => onPick(s.color)}
            className={cn(
              "size-8 rounded-md border transition-shadow duration-150",
              on ? "border-primary ring-2 ring-ring/70" : "border-border",
            )}
            style={{ backgroundColor: s.color }}
          />
        );
      })}
      <label className="relative size-8 overflow-hidden rounded-md border border-border">
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer appearance-none border-0 bg-transparent p-0"
        />
      </label>
    </div>
  );
}
