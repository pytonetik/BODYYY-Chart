import { MousePointer2 } from "lucide-react";
import { GROUPS, SYMBOLS } from "@/lib/chart/symbols";
import { useChartStore } from "@/lib/chart/store";
import { cn } from "@/lib/utils";
import { SymbolGlyph } from "./symbol-glyph";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SymbolPalette({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const active = useChartStore((s) => s.activeSymbol);
  const setActive = useChartStore((s) => s.setActiveSymbol);

  if (orientation === "horizontal") {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={active === null ? "default" : "outline"}
              size="sm"
              className="h-11 shrink-0 px-3"
              onClick={() => setActive(null)}
              aria-pressed={active === null}
            >
              <MousePointer2 className="size-4" />
              Select
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select, move, and pan</TooltipContent>
        </Tooltip>
        {SYMBOLS.map((s) => {
          const on = active === s.id;
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-pressed={on}
                  aria-label={s.label}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm transition-colors duration-150",
                    on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="flex size-7 items-center justify-center rounded-sm bg-muted">
                    <SymbolGlyph id={s.id} size={18} />
                  </span>
                  <span className="hidden sm:inline">{s.short}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{s.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={active === null ? "default" : "outline"}
            size="sm"
            className="h-11 w-full justify-start gap-2 px-3"
            onClick={() => setActive(null)}
            aria-pressed={active === null}
          >
            <MousePointer2 className="size-4" />
            Select
          </Button>
        </TooltipTrigger>
        <TooltipContent>Select, move, and pan</TooltipContent>
      </Tooltip>

      {GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">{group.label}</p>
          <div className="grid grid-cols-1 gap-1">
            {SYMBOLS.filter((s) => s.group === group.id).map((s) => {
              const on = active === s.id;
              return (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setActive(s.id)}
                      aria-pressed={on}
                      className={cn(
                        "flex h-11 items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors duration-150",
                        on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="flex size-7 items-center justify-center rounded-sm bg-muted">
                        <SymbolGlyph id={s.id} size={18} />
                      </span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{s.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
