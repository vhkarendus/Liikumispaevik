import { useState } from "react";
import { Training } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { SPORT_TYPES } from "@/constants/sports";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function EditTrainingDialog({
  training, open, onClose, onSave,
}: {
  training: Training;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Training) => void;
}) {
  const isSportInList = SPORT_TYPES.includes(training.name as any);
  const [name, setName] = useState(isSportInList ? training.name : "");
  const [customName, setCustomName] = useState(isSportInList ? "" : training.name);
  const [isCustom, setIsCustom] = useState(!isSportInList);
  const [date, setDate] = useState(training.date);
  const [duration, setDuration] = useState(String(training.duration));
  const [note, setNote] = useState(training.note || "");
  const [visibility, setVisibility] = useState(training.visibility);
  const [effortType, setEffortType] = useState(training.effort_type || "");
  const [effortValue, setEffortValue] = useState(
    training.effort_value ? String(training.effort_value) : ""
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const finalName = isCustom ? customName : name;
    const newErrors: Record<string, string> = {};
    if (!finalName) newErrors.name = "Spordiala on kohustuslik";
    if (!date) newErrors.date = "Kuupäev on kohustuslik";
    if (date > todayStr()) newErrors.date = "Tuleviku kuupäev pole lubatud";
    const dur = parseInt(duration);
    if (!duration || isNaN(dur) || dur <= 10) newErrors.duration = "Kestus peab olema üle 10 minuti";
    else if (dur > 240) newErrors.duration = "Kestus ei saa ületada 240 minutit";
    if (effortType === "effort") {
      const v = parseInt(effortValue);
      if (!effortValue || isNaN(v) || v < 1 || v > 10) newErrors.effort = "Pingutus peab olema 1–10";
    }
    if (effortType === "heart_rate") {
      const v = parseInt(effortValue);
      if (!effortValue || isNaN(v) || v < 30 || v > 250) newErrors.effort = "Pulss peab olema 30–250 BPM";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    setSaving(true);

    // Save current state to history before updating
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("training_history").insert({
        training_id: training.id,
        user_id: user.id,
        name: training.name,
        date: training.date,
        duration: training.duration,
        note: training.note,
        visibility: training.visibility,
        effort_type: training.effort_type,
        effort_value: training.effort_value,
      });
    }

    const updates = {
      name: finalName,
      date,
      duration: parseInt(duration),
      note: note || null,
      visibility,
      effort_type: effortType || null,
      effort_value: effortValue ? parseInt(effortValue) : null,
    };
    const { error } = await supabase
      .from("trainings")
      .update(updates)
      .eq("id", training.id);
    setSaving(false);
    if (!error) {
      onSave({ ...training, ...updates });
      onClose();
      toast.success("Treening uuendatud!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Muuda treeningut</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-[13px] mb-0.5">Spordiala *</label>
            {!isCustom ? (
              <select value={name}
                onChange={(e) => {
                  if (e.target.value === "__custom__") { setIsCustom(true); setCustomName(""); }
                  else setName(e.target.value);
                }}
                className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.name ? "border-destructive" : "border-border"}`}>
                <option value="" disabled>Vali spordiala</option>
                {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">Muu...</option>
              </select>
            ) : (
              <div className="flex gap-1">
                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Sisesta spordiala"
                  className={`flex-1 border rounded-sm px-2 py-1 text-sm bg-background ${errors.name ? "border-destructive" : "border-border"}`} />
                <button type="button" onClick={() => { setIsCustom(false); setName(""); }}
                  className="text-xs text-primary cursor-pointer bg-transparent border-none underline">Nimekiri</button>
              </div>
            )}
            {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Kuupäev *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()}
              className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.date ? "border-destructive" : "border-border"}`} />
            {errors.date && <p className="text-xs text-destructive mt-0.5">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Kestus (minutites) * <span className="text-muted-foreground font-normal">(max 240)</span></label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={11} max={240}
              className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.duration ? "border-destructive" : "border-border"}`} />
            {errors.duration && <p className="text-xs text-destructive mt-0.5">{errors.duration}</p>}
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Märkus</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Pingutus / Pulss</label>
            <div className="flex gap-1 mb-1.5">
              {[
                { key: "", label: "Pole" },
                { key: "effort", label: "Pingutus" },
                { key: "heart_rate", label: "Pulss" },
              ].map((opt) => (
                <button key={opt.key} type="button"
                  onClick={() => { setEffortType(opt.key); setEffortValue(""); }}
                  className={`px-2 py-0.5 rounded-sm text-xs cursor-pointer border ${
                    effortType === opt.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {effortType === "effort" && (
              <input type="number" min={1} max={10} value={effortValue}
                onChange={(e) => setEffortValue(e.target.value)} placeholder="1–10"
                className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.effort ? "border-destructive" : "border-border"}`} />
            )}
            {effortType === "heart_rate" && (
              <input type="number" min={30} max={250} value={effortValue}
                onChange={(e) => setEffortValue(e.target.value)} placeholder="Keskmine pulss (BPM)"
                className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.effort ? "border-destructive" : "border-border"}`} />
            )}
            {errors.effort && <p className="text-xs text-destructive mt-0.5">{errors.effort}</p>}
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Nähtavus</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
              className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background">
              <option value="friends">Sõpradele</option>
              <option value="private">Privaatne</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer w-full disabled:opacity-50">
            {saving ? "Salvestan..." : "Salvesta muudatused"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
