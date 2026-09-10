import { cn } from "@/lib/utils";

export const LEGAL_LINE = "© 2026 AidenPYT. All rights reserved.";

export function LegalNotice({
  placement,
}: {
  placement: "header" | "footer";
}) {
  return (
    <p
      className={cn(
        "pointer-events-none max-w-full truncate text-muted-foreground",
        placement === "header"
          ? "text-[11px] leading-4"
          : "px-3 pt-1 text-[10px] leading-4 pb-[max(0.4rem,env(safe-area-inset-bottom))]",
      )}
    >
      {LEGAL_LINE}
    </p>
  );
}
