import { useState, useEffect } from "react";
import { Training } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";

type HistoryEntry = {
  id: string;
  name: string;
  date: string;
  duration: number;
  note: string | null;
  visibility: string;
  effort_type: string | null;
  effort_value: number | null;
  changed_at: string;
};

export default function TrainingHistoryDialog({
  training, open, onClose, onRestore,
}: {
  training: Training;
  open: boolean;
  onClose: () => void;
  onRestore: (updated: Training) => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("training_history")
      .select("*")
      .eq("training_id", training.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => {
        setHistory((data as HistoryEntry[]) || []);
        setLoading(false);
      });
  }, [open, training.id]);

  const handleRestore = async (entry: HistoryEntry) => {
    // Save current state to history first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    const updates = {
      name: entry.name,
      date: entry.date,
      duration: entry.duration,
      note: entry.note,
      visibility: entry.visibility,
      effort_type: entry.effort_type,
      effort_value: entry.effort_value,
    };

    const { error } = await supabase
      .from("trainings")
      .update(updates)
      .eq("id", training.id);

    if (!error) {
      onRestore({ ...training, ...updates });
      onClose();
      toast.success("Treening taastatud!");
    }
  };

  const formatDt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[450px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Muudatuste ajalugu
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <div className="border border-primary/30 rounded-sm p-2 mb-3 bg-primary/5">
            <div className="text-xs font-medium text-muted-foreground mb-0.5">Praegune olek</div>
            <div className="text-sm font-bold">{training.name}</div>
            <div className="text-xs text-muted-foreground">{training.date} · {training.duration} min</div>
            {training.note && <div className="text-xs mt-0.5">{training.note}</div>}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Laadin...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Muudatusi pole veel tehtud.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border border-border rounded-sm p-2 bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{h.date} · {h.duration} min</div>
                      {h.note && <div className="text-xs mt-0.5">{h.note}</div>}
                      {h.effort_type && h.effort_value && (
                        <div className="text-xs text-muted-foreground">
                          {h.effort_type === "effort" ? `Pingutus: ${h.effort_value}/10` : `Pulss: ${h.effort_value} BPM`}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRestore(h)}
                      className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent">
                      <RotateCcw className="h-3 w-3" /> Taasta
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Muudetud: {formatDt(h.changed_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
