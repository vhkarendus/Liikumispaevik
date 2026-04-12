import { useState, useEffect } from "react";
import { TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";

type PeriodHistoryEntry = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  changed_at: string;
};

export default function PeriodHistoryDialog({
  group, open, onClose, onRestore,
}: {
  group: TrainingGroup;
  open: boolean;
  onClose: () => void;
  onRestore: (updated: TrainingGroup) => void;
}) {
  const [history, setHistory] = useState<PeriodHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("period_history")
      .select("*")
      .eq("period_id", group.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => {
        setHistory((data as PeriodHistoryEntry[]) || []);
        setLoading(false);
      });
  }, [open, group.id]);

  const handleRestore = async (entry: PeriodHistoryEntry) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save current state to history
    await supabase.from("period_history").insert({
      period_id: group.id,
      user_id: user.id,
      name: group.name,
      start_date: group.start_date,
      end_date: group.end_date,
    });

    const updates = {
      name: entry.name,
      start_date: entry.start_date,
      end_date: entry.end_date,
    };

    const { error } = await supabase
      .from("training_groups")
      .update(updates)
      .eq("id", group.id);

    if (!error) {
      onRestore({ ...group, ...updates });
      onClose();
      toast.success("Periood taastatud!");
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
            <History className="h-4 w-4" /> Perioodi muudatuste ajalugu
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <div className="border border-primary/30 rounded-sm p-2 mb-3 bg-primary/5">
            <div className="text-xs font-medium text-muted-foreground mb-0.5">Praegune olek</div>
            <div className="text-sm font-bold">{group.name}</div>
            <div className="text-xs text-muted-foreground">{group.start_date} – {group.end_date}</div>
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
                      <div className="text-xs text-muted-foreground">{h.start_date} – {h.end_date}</div>
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
