import { useState, useMemo } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "newest" | "oldest" | "duration_asc" | "duration_desc";

function VisibilityDropdown({
  current,
  onChange,
  label,
}: {
  current: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const visLabel = current === "private" ? "🔒 Privaatne" : current === "hidden" ? "👁️‍🗨️ Peidetud" : "👥 Sõpradele";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
          title="Muuda nähtavust"
        >
          {current === "friends" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{label || visLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange("friends")}>
          <Eye className="h-3 w-3 mr-2" /> 👥 Sõpradele nähtav
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("private")}>
          <EyeOff className="h-3 w-3 mr-2" /> 🔒 Privaatne
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("hidden")}>
          <EyeOff className="h-3 w-3 mr-2" /> 👁️‍🗨️ Peidetud
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function effortLabel(t: Training) {
  if (!t.effort_type || !t.effort_value) return null;
  if (t.effort_type === "effort") return `Pingutus: ${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `Pulss: ${t.effort_value} BPM`;
  return null;
}

export default function ArchiveView({
  trainings, groups, onDelete, onUpdateTrainings,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  onDelete: (id: string) => void;
  onUpdateTrainings: (updated: Training[]) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const trainingTypes = useMemo(() => {
    const types = new Set(trainings.map((t) => t.name));
    return Array.from(types).sort();
  }, [trainings]);

  const filtered = useMemo(() => {
    let result = [...trainings];
    if (filterType) result = result.filter((t) => t.name === filterType);
    if (filterDateFrom) result = result.filter((t) => t.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((t) => t.date <= filterDateTo);

    switch (sortBy) {
      case "newest": result.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "oldest": result.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "duration_asc": result.sort((a, b) => a.duration - b.duration); break;
      case "duration_desc": result.sort((a, b) => b.duration - a.duration); break;
    }
    return result;
  }, [trainings, sortBy, filterType, filterDateFrom, filterDateTo]);

  const confirmDelete = () => {
    if (deleteId) { onDelete(deleteId); setDeleteId(null); }
  };

  const updateTrainingVisibility = async (id: string, visibility: string) => {
    await supabase.from("trainings").update({ visibility }).eq("id", id);
    onUpdateTrainings(trainings.map((t) => t.id === id ? { ...t, visibility } : t));
  };

  const updatePeriodVisibility = async (groupId: string, visibility: string) => {
    const periodTrainings = trainings.filter((t) => t.group_id === groupId);
    const ids = periodTrainings.map((t) => t.id);
    await supabase.from("trainings").update({ visibility }).in("id", ids);
    onUpdateTrainings(trainings.map((t) => t.group_id === groupId ? { ...t, visibility } : t));
  };

  // Group filtered trainings
  const groupMap = new Map<string, Training[]>();
  const ungrouped: Training[] = [];
  for (const t of filtered) {
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

      {/* Filters */}
      <div className="border border-border rounded-sm p-3 mb-4 bg-card space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1">Filtrid ja sorteerimine</div>
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
            <option value="">Kõik treeningud</option>
            {trainingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background" placeholder="Alates" />
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background" placeholder="Kuni" />
          {(filterType || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="text-xs text-destructive cursor-pointer bg-transparent border-none underline">
              Tühjenda
            </button>
          )}
        </div>
      </div>

      {/* Grouped */}
      {Array.from(groupMap.entries()).map(([gid, items]) => {
        const group = groups.find((g) => g.id === gid);
        const periodVis = items[0]?.visibility || "friends";
        return (
          <div key={gid} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold">
                📅 {group?.name || "Periood"}: {group?.start_date} – {group?.end_date}
              </div>
              <VisibilityDropdown current={periodVis} onChange={(v) => updatePeriodVisibility(gid, v)} label="Perioodi nähtavus" />
            </div>
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
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="py-1 pr-2">{t.date}</td>
                    <td className="py-1 pr-2">{t.name}</td>
                    <td className="py-1 pr-2">{t.duration} min</td>
                    <td className="py-1 pr-2">
                      {t.note}
                      {effortLabel(t) && <span className="text-xs text-muted-foreground ml-1">({effortLabel(t)})</span>}
                    </td>
                    <td className="py-1 pr-2 text-[11px] text-muted-foreground">{formatDateTime(t.created_at)}</td>
                    <td className="py-1">
                      <button onClick={() => setDeleteId(t.id)}
                        className="text-destructive text-xs cursor-pointer border border-destructive rounded-sm px-2 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground">
                        Kustuta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Ungrouped */}
      {ungrouped.length === 0 && groupMap.size === 0 ? (
        <p className="text-sm">Arhiiv on tühi</p>
      ) : (
        ungrouped.map((t) => (
          <div key={t.id} className="border border-border rounded-sm p-3 mb-2 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{t.name}</span>
              <div className="flex items-center gap-2">
                <VisibilityDropdown current={t.visibility} onChange={(v) => updateTrainingVisibility(t.id, v)} />
                <button onClick={() => setDeleteId(t.id)}
                  className="text-destructive text-xs cursor-pointer border border-destructive rounded-sm px-2 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground">
                  Kustuta
                </button>
              </div>
            </div>
            <div className="text-muted-foreground text-[13px]">{t.date} · {t.duration} min</div>
            {t.note && <div className="text-[13px] mt-0.5">{t.note}</div>}
            {effortLabel(t) && <div className="text-xs text-muted-foreground mt-0.5">{effortLabel(t)}</div>}
            <div className="text-muted-foreground text-[11px] mt-1">Lisatud: {formatDateTime(t.created_at)}</div>
          </div>
        ))
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
