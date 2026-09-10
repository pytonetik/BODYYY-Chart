import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrintFormat, PrintOrientation, PrintQuality } from "@/lib/chart/export-png";
import { defaultFileStem, sanitizeFileStem } from "@/lib/chart/file";
import { exportChartPdf, exportChartPng } from "./chart-io";
import { ChoiceGroup, FileDialog } from "./file-dialog";

export function PrintButton({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState<PrintQuality>("print");
  const [orientation, setOrientation] = useState<PrintOrientation>("landscape");
  const [format, setFormat] = useState<PrintFormat>("png");
  const [stem, setStem] = useState(defaultFileStem());
  const [busy, setBusy] = useState(false);

  const openDialog = () => {
    setQuality("print");
    setOrientation("landscape");
    setFormat("png");
    setStem(defaultFileStem());
    setOpen(true);
  };

  const cancel = () => {
    if (busy) return;
    setOpen(false);
  };

  const ok = async () => {
    setBusy(true);
    try {
      const name = `${sanitizeFileStem(stem)}.${format}`;
      if (format === "png") await exportChartPng({ orientation, quality, filename: name });
      else await exportChartPdf({ orientation, quality, filename: name });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        className={full ? "h-11 w-full" : "h-11"}
        aria-label="Print"
        onClick={openDialog}
      >
        <Printer />
        {full ? null : <span>Print</span>}
      </Button>
      <FileDialog open={open} title="Print" busy={busy} onCancel={cancel} onOk={ok}>
        <ChoiceGroup
          label="Quality"
          value={quality}
          onChange={setQuality}
          options={[
            { id: "draft", label: "Draft", hint: "150 dpi · smaller file · on-screen check" },
            { id: "print", label: "Print", hint: "300 dpi · clinic laser" },
            { id: "high", label: "High", hint: "600 dpi · archive / sharp print · larger file" },
          ]}
        />
        <ChoiceGroup
          label="Orientation"
          value={orientation}
          onChange={setOrientation}
          columns={2}
          options={[
            { id: "landscape", label: "Landscape" },
            { id: "portrait", label: "Portrait" },
          ]}
        />
        <ChoiceGroup
          label="Format"
          value={format}
          onChange={setFormat}
          columns={2}
          options={[
            { id: "png", label: "PNG" },
            { id: "pdf", label: "PDF" },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="print-filename">File name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="print-filename"
              value={stem}
              autoComplete="off"
              className="h-11"
              onChange={(e) => setStem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ok();
              }}
            />
            <span className="w-10 shrink-0 text-sm text-muted-foreground">.{format}</span>
          </div>
        </div>
      </FileDialog>
    </>
  );
}
