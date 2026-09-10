import { useChartStore } from "@/lib/chart/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SessionFields({ idPrefix = "session" }: { idPrefix?: string }) {
  const meta = useChartStore((s) => s.meta);
  const setMeta = useChartStore((s) => s.setMeta);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-patient`}>Patient</Label>
        <Input
          id={`${idPrefix}-patient`}
          value={meta.patient}
          placeholder="Name or initials"
          autoComplete="off"
          className="h-11"
          onChange={(e) => setMeta({ patient: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`}>Date</Label>
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={meta.date}
            className="h-11"
            onChange={(e) => setMeta({ date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-clinician`}>Clinician</Label>
          <Input
            id={`${idPrefix}-clinician`}
            value={meta.clinician}
            placeholder="Initials"
            autoComplete="off"
            className="h-11"
            onChange={(e) => setMeta({ clinician: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Session notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={meta.notes}
          placeholder="Optional"
          rows={3}
          onChange={(e) => setMeta({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
