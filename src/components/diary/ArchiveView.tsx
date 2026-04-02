import { useState, useMemo } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Pencil, CalendarIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import InfoTooltip from "./InfoTooltip";
import EditTrainingDialog from "./EditTrainingDialog";
import { exportTrainingsPdf } from "./PdfExport";
import { format } from "date-fns";
import { et } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FileDown } from "lucide-react";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "newest" | "oldest" | "duration_asc" | "duration_desc";

type TimelineItem =
  | { type: "single"; training: Training; sortDate: string; sortDuration: number }
  | { type: "period"; group: TrainingGroup; trainings: Training[]; sortDate: string; sortDuration: number };

function VisibilityDropdown({ current, onChange, label }: { current: string; onChange: (v: string) => void; label?: string }) {
  const visLabel = current === "private" ? "🔒 Privaatne" : current === "hidden" ? "👁️‍🗨️ Peidetud" : "👥 Sõpradele";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
          {current === "friends" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{label || visLabel}</span>
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

function effortLabel(t: Training) {
  if (!t.effort_type || !t.effort_value) return null;
  if (t.effort_type === "effort") return `Pingutus: ${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `Pulss: ${t.effort_value} BPM`;
  return null;
}

function DateRangeFilter({ dateFrom, dateTo, onApply }: {
  dateFrom: string; dateTo: string;
  onApply: (from: string, to: string) => void;
}) {
  const [fromDate, setFromDate] = useState<Date | undefined>(dateFrom ? new Date(dateFrom) : undefined);
  const [toDate, setToDate] = useState<Date | undefined>(dateTo ? new Date(dateTo) : undefined);
  const [open, setOpen] = useState(false);

  const handleDone = () => {
    onApply(
      fromDate ? fromDate.toISOString().slice(0, 10) : "",
      toDate ? toDate.toISOString().slice(0, 10) : "",
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 border border-border rounded-sm px-2 py-1 text-xs bg-background cursor-pointer hover:bg-accent">
          <CalendarIcon className="h-3 w-3" />
          {fromDate || toDate
            ? `${fromDate ? format(fromDate, "dd.MM.yyyy") : "..."} – ${toDate ? format(toDate, "dd.MM.yyyy") : "..."}`
            : "Kuupäeva filter"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-1">Alguskuupäev</p>
            <Calendar mode="single" selected={fromDate} onSelect={setFromDate}
              className={cn("p-2 pointer-events-auto")} locale={et} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1">Lõppkuupäev</p>
            <Calendar mode="single" selected={toDate} onSelect={setToDate}
              disabled={(date) => fromDate ? date < fromDate : false}
              className={cn("p-2 pointer-events-auto")} locale={et} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleDone}
              className="bg-primary text-primary-foreground px-3 py-1 rounded-sm text-xs cursor-pointer">
              Valmis
            </button>
            <button onClick={() => { setFromDate(undefined); setToDate(undefined); onApply("", ""); setOpen(false); }}
              className="text-xs text-destructive cursor-pointer bg-transparent border-none underline">
              Tühjenda
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PdfExportDialog({ trainings, groups, open, onClose }: {
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
  const [editTraining, setEditTraining] = useState<Training | null>(null);
  const [displayCount, setDisplayCount] = useState(10);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const trainingTypes = useMemo(() => {
    const types = new Set(trainings.map((t) => t.name));
    return Array.from(types).sort();
  }, [trainings]);

  // Build unified timeline (periods + singles together)
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    const grouped = new Map<string, Training[]>();
    const ungroupedList: Training[] = [];

    for (const t of trainings) {
      if (t.group_id) {
        if (!grouped.has(t.group_id)) grouped.set(t.group_id, []);
        grouped.get(t.group_id)!.push(t);
      } else {
        ungroupedList.push(t);
      }
    }

    for (const [gid, periodTrainings] of grouped) {
      const group = groups.find((g) => g.id === gid);
      if (!group) { ungroupedList.push(...periodTrainings); continue; }
      if (filterType && !periodTrainings.some((t) => t.name === filterType)) continue;
      if (filterDateFrom && group.end_date < filterDateFrom) continue;
      if (filterDateTo && group.start_date > filterDateTo) continue;
      const totalDuration = periodTrainings.reduce((s, t) => s + t.duration, 0);
      items.push({
        type: "period", group, trainings: periodTrainings.sort((a, b) => a.date.localeCompare(b.date)),
        sortDate: group.start_date, sortDuration: totalDuration,
      });
    }

    for (const t of ungroupedList) {
      if (filterType && t.name !== filterType) continue;
      if (filterDateFrom && t.date < filterDateFrom) continue;
      if (filterDateTo && t.date > filterDateTo) continue;
      items.push({ type: "single", training: t, sortDate: t.date, sortDuration: t.duration });
    }

    switch (sortBy) {
      case "newest": items.sort((a, b) => b.sortDate.localeCompare(a.sortDate)); break;
      case "oldest": items.sort((a, b) => a.sortDate.localeCompare(b.sortDate)); break;
      case "duration_asc": items.sort((a, b) => a.sortDuration - b.sortDuration); break;
      case "duration_desc": items.sort((a, b) => b.sortDuration - a.sortDuration); break;
    }

    return items;
  }, [trainings, groups, sortBy, filterType, filterDateFrom, filterDateTo]);

  const displayedTimeline = timeline.slice(0, displayCount);

  const confirmDelete = () => {
    if (deleteId) { onDelete(deleteId); setDeleteId(null); }
  };

  const updateTrainingVisibility = async (id: string, visibility: string) => {
    await supabase.from("trainings").update({ visibility }).eq("id", id);
    onUpdateTrainings(trainings.map((t) => t.id === id ? { ...t, visibility } : t));
  };

  const updatePeriodVisibility = async (groupId: string, visibility: string) => {
    const ids = trainings.filter((t) => t.group_id === groupId).map((t) => t.id);
    await supabase.from("trainings").update({ visibility }).in("id", ids);
    onUpdateTrainings(trainings.map((t) => t.group_id === groupId ? { ...t, visibility } : t));
  };

  const handleSaveEdit = (updated: Training) => {
    onUpdateTrainings(trainings.map((t) => t.id === updated.id ? updated : t));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">Arhiiv</h2>
        <button onClick={() => setPdfDialogOpen(true)}
          className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground">
          <FileDown className="h-3 w-3" /> PDF
        </button>
      </div>

      {/* Filters */}
      <div className="border border-border rounded-sm p-3 mb-4 bg-card space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
          Filtrid ja sorteerimine
          <InfoTooltip text="Filtreeri spordialade, kuupäeva ja kestuse järgi. Perioodid ja üksiktreeningud sorteeritakse koos. Arhiivis on näha ka peidetud treeningud." />
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
            {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} kirjet</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <DateRangeFilter dateFrom={filterDateFrom} dateTo={filterDateTo}
            onApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); }} />
          {(filterType || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterType(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="text-xs text-destructive cursor-pointer bg-transparent border-none underline">Tühjenda</button>
          )}
        </div>
      </div>

      {displayedTimeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">Arhiiv on tühi</p>
      ) : (
        displayedTimeline.map((item) => {
          if (item.type === "period") {
            const periodVis = item.trainings[0]?.visibility || "friends";
            const totalMin = item.trainings.reduce((s, t) => s + t.duration, 0);
            return (
              <div key={item.group.id} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold">📅 {item.group.name || "Periood"}: {item.group.start_date} – {item.group.end_date}</div>
                  <VisibilityDropdown current={periodVis} onChange={(v) => updatePeriodVisibility(item.group.id, v)} label="Perioodi nähtavus" />
                </div>
                <div className="text-xs text-muted-foreground mb-1">{item.trainings.length} treeningut · {totalMin} min kokku</div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 pr-2 text-xs">Kuupäev</th>
                      <th className="text-left py-1 pr-2 text-xs">Spordiala</th>
                      <th className="text-left py-1 pr-2 text-xs">Kestus</th>
                      <th className="text-left py-1 pr-2 text-xs">Märkus</th>
                      <th className="text-left py-1 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.trainings.map((t) => (
                      <tr key={t.id} className="border-b border-border">
                        <td className="py-1 pr-2 text-xs">{t.date}</td>
                        <td className="py-1 pr-2 text-xs">{t.name}</td>
                        <td className="py-1 pr-2 text-xs">{t.duration} min</td>
                        <td className="py-1 pr-2 text-xs">
                          {t.note}
                          {effortLabel(t) && <span className="text-muted-foreground ml-1">({effortLabel(t)})</span>}
                        </td>
                        <td className="py-1 flex gap-1">
                          <button onClick={() => setEditTraining(t)}
                            className="text-xs cursor-pointer border border-border rounded-sm px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
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
          } else {
            const t = item.training;
            return (
              <div key={t.id} className="border border-border rounded-sm p-3 mb-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditTraining(t)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
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
            );
          }
        })
      )}

      {timeline.length > displayCount && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Näidatud {displayCount}/{timeline.length} kirjet
        </p>
      )}

      {editTraining && (
        <EditTrainingDialog training={editTraining} open={!!editTraining}
          onClose={() => setEditTraining(null)} onSave={handleSaveEdit} />
      )}

      <PdfExportDialog trainings={trainings} groups={groups} open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} />

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
