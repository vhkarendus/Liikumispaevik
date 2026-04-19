import { useState, useEffect } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SPORT_TYPES } from "@/constants/sports";
import { Trash2 } from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10);

type DayRow = {
  id?: string; // existing training id
  date: string;
  name: string;
  duration: string;
  note: string;
  effortType: string;
  effortValue: string;
  enabled: boolean;
  _deleted?: boolean;
};

export default function EditPeriodDialog({
  group, open, onClose, onSave,
}: {
  group: TrainingGroup;
  open: boolean;
  onClose: () => void;
  onSave: (updated: TrainingGroup, updatedTrainings: Training[]) => void;
}) {
  const [name, setName] = useState(group.name);
  const [startDate, setStartDate] = useState(group.start_date);
  const [endDate, setEndDate] = useState(group.end_date);
  const [days, setDays] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load trainings for this period and merge with full date range
  useEffect(() => {
    if (!open) return;
    setName(group.name);
    setStartDate(group.start_date);
    setEndDate(group.end_date);
    setErrors({});

    const load = async () => {
      const { data } = await supabase
        .from("trainings")
        .select("*")
        .eq("group_id", group.id)
        .is("deleted_at", null);
      const existing = (data as Training[]) || [];
      buildDays(group.start_date, group.end_date, existing);
    };
    load();
  }, [open, group.id]);

  const buildDays = (start: string, end: string, existing: Training[]) => {
    const map = new Map<string, Training>();
    for (const t of existing) map.set(t.date, t);
    const rows: DayRow[] = [];
    const s = new Date(start);
    const e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const ex = map.get(ds);
      rows.push({
        id: ex?.id,
        date: ds,
        name: ex?.name || "",
        duration: ex ? String(ex.duration) : "",
        note: ex?.note || "",
        effortType: ex?.effort_type || "",
        effortValue: ex?.effort_value ? String(ex.effort_value) : "",
        enabled: !!ex,
      });
    }
    // Include existing trainings that fall outside the new range (so user can decide to delete or keep)
    for (const t of existing) {
      if (!rows.find((r) => r.date === t.date)) {
        rows.push({
          id: t.id,
          date: t.date,
          name: t.name,
          duration: String(t.duration),
          note: t.note || "",
          effortType: t.effort_type || "",
          effortValue: t.effort_value ? String(t.effort_value) : "",
          enabled: true,
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    setDays(rows);
  };

  // Rebuild days when date range changes (preserving user input)
  useEffect(() => {
    if (!open || !startDate || !endDate) return;
    setDays((prev) => {
      const map = new Map<string, DayRow>();
      for (const r of prev) map.set(r.date, r);
      const rows: DayRow[] = [];
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return prev;
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10);
        rows.push(map.get(ds) || {
          date: ds, name: "", duration: "", note: "",
          effortType: "", effortValue: "", enabled: false,
        });
      }
      // Keep out-of-range existing trainings (so the user can manually delete)
      for (const r of prev) {
        if (r.id && !rows.find((x) => x.date === r.date)) {
          rows.push(r);
        }
      }
      rows.sort((a, b) => a.date.localeCompare(b.date));
      return rows;
    });
  }, [startDate, endDate, open]);

  const updateDay = (idx: number, field: keyof DayRow, value: string | boolean) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const validateRow = (d: DayRow): string | null => {
    if (!d.enabled) return null;
    if (!d.name) return "Spordiala puudu";
    if (!d.duration) return "Kestus puudu";
    const dur = parseInt(d.duration);
    if (isNaN(dur) || dur <= 10) return "Kestus peab olema üle 10 min";
    if (dur > 240) return "Kestus ei saa ületada 240 min";
    if (d.effortType === "effort") {
      const v = parseInt(d.effortValue);
      if (isNaN(v) || v < 1 || v > 10) return "Pingutus 1–10";
    }
    if (d.effortType === "heart_rate") {
      const v = parseInt(d.effortValue);
      if (isNaN(v) || v < 30 || v > 250) return "Pulss 30–250";
    }
    return null;
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = "Perioodi nimi on kohustuslik";
    if (!startDate) newErrors.startDate = "Alguskuupäev on kohustuslik";
    if (!endDate) newErrors.endDate = "Lõppkuupäev on kohustuslik";
    if (startDate && endDate) {
      if (startDate >= endDate) newErrors.endDate = "Lõppkuupäev peab olema hilisem";
      const diff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      if (diff < 2) newErrors.endDate = "Periood peab olema vähemalt 2 päeva";
    }
    for (const d of days) {
      const err = validateRow(d);
      if (err) { toast.error(`${d.date}: ${err}`); return; }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // 1) Update period itself
    const { error: gErr } = await supabase
      .from("training_groups")
      .update({ name, start_date: startDate, end_date: endDate })
      .eq("id", group.id);
    if (gErr) { setSaving(false); toast.error("Perioodi salvestamine ebaõnnestus"); return; }

    // 2) Sync trainings: update existing, insert new, soft-delete disabled-existing
    const updatedTrainings: Training[] = [];
    for (const d of days) {
      const payload = {
        name: d.name,
        date: d.date,
        duration: parseInt(d.duration || "0"),
        note: d.note || null,
        effort_type: d.effortType || null,
        effort_value: d.effortValue ? parseInt(d.effortValue) : null,
      };
      if (d.id && d.enabled) {
        const { data } = await supabase.from("trainings").update(payload).eq("id", d.id).select().single();
        if (data) updatedTrainings.push(data as Training);
      } else if (d.id && !d.enabled) {
        // soft-delete this training
        const now = new Date().toISOString();
        await supabase.from("trainings").update({ deleted_at: now }).eq("id", d.id);
      } else if (!d.id && d.enabled) {
        const { data } = await supabase.from("trainings").insert({
          ...payload,
          user_id: user.id,
          group_id: group.id,
          visibility: "friends",
        }).select().single();
        if (data) updatedTrainings.push(data as Training);
      }
    }

    setSaving(false);
    onSave({ ...group, name, start_date: startDate, end_date: endDate }, updatedTrainings);
    onClose();
    toast.success("Periood uuendatud!");
  };

  const weekday = (s: string) => new Date(s).toLocaleDateString("et-EE", { weekday: "short" });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Muuda perioodi</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-[13px] mb-0.5">Perioodi nimi *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.name ? "border-destructive" : "border-border"}`} />
            {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[13px] mb-0.5">Algus *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={todayStr()}
                className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.startDate ? "border-destructive" : "border-border"}`} />
              {errors.startDate && <p className="text-xs text-destructive mt-0.5">{errors.startDate}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-[13px] mb-0.5">Lõpp *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayStr()} min={startDate}
                className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.endDate ? "border-destructive" : "border-border"}`} />
              {errors.endDate && <p className="text-xs text-destructive mt-0.5">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Treeningud perioodis ({days.filter(d => d.enabled).length})
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Märgi linnukesega päevad, mil treenisid. Tühjenda linnuke, et päev eemaldada.
            </p>
            <div className="space-y-2">
              {days.map((day, idx) => (
                <div key={day.date} className={`border border-border rounded-sm p-2 ${!day.enabled ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input type="checkbox" checked={day.enabled}
                      onChange={(e) => updateDay(idx, "enabled", e.target.checked)} className="accent-primary" />
                    <span className="text-sm font-medium">{day.date}</span>
                    <span className="text-xs text-muted-foreground">({weekday(day.date)})</span>
                  </div>
                  {day.enabled && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1.5">
                        <select value={SPORT_TYPES.includes(day.name as any) || day.name === "" ? day.name : "__custom__"}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") updateDay(idx, "name", " ");
                            else updateDay(idx, "name", e.target.value);
                          }}
                          className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background">
                          <option value="" disabled>Spordiala</option>
                          {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                          <option value="__custom__">Muu...</option>
                        </select>
                        <input type="number" placeholder="Min" value={day.duration}
                          onChange={(e) => updateDay(idx, "duration", e.target.value)}
                          className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                        <input type="text" placeholder="Märkus" value={day.note}
                          onChange={(e) => updateDay(idx, "note", e.target.value)}
                          className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                      </div>
                      {!SPORT_TYPES.includes(day.name as any) && day.name !== "" && (
                        <input type="text" placeholder="Sisesta spordiala" value={day.name.trim()}
                          onChange={(e) => updateDay(idx, "name", e.target.value)}
                          className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background w-full" />
                      )}
                      <div className="flex gap-1.5 items-center">
                        <select value={day.effortType}
                          onChange={(e) => { updateDay(idx, "effortType", e.target.value); updateDay(idx, "effortValue", ""); }}
                          className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background">
                          <option value="">Pole</option>
                          <option value="effort">Pingutus</option>
                          <option value="heart_rate">Pulss</option>
                        </select>
                        {day.effortType === "effort" && (
                          <input type="number" min={1} max={10} placeholder="1-10" value={day.effortValue}
                            onChange={(e) => updateDay(idx, "effortValue", e.target.value)}
                            className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background w-16" />
                        )}
                        {day.effortType === "heart_rate" && (
                          <input type="number" min={30} max={250} placeholder="BPM" value={day.effortValue}
                            onChange={(e) => updateDay(idx, "effortValue", e.target.value)}
                            className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background w-16" />
                        )}
                        {day.id && (
                          <button type="button" onClick={() => updateDay(idx, "enabled", false)}
                            title="Eemalda see treening"
                            className="ml-auto text-destructive text-xs cursor-pointer bg-transparent border border-destructive rounded-sm px-1.5 py-0.5">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer w-full disabled:opacity-50">
            {saving ? "Salvestan..." : "Salvesta"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
