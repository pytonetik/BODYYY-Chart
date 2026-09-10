import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useNarrow } from "./use-narrow";

export function FileDialog({
  open,
  title,
  children,
  busy = false,
  okLabel = "OK",
  okVariant = "default",
  onCancel,
  onOk,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  busy?: boolean;
  okLabel?: string;
  okVariant?: "default" | "destructive";
  onCancel: () => void;
  onOk: () => void;
}) {
  const narrow = useNarrow();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent
        showClose={false}
        className={cn(
          "flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-5",
          narrow
            ? "top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            : "sm:max-w-md",
        )}
        onOpenAutoFocus={(e) => {
          const input = (e.currentTarget as HTMLElement).querySelector("input");
          if (input) {
            e.preventDefault();
            input.focus();
            input.select();
          }
        }}
      >
        <DialogHeader className="mb-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant={okVariant} className="h-11 flex-1" disabled={busy} onClick={onOk}>
            {busy ? "Saving…" : okLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  columns = 1,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; hint?: string }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                on
                  ? "border-primary bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="block text-sm font-medium text-foreground">{opt.label}</span>
              {opt.hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
