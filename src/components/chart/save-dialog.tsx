import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultFileStem, sanitizeFileStem } from "@/lib/chart/file";
import { saveChart } from "./chart-io";
import { FileDialog } from "./file-dialog";

export function SaveButton({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState(false);
  const [stem, setStem] = useState(defaultFileStem());
  const [busy, setBusy] = useState(false);

  const openDialog = () => {
    setStem(defaultFileStem());
    setOpen(true);
  };

  useEffect(() => {
    const onSave = () => openDialog();
    window.addEventListener("bodychart:save", onSave);
    return () => window.removeEventListener("bodychart:save", onSave);
  }, []);

  const cancel = () => {
    if (busy) return;
    setOpen(false);
  };

  const ok = () => {
    setBusy(true);
    try {
      saveChart(`${sanitizeFileStem(stem)}.json`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={full ? "h-11 w-full" : "h-11"} onClick={openDialog}>
        <Download />
        Save
      </Button>
      <FileDialog open={open} title="Save" busy={busy} onCancel={cancel} onOk={ok}>
        <div className="space-y-2">
          <Label htmlFor="save-filename">File name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="save-filename"
              value={stem}
              autoComplete="off"
              className="h-11"
              onChange={(e) => setStem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ok();
              }}
            />
            <span className="shrink-0 text-sm text-muted-foreground">.json</span>
          </div>
        </div>
      </FileDialog>
    </>
  );
}
