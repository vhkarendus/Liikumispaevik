import { useState, useMemo } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SPORT_TYPES } from "@/constants/sports";
import InfoTooltip from "./InfoTooltip";
import EditTrainingDialog from "./EditTrainingDialog";
import PdfExportButton from "./PdfExport";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "newest" | "oldest" | "duration_asc" | "duration_desc";

type TimelineItem =
  | { type: "single"; training: Training; sortDate: string; sortDuration: number }
  | { type: "period"; group: TrainingGroup; trainings: Training[]; sortDate: string; sortDuration: number };

function VisibilityDropdown({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const visLabel = current === "private" ? "🔒 Privaatne" : current === "hidden" ? "👁️‍🗨️ Peidetud" : "👥 Sõpradele";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
          title="Muuda nähtavust">
          {current === "friends" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{visLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange("friends")}><Eye className="h-3 w-3 mr-2" /> 👥 Sõpradele nähtav</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("private")}><EyeOff className="h-3 w-3 mr-2" /> 🔒 Privaatne</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("hidden")}><EyeOff className="h-3 w-3 mr-2" /> 👁️‍🗨️ Peidetud</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function HomeView({
  trainings, groups, friendCode, onUpdateTrainings, onDeleteGroup,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  friendCode: string | null;
  onUpdateTrainings: (updated: Training[]) => void;
  onDeleteGroup: (groupId: string) => void;
}) {
  const [displayCount, setDisplayCount] = useState(5);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [editTraining, setEditTraining] = useState<Training | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const trainingTypes = useMemo(() => {
    const types = new Set(trainings.map((t) => t.name));
    return Array.from(types).sort();
  }, [trainings]);

  // Build unified timeline
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    const grouped = new Map<string, Training[]>();
    const ungroupedList: Training[] = [];

    const visibleTrainings = trainings.filter((t) => t.visibility !== "hidden");

    for (const t of visibleTrainings) {
      if (t.group_id) {
        if (!grouped.has(t.group_id)) grouped.set(t.group_id, []);
        grouped.get(t.group_id)!.push(t);
      } else {
        ungroupedList.push(t);
      }
    }

    // Add periods as single items
    for (const [gid, periodTrainings] of grouped) {
      const group = groups.find((g) => g.id === gid);
      if (!group) { ungroupedList.push(...periodTrainings); continue; }

      // Apply sport filter to period (match if any training in period matches)
      if (filterType && !periodTrainings.some((t) => t.name === filterType)) continue;
      if (filterDateFrom && group.end_date < filterDateFrom) continue;
      if (filterDateTo && group.start_date > filterDateTo) continue;

      const totalDuration = periodTrainings.reduce((s, t) => s + t.duration, 0);
      items.push({
        type: "period",
        group,
        trainings: periodTrainings.sort((a, b) => a.date.localeCompare(b.date)),
        sortDate: group.start_date,
        sortDuration: totalDuration,
      });
    }

    // Add ungrouped singles
    for (const t of ungroupedList) {
      if (filterType && t.name !== filterType) continue;
      if (filterDateFrom && t.date < filterDateFrom) continue;
      if (filterDateTo && t.date > filterDateTo) continue;
      items.push({ type: "single", training: t, sortDate: t.date, sortDuration: t.duration });
    }

    // Sort
    switch (sortBy) {
      case "newest": items.sort((a, b) => b.sortDate.localeCompare(a.sortDate)); break;
      case "oldest": items.sort((a, b) => a.sortDate.localeCompare(b.sortDate)); break;
      case "duration_asc": items.sort((a, b) => a.sortDuration - b.sortDuration); break;
      case "duration_desc": items.sort((a, b) => b.sortDuration - a.sortDuration); break;
    }

    return items.slice(0, displayCount);
  }, [trainings, groups, sortBy, filterType, filterDateFrom, filterDateTo, displayCount]);

  const updateVisibility = async (id: string, visibility: string) => {
    await supabase.from("trainings").update({ visibility }).eq("id", id);
    onUpdateTrainings(trainings.map((t) => t.id === id ? { ...t, visibility } : t));
  };

  const updatePeriodVisibility = async (groupId: string, visibility: string) => {
    const ids = trainings.filter((t) => t.group_id === groupId).map((t) => t.id);
    await supabase.from("trainings").update({ visibility }).in("id", ids);
    onUpdateTrainings(trainings.map((t) => t.group_id === groupId ? { ...t, visibility } : t));
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    const ids = trainings.filter((t) => t.group_id === deleteGroupId).map((t) => t.id);
    await supabase.from("trainings").delete().in("id", ids);
    await supabase.from("training_groups").delete().eq("id", deleteGroupId);
    onUpdateTrainings(trainings.filter((t) => t.group_id !== deleteGroupId));
    onDeleteGroup(deleteGroupId);
    setDeleteGroupId(null);
  };

  const handleSaveEdit = (updated: Training) => {
    onUpdateTrainings(trainings.map((t) => t.id === updated.id ? updated : t));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Liikumispäevik</h1>
        <PdfExportButton trainings={trainings.filter(t => t.visibility !== "hidden")} groups={groups} />
      </div>
      <p className="text-muted-foreground text-sm mb-2">Siia saad oma treeningud kirja panna.</p>

      {friendCode && (
        <div className="border border-border rounded-sm p-2 mb-4 bg-card">
          <span className="text-xs text-muted-foreground">Sinu sõbrakood: </span>
          <span className="text-sm font-mono font-bold text-primary">{friendCode}</span>
        </div>
      )}

      {/* Filters */}
      <div className="border border-border rounded-sm p-3 mb-4 bg-card space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
          Filtrid ja sorteerimine
          <InfoTooltip text="Filtreeri ja sorteeri oma treeninguid. Perioodid ja üksiktreeningud sorteeritakse koos ühtse ajajoonena." />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background">
            <option value="newest">Uuemad enne</option>
            <option value="oldest">Vanemad enne</option>
            <option value="duration_desc">Pikem kestus</option>
            <option value="duration_asc">Lühem kestus</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background">
            <option value="">Kõik spordialad</option>
            {trainingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={displayCount} onChange={(e) => setDisplayCount(Number(e.target.value))}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background">
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} kirjet</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background" />
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background" />
          {(filterType || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="text-xs text-destructive cursor-pointer bg-transparent border-none underline">Tühjenda</button>
          )}
        </div>
      </div>

      <h2 className="text-base font-medium mb-2">Treeningud</h2>

      {timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">Treeninguid pole veel lisatud.</p>
      ) : (
        timeline.map((item) => {
          if (item.type === "period") {
            const periodVis = item.trainings[0]?.visibility || "friends";
            const totalMin = item.trainings.reduce((s, t) => s + t.duration, 0);
            return (
              <div key={item.group.id} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold">📅 {item.group.name || "Periood"}: {item.group.start_date} – {item.group.end_date}</div>
                  <div className="flex items-center gap-1">
                    <VisibilityDropdown current={periodVis} onChange={(v) => updatePeriodVisibility(item.group.id, v)} />
                    <button onClick={() => setDeleteGroupId(item.group.id)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-destructive rounded-sm px-1.5 py-0.5 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{item.trainings.length} treeningut · {totalMin} min kokku</div>
                {item.trainings.map((t) => (
                  <div key={t.id} className="text-[13px] py-0.5 flex items-center justify-between">
                    <span>{t.date} – {t.name} · {t.duration} min{t.note ? ` · ${t.note}` : ""}</span>
                  </div>
                ))}
              </div>
            );
          } else {
            const t = item.training;
            return (
              <div key={t.id} className="border border-border rounded-sm p-3 mb-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTraining(t)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <VisibilityDropdown current={t.visibility} onChange={(v) => updateVisibility(t.id, v)} />
                  </div>
                </div>
                <div className="text-muted-foreground text-[13px]">{t.date} · {t.duration} min</div>
                {t.note && <div className="text-[13px] mt-0.5">{t.note}</div>}
                {t.effort_type && t.effort_value && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.effort_type === "effort" ? `Pingutus: ${t.effort_value}/10` : `Pulss: ${t.effort_value} BPM`}
                  </div>
                )}
                <div className="text-muted-foreground text-[11px] mt-1">Lisatud: {formatDateTime(t.created_at)}</div>
              </div>
            );
          }
        })
      )}

      {editTraining && (
        <EditTrainingDialog training={editTraining} open={!!editTraining}
          onClose={() => setEditTraining(null)} onSave={handleSaveEdit} />
      )}

      <AlertDialog open={!!deleteGroupId} onOpenChange={(o) => !o && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kustuta kogu periood?</AlertDialogTitle>
            <AlertDialogDescription>Kõik perioodi treeningud kustutatakse. Seda ei saa tagasi võtta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tühista</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>Jah, kustuta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
