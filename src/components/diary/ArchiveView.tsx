import { useState } from "react";
import { Training, TrainingGroup } from "@/types/training";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

export default function ArchiveView({
  trainings, groups, onDelete,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  onDelete: (id: string) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteId) { onDelete(deleteId); setDeleteId(null); }
  };

  // Group trainings
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

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">Arhiiv</h2>

      {/* Grouped */}
      {Array.from(groupMap.entries()).map(([gid, items]) => {
        const group = groups.find((g) => g.id === gid);
        return (
          <div key={gid} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
            <div className="text-sm font-bold mb-2">
              📅 {group?.name || "Periood"}: {group?.start_date} – {group?.end_date}
            </div>
            <TrainingTable trainings={items} onDeleteClick={setDeleteId} />
          </div>
        );
      })}

      {/* Ungrouped */}
      {ungrouped.length === 0 && groupMap.size === 0 ? (
        <p className="text-sm">Arhiiv on tühi</p>
      ) : (
        <TrainingTable trainings={ungrouped} onDeleteClick={setDeleteId} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kas oled kindel, et tahad kustutada?</AlertDialogTitle>
            <AlertDialogDescription>Seda tegevust ei saa tagasi võtta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tühista</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Jah, kustuta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrainingTable({ trainings, onDeleteClick }: { trainings: Training[]; onDeleteClick: (id: string) => void }) {
  if (trainings.length === 0) return null;
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-1 pr-2">Kuupäev</th>
          <th className="text-left py-1 pr-2">Nimetus</th>
          <th className="text-left py-1 pr-2">Kestus</th>
          <th className="text-left py-1 pr-2">Märkus</th>
          <th className="text-left py-1 pr-2">Lisatud</th>
          <th className="text-left py-1"></th>
        </tr>
      </thead>
      <tbody>
        {trainings.map((t) => (
          <tr key={t.id} className="border-b border-border">
            <td className="py-1 pr-2">{t.date}</td>
            <td className="py-1 pr-2">{t.name}</td>
            <td className="py-1 pr-2">{t.duration} min</td>
            <td className="py-1 pr-2">{t.note}</td>
            <td className="py-1 pr-2 text-[11px] text-muted-foreground">{formatDateTime(t.created_at)}</td>
            <td className="py-1">
              <button onClick={() => onDeleteClick(t.id)}
                className="text-destructive text-xs cursor-pointer border border-destructive rounded-sm px-2 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground">
                Kustuta
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
