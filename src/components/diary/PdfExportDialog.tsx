import { useState } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportTrainingsPdf } from "./PdfExport";

export default function PdfExportDialog({ trainings, groups, open, onClose }: {
  trainings: Training[]; groups: TrainingGroup[]; open: boolean; onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const groupMap = new Map<string, Training[]>();
  const ungrouped: Training[] = [];
  for (const t of trainings) {
    if (t.group_id) {
      if (!groupMap.has(t.group_id)) groupMap.set(t.group_id, []);
      groupMap.get(t.group_id)!.push(t);
    } else {
      ungrouped.push(t);
    }
  }

  const toggleGroup = (gid: string) => {
    const next = new Set(selectedGroupIds);
    if (next.has(gid)) next.delete(gid); else next.add(gid);
    setSelectedGroupIds(next);
  };

  const toggleSingle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleExport = () => {
    const exportTrainings: Training[] = [];
    for (const gid of selectedGroupIds) {
      const items = groupMap.get(gid);
      if (items) exportTrainings.push(...items);
    }
    for (const id of selectedIds) {
      const t = ungrouped.find((tr) => tr.id === id);
      if (t) exportTrainings.push(t);
    }
    if (exportTrainings.length === 0) return;
    const exportGroups = groups.filter((g) => selectedGroupIds.has(g.id));
    exportTrainingsPdf(exportTrainings, exportGroups, "Treeningute eksport");
    onClose();
  };

  const selectAll = () => {
    setSelectedGroupIds(new Set(Array.from(groupMap.keys())));
    setSelectedIds(new Set(ungrouped.map((t) => t.id)));
  };

  const selectNone = () => {
    setSelectedGroupIds(new Set());
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vali eksporditavad treeningud</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          <div className="flex gap-2 mb-2">
            <button onClick={selectAll} className="text-xs text-primary cursor-pointer bg-transparent border-none underline">Vali kõik</button>
            <button onClick={selectNone} className="text-xs text-muted-foreground cursor-pointer bg-transparent border-none underline">Tühjenda valik</button>
          </div>

          {Array.from(groupMap.entries()).map(([gid, items]) => {
            const group = groups.find((g) => g.id === gid);
            return (
              <label key={gid} className="flex items-start gap-2 p-2 border border-border rounded-sm cursor-pointer hover:bg-accent/50">
                <input type="checkbox" checked={selectedGroupIds.has(gid)} onChange={() => toggleGroup(gid)} className="accent-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium">📅 {group?.name || "Periood"}: {group?.start_date} – {group?.end_date}</div>
                  <div className="text-xs text-muted-foreground">{items.length} treeningut</div>
                </div>
              </label>
            );
          })}

          {ungrouped.map((t) => (
            <label key={t.id} className="flex items-start gap-2 p-2 border border-border rounded-sm cursor-pointer hover:bg-accent/50">
              <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSingle(t.id)} className="accent-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.date} · {t.duration} min</div>
              </div>
            </label>
          ))}

          <button onClick={handleExport}
            disabled={selectedIds.size === 0 && selectedGroupIds.size === 0}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer w-full disabled:opacity-50 mt-2">
            Ekspordi PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
