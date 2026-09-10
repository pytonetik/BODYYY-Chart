import { useMemo, useState } from "react";
import { SYMBOLS } from "@/lib/chart/symbols";
import { useChartStore } from "@/lib/chart/store";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SymbolGlyph } from "./symbol-glyph";

export function ShowAllDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const active = useChartStore((s) => s.activeSymbol);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...SYMBOLS]
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter(
        (s) =>
          !q ||
          s.label.toLowerCase().includes(q) ||
          s.short.toLowerCase().includes(q),
      );
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(90dvh,36rem)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Symbols</DialogTitle>
          <DialogDescription>Search A–Z. Tap a symbol to stamp with it.</DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbols"
          autoComplete="off"
          className="h-11"
          aria-label="Search symbols"
        />
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">
          {list.length === 0 ? (
            <p className="px-1 py-6 text-sm text-muted-foreground">No matching symbols.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((s) => {
                const on = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm",
                        on ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                      onClick={() => {
                        useChartStore.getState().setActiveSymbol(s.id);
                        useChartStore.getState().promoteRecent(s.id);
                        setQuery("");
                        onOpenChange(false);
                      }}
                    >
                      <span className="flex size-7 items-center justify-center rounded-sm bg-muted">
                        <SymbolGlyph id={s.id} size={18} />
                      </span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
