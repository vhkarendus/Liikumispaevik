import { useState } from "react";
import { TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function EditPeriodDialog({
  group, open, onClose, onSave,
}: {
  group: TrainingGroup;
  open: boolean;
  onClose: () => void;
  onSave: (updated: TrainingGroup) => void;
}) {
  const [name, setName] = useState(group.name);
  const [startDate, setStartDate] = useState(group.start_date);
  const [endDate, setEndDate] = useState(group.end_date);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = "Perioodi nimi on kohustuslik";
    if (!startDate) newErrors.startDate = "Alguskuupäev on kohustuslik";
    if (!endDate) newErrors.endDate = "Lõppkuupäev on kohustuslik";
    if (startDate && endDate) {
      if (startDate >= endDate) newErrors.endDate = "Lõppkuupäev peab olema hilisem kui algus";
      const diff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 2) newErrors.endDate = "Periood peab olema vähemalt 2 päeva pikk";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    setSaving(true);

    // Save current state to history before updating
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("period_history").insert({
        period_id: group.id,
        user_id: user.id,
        name: group.name,
        start_date: group.start_date,
        end_date: group.end_date,
      });
    }

    const { error } = await supabase
      .from("training_groups")
      .update({ name, start_date: startDate, end_date: endDate })
      .eq("id", group.id);
    setSaving(false);

    if (!error) {
      onSave({ ...group, name, start_date: startDate, end_date: endDate });
      onClose();
      toast.success("Periood uuendatud!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[400px]">
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
          <div>
            <label className="block text-[13px] mb-0.5">Alguskuupäev *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={todayStr()}
              className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.startDate ? "border-destructive" : "border-border"}`} />
            {errors.startDate && <p className="text-xs text-destructive mt-0.5">{errors.startDate}</p>}
          </div>
          <div>
            <label className="block text-[13px] mb-0.5">Lõppkuupäev *</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayStr()} min={startDate}
              className={`w-full border rounded-sm px-2 py-1 text-sm bg-background ${errors.endDate ? "border-destructive" : "border-border"}`} />
            {errors.endDate && <p className="text-xs text-destructive mt-0.5">{errors.endDate}</p>}
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
