import { MARK_SWATCHES, SYMBOL_MAP } from "@/lib/chart/symbols";
import { useChartStore } from "@/lib/chart/store";
import { isRankedSymbol, rankTag, resolveSource } from "@/lib/chart/ranks";
import {
  DEPTHS,
  DEPTH_LABEL,
  FLUCTUATIONS,
  FLUCTUATION_LABEL,
  PATTERNS,
  PATTERN_LABEL,
  QUALITIES,
  QUALITY_LABEL,
  ROM_FRACTIONS,
  emptyRomLine,
  formatRomLine,
  optionsAz,
  type RomLine,
  type ShowKey,
} from "@/lib/chart/fields";
import { DEFAULT_LABEL_SCALE, MAX_LABEL_SCALE, MAX_LABEL_SIZE, MAX_MARK_SIZE, MIN_LABEL_SCALE, MIN_LABEL_SIZE, MIN_MARK_SIZE, type Mark } from "@/lib/chart/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SymbolGlyph } from "./symbol-glyph";

export function MarkFieldsForm({
  mark,
  idPrefix = "mark",
}: {
  mark: Mark;
  idPrefix?: string;
}) {
  const updateMark = useChartStore((s) => s.updateMark);
  const updateCallout = useChartStore((s) => s.updateCallout);
  const setRank = useChartStore((s) => s.setRank);
  const setLinked = useChartStore((s) => s.setLinked);
  const setRadiating = useChartStore((s) => s.setRadiating);
  const marks = useChartStore((s) => s.marks);
  const editor = resolveSource(marks, mark);
  const color = editor.color;
  const autoColor = !color;
  const autoBorder = !editor.labelBorder;
  const c = editor.callout;
  const ranked = isRankedSymbol(editor.symbol);
  const prefix = editor.symbol === "pain" ? "P" : "N";
  const isPain = editor.symbol === "pain";

  const toggleShow = (key: ShowKey) => {
    updateCallout(editor.id, { show: { [key]: !c.show[key] } });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-md bg-muted">
          <SymbolGlyph id={editor.symbol} size={22} color={color || undefined} />
        </span>
        <p className="truncate text-sm font-medium">
          {SYMBOL_MAP[editor.symbol].label}
          {rankTag(editor) ? ` · ${rankTag(editor)}` : ""}
          {mark.pairFrom || mark.radiatingFrom ? " · destination" : ""}
        </p>
      </div>

      {ranked ? (
        <>
          <div className="space-y-2">
            <Label>{prefix}-number</Label>
            <Select
              value={editor.rank ? `${prefix}${editor.rank}` : "none"}
              onValueChange={(v) => setRank(editor.id, v === "none" ? null : Number(v.slice(1)))}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                  <SelectItem key={n} value={`${prefix}${n}`}>
                    {prefix}
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPain ? (
            <div className="grid grid-cols-2 gap-3">
              <LinkedToggle
                label="Referred"
                on={Boolean(editor.pairTo)}
                onChange={(v) => setLinked(editor.id, v)}
              />
              <LinkedToggle
                label="Radiating"
                on={Boolean(editor.radiatingTo)}
                onChange={(v) => setRadiating(editor.id, v)}
              />
            </div>
          ) : (
            <LinkedToggle
              label="Radiating"
              on={Boolean(editor.pairTo)}
              onChange={(v) => setLinked(editor.id, v)}
            />
          )}
          {mark.radiatingFrom ? (
            <p className="text-xs text-muted-foreground">
              Lightning-bolt end. Drag it to the remote area; the callout stays on the source Pain.
            </p>
          ) : mark.pairFrom ? (
            <p className="text-xs text-muted-foreground">
              Destination stamp. Drag it to the remote area; the callout stays on the source.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Size</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{Math.round(editor.size)}</span>
        </div>
        <Slider
          min={MIN_MARK_SIZE}
          max={MAX_MARK_SIZE}
          step={1}
          value={[editor.size]}
          className="h-11"
          onValueChange={([v]) => updateMark(editor.id, { size: v ?? editor.size })}
        />
      </div>

      <SwatchBlock
        title="Color"
        auto={autoColor}
        value={color}
        fallback="#e23b2e"
        onAuto={() => updateMark(editor.id, { color: "" })}
        onPick={(val) => updateMark(editor.id, { color: val })}
      />

      <SwatchBlock
        title="Box outline"
        auto={autoBorder}
        value={editor.labelBorder}
        fallback={color || "#e23b2e"}
        onAuto={() => updateMark(editor.id, { labelBorder: "" })}
        onPick={(val) => updateMark(editor.id, { labelBorder: val })}
      />

      <FieldHead label="Pattern" shown={c.show.pattern} onToggle={() => toggleShow("pattern")} />
      <EnumSelect
        value={c.pattern}
        noneLabel="None"
        onChange={(v) => updateCallout(editor.id, { pattern: v as Mark["callout"]["pattern"] })}
        options={optionsAz(PATTERNS, PATTERN_LABEL)}
      />

      <FieldHead label="Fluctuation" shown={c.show.fluctuation} onToggle={() => toggleShow("fluctuation")} />
      <EnumSelect
        value={c.fluctuation}
        noneLabel="None"
        onChange={(v) => updateCallout(editor.id, { fluctuation: v as Mark["callout"]["fluctuation"] })}
        options={optionsAz(FLUCTUATIONS, FLUCTUATION_LABEL)}
      />

      <FieldHead label="Pain quality" shown={c.show.quality} onToggle={() => toggleShow("quality")} />
      <EnumSelect
        value={c.quality}
        noneLabel="None"
        onChange={(v) => updateCallout(editor.id, { quality: v as Mark["callout"]["quality"] })}
        options={optionsAz(QUALITIES, QUALITY_LABEL)}
      />

      <FieldHead label="Anatomical depth" shown={c.show.depth} onToggle={() => toggleShow("depth")} />
      <EnumSelect
        value={c.depth}
        noneLabel="None"
        onChange={(v) => updateCallout(editor.id, { depth: v as Mark["callout"]["depth"] })}
        options={optionsAz(DEPTHS, DEPTH_LABEL)}
      />

      <ScoreField
        label="Pre Rx"
        shown={c.show.b}
        value={c.b}
        onToggle={() => toggleShow("b")}
        onChange={(n) => updateCallout(editor.id, { b: n })}
      />

      <ScoreField
        label="Post Rx"
        shown={c.show.w}
        value={c.w}
        onToggle={() => toggleShow("w")}
        onChange={(n) => updateCallout(editor.id, { w: n })}
      />

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Note</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          rows={3}
          value={c.notes}
          placeholder="Stored, not drawn"
          onChange={(e) => updateCallout(editor.id, { notes: e.target.value })}
        />
      </div>

      <FieldHead label="Text" shown={c.show.text} onToggle={() => toggleShow("text")} />
      <Input
        id={`${idPrefix}-label`}
        value={editor.label}
        placeholder="Last line on the chart"
        autoComplete="off"
        className="h-11"
        onChange={(e) => updateMark(editor.id, { label: e.target.value })}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Text size</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{Math.round(editor.labelSize)} px</span>
        </div>
        <Slider
          min={MIN_LABEL_SIZE}
          max={MAX_LABEL_SIZE}
          step={1}
          value={[editor.labelSize]}
          className="h-11"
          onValueChange={([v]) => updateMark(editor.id, { labelSize: v ?? editor.labelSize })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Box size</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {(editor.labelScale ?? DEFAULT_LABEL_SCALE).toFixed(2)}×
          </span>
        </div>
        <Slider
          min={MIN_LABEL_SCALE}
          max={MAX_LABEL_SCALE}
          step={0.05}
          value={[editor.labelScale ?? DEFAULT_LABEL_SCALE]}
          className="h-11"
          onValueChange={([v]) => updateMark(editor.id, { labelScale: v ?? editor.labelScale })}
        />
      </div>

      <FieldHead label="AROM / PROM" shown={c.show.rom !== false} onToggle={() => toggleShow("rom")} />
      <RomEditor
        lines={c.rom ?? []}
        onChange={(rom) => updateCallout(editor.id, { rom })}
      />
    </div>
  );
}

function LinkedToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={!on}
          className={cn(
            "h-11 rounded-lg border text-sm",
            !on ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground",
          )}
          onClick={() => onChange(false)}
        >
          Off
        </button>
        <button
          type="button"
          aria-pressed={on}
          className={cn(
            "h-11 rounded-lg border text-sm",
            on ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground",
          )}
          onClick={() => onChange(true)}
        >
          On
        </button>
      </div>
    </div>
  );
}

function RomEditor({
  lines,
  onChange,
}: {
  lines: RomLine[];
  onChange: (next: RomLine[]) => void;
}) {
  const setLine = (id: string, patch: Partial<RomLine>) => {
    onChange(lines.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.id} className="rounded-lg border border-border p-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value={line.side || "none"} onValueChange={(v) => setLine(line.id, { side: v === "none" ? "" : (v as RomLine["side"]) })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="L / R" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">L / R</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="R">R</SelectItem>
              </SelectContent>
            </Select>
            <Select value={line.kind || "none"} onValueChange={(v) => setLine(line.id, { kind: v === "none" ? "" : (v as RomLine["kind"]) })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="AROM / PROM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">AROM / PROM</SelectItem>
                <SelectItem value="AROM">AROM</SelectItem>
                <SelectItem value="PROM">PROM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            className="h-11"
            placeholder="Joint"
            value={line.joint}
            onChange={(e) => setLine(line.id, { joint: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              className="h-11 min-w-0 flex-1"
              placeholder="Degree or fraction"
              list={`rom-frac-${line.id}`}
              value={line.amount}
              onChange={(e) => setLine(line.id, { amount: e.target.value })}
            />
            <datalist id={`rom-frac-${line.id}`}>
              {[...ROM_FRACTIONS].sort((a, b) => a.localeCompare(b, "en")).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <Select
              value={ROM_FRACTIONS.includes(line.amount as (typeof ROM_FRACTIONS)[number]) ? line.amount : "custom"}
              onValueChange={(v) => {
                if (v !== "custom") setLine(line.id, { amount: v });
              }}
            >
              <SelectTrigger className="h-11 w-28">
                <SelectValue placeholder="Pick" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Type</SelectItem>
                {[...ROM_FRACTIONS].sort((a, b) => a.localeCompare(b, "en")).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              className="h-11 shrink-0 px-2 text-xs text-destructive"
              onClick={() => onChange(lines.filter((r) => r.id !== line.id))}
            >
              Delete
            </button>
          </div>
          {formatRomLine(line) ? (
            <p className="text-xs tabular-nums text-muted-foreground">{formatRomLine(line)}</p>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="h-11 w-full rounded-lg border border-dashed border-border text-sm"
        onClick={() => onChange([...lines, emptyRomLine()])}
      >
        Add AROM / PROM line
      </button>
    </div>
  );
}

function FieldHead({
  label,
  shown,
  onToggle,
}: {
  label: string;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label>{label}</Label>
      <button
        type="button"
        className={cn("h-11 text-xs", shown ? "text-foreground" : "text-muted-foreground")}
        onClick={onToggle}
      >
        {shown ? "Show" : "Hide"}
      </button>
    </div>
  );
}

function EnumSelect({
  value,
  noneLabel,
  onChange,
  options,
}: {
  value: string;
  noneLabel: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className="h-11">
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{noneLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ScoreField({
  label,
  shown,
  value,
  onToggle,
  onChange,
}: {
  label: string;
  shown: boolean;
  value: number | null;
  onToggle: () => void;
  onChange: (n: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label} 0–10
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {value === null ? "—" : `${label} ${value}/10`}
          </span>
          <button
            type="button"
            className={cn("h-11 text-xs", shown ? "text-foreground" : "text-muted-foreground")}
            onClick={onToggle}
          >
            {shown ? "Show" : "Hide"}
          </button>
        </div>
      </div>
      <Slider
        min={0}
        max={10}
        step={1}
        value={[value ?? 0]}
        className="h-11"
        onValueChange={([v]) => onChange(v ?? 0)}
      />
      {value !== null ? (
        <button type="button" className="h-11 text-xs text-muted-foreground" onClick={() => onChange(null)}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

function SwatchBlock({
  title,
  auto,
  value,
  fallback,
  onAuto,
  onPick,
}: {
  title: string;
  auto: boolean;
  value: string;
  fallback: string;
  onAuto: () => void;
  onPick: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{title}</Label>
        <button
          type="button"
          className={cn("h-11 text-xs", auto ? "text-foreground" : "text-muted-foreground")}
          onClick={onAuto}
        >
          Auto
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {MARK_SWATCHES.map((s) => {
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
                "size-9 rounded-md border transition-shadow duration-150",
                on ? "border-primary ring-2 ring-ring/70" : "border-border",
              )}
              style={{ backgroundColor: s.color }}
            />
          );
        })}
        <label className="relative size-9 overflow-hidden rounded-md border border-border">
          <span className="sr-only">Custom color</span>
          <input
            type="color"
            value={value || fallback}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer appearance-none border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
  );
}
