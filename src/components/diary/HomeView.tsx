import { useState, useMemo } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, CalendarIcon, ChevronDown, ChevronRight, Pencil, History } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { et } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FileDown } from "lucide-react";

import InfoTooltip from "./InfoTooltip";
import PdfExportDialog from "./PdfExportDialog";
import EditTrainingDialog from "./EditTrainingDialog";
import EditPeriodDialog from "./EditPeriodDialog";
import TrainingHistoryDialog from "./TrainingHistoryDialog";
import PeriodHistoryDialog from "./PeriodHistoryDialog";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "newest" | "oldest" | "duration_asc" | "duration_desc";

type TimelineItem =
  | { type: "single"; training: Training; sortDate: string; sortDuration: number }
  | { type: "period"; group: TrainingGroup; trainings: Training[]; sortDate: string; sortDuration: number };

function VisibilityDropdown({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const isPrivate = current === "private";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
          title="Muuda nähtavust">
          {isPrivate ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          <span>{isPrivate ? "Privaatne" : "Sõpradele"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange("friends")}><Eye className="h-3 w-3 mr-2" /> 👥 Sõpradele nähtav</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("private")}><Lock className="h-3 w-3 mr-2" /> 🔒 Privaatne</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

export default function HomeView({
  trainings, groups, friendCode, onUpdateTrainings, onUpdateGroups,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  friendCode: string | null;
  onUpdateTrainings: (updated: Training[]) => void;
  onUpdateGroups?: (updated: TrainingGroup[]) => void;
}) {
  const [displayCount, setDisplayCount] = useState(5);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [editTraining, setEditTraining] = useState<Training | null>(null);
  const [editPeriod, setEditPeriod] = useState<TrainingGroup | null>(null);
  const [historyTraining, setHistoryTraining] = useState<Training | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<TrainingGroup | null>(null);

  const trainingTypes = useMemo(() => {
    const types = new Set(trainings.map((t) => t.name));
    return Array.from(types).sort();
  }, [trainings]);

  const togglePeriod = (gid: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  };

  // Home page: only show "friends" visibility items
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    const grouped = new Map<string, Training[]>();
    const ungroupedList: Training[] = [];
    const visibleTrainings = trainings.filter((t) => t.visibility === "friends");

    for (const t of visibleTrainings) {
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
        type: "period", group,
        trainings: periodTrainings.sort((a, b) => a.date.localeCompare(b.date)),
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

  const handleSaveEdit = (updated: Training) => {
    onUpdateTrainings(trainings.map((t) => t.id === updated.id ? updated : t));
  };

  const handleSavePeriod = (updated: TrainingGroup) => {
    onUpdateGroups?.(groups.map((g) => g.id === updated.id ? updated : g));
  };

  const resetFilters = () => {
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSortBy("newest");
    setDisplayCount(5);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Liikumispäevik</h1>
        <button onClick={() => setPdfDialogOpen(true)}
          className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground">
          <FileDown className="h-3 w-3" /> PDF
        </button>
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
          <InfoTooltip text="Filtreeri ja sorteeri oma treeninguid. Perioodid ja üksiktreeningud sorteeritakse koos ühtse ajajoonena. Avalehel kuvatakse ainult sõpradele nähtavaid treeninguid." />
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
        <div className="flex gap-2 items-center">
          <DateRangeFilter dateFrom={filterDateFrom} dateTo={filterDateTo}
            onApply={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to); }} />
          {(filterType || filterDateFrom || filterDateTo || sortBy !== "newest" || displayCount !== 5) && (
            <button onClick={resetFilters}
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
            const isExpanded = expandedPeriods.has(item.group.id);
            return (
              <div key={item.group.id} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => togglePeriod(item.group.id)}
                    className="flex items-center gap-1 text-sm font-bold bg-transparent border-none cursor-pointer text-foreground p-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    📅 {item.group.name || "Periood"}: {item.group.start_date} – {item.group.end_date}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setHistoryPeriod(item.group)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
                      <History className="h-3 w-3" />
                    </button>
                    <button onClick={() => setEditPeriod(item.group)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <VisibilityDropdown current={periodVis} onChange={(v) => updatePeriodVisibility(item.group.id, v)} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{item.trainings.length} treeningut · {totalMin} min kokku</div>
                {isExpanded && item.trainings.map((t) => (
                  <div key={t.id} className="text-[13px] py-1 border-t border-border/50">
                    <span>{t.date} – {t.name} · {t.duration} min{t.note ? ` · ${t.note}` : ""}</span>
                    {t.effort_type && t.effort_value && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({t.effort_type === "effort" ? `Pingutus: ${t.effort_value}/10` : `Pulss: ${t.effort_value} BPM`})
                      </span>
                    )}
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
                    <button onClick={() => setHistoryTraining(t)}
                      className="flex items-center gap-0.5 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
                      <History className="h-3 w-3" />
                    </button>
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
      {editPeriod && (
        <EditPeriodDialog group={editPeriod} open={!!editPeriod}
          onClose={() => setEditPeriod(null)} onSave={handleSavePeriod} />
      )}
      {historyTraining && (
        <TrainingHistoryDialog training={historyTraining} open={!!historyTraining}
          onClose={() => setHistoryTraining(null)} onRestore={handleSaveEdit} />
      )}
      {historyPeriod && (
        <PeriodHistoryDialog group={historyPeriod} open={!!historyPeriod}
          onClose={() => setHistoryPeriod(null)} onRestore={handleSavePeriod} />
      )}
      <PdfExportDialog trainings={trainings.filter(t => t.visibility === "friends")} groups={groups}
        open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} />
    </div>
  );
}
