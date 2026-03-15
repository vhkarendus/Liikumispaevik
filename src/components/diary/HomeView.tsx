import { useState, useMemo } from "react";
import { Training, TrainingGroup } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "newest" | "oldest" | "duration_asc" | "duration_desc";

export default function HomeView({
  trainings,
  groups,
  friendCode,
  onUpdateTrainings,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  friendCode: string | null;
  onUpdateTrainings: (updated: Training[]) => void;
}) {
  const [displayCount, setDisplayCount] = useState(5);
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

    // Filter out hidden trainings from home view
    result = result.filter((t) => t.visibility !== "hidden");

    if (filterType) result = result.filter((t) => t.name === filterType);
    if (filterDateFrom) result = result.filter((t) => t.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((t) => t.date <= filterDateTo);

    switch (sortBy) {
      case "newest": result.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "oldest": result.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "duration_asc": result.sort((a, b) => a.duration - b.duration); break;
      case "duration_desc": result.sort((a, b) => b.duration - a.duration); break;
    }

    return result.slice(0, displayCount);
  }, [trainings, sortBy, filterType, filterDateFrom, filterDateTo, displayCount]);

  // Group trainings by group_id
  const groupedTrainings = useMemo(() => {
    const grouped: { group: TrainingGroup; items: Training[] }[] = [];
    const ungrouped: Training[] = [];
    const groupMap = new Map<string, Training[]>();

    for (const t of filtered) {
      if (t.group_id) {
        if (!groupMap.has(t.group_id)) groupMap.set(t.group_id, []);
        groupMap.get(t.group_id)!.push(t);
      } else {
        ungrouped.push(t);
      }
    }

    for (const [gid, items] of groupMap) {
      const group = groups.find((g) => g.id === gid);
      if (group) grouped.push({ group, items });
      else ungrouped.push(...items);
    }

    return { grouped, ungrouped };
  }, [filtered, groups]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Liikumispäevik</h1>
      <p className="text-muted-foreground text-sm mb-2">
        Siia saad oma treeningud kirja panna.
      </p>

      {friendCode && (
        <div className="border border-border rounded-sm p-2 mb-4 bg-card">
          <span className="text-xs text-muted-foreground">Sinu sõbrakood: </span>
          <span className="text-sm font-mono font-bold text-primary">{friendCode}</span>
        </div>
      )}

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
          <select value={displayCount} onChange={(e) => setDisplayCount(Number(e.target.value))}
            className="border border-border rounded-sm px-2 py-1 text-xs bg-background">
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} treeningut</option>)}
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

      <h2 className="text-base font-medium mb-2">Treeningud</h2>

      {/* Grouped periods */}
      {groupedTrainings.grouped.map(({ group, items }) => (
        <div key={group.id} className="border border-primary/30 rounded-sm p-3 mb-3 bg-primary/5">
          <div className="text-sm font-bold mb-1">
            📅 {group.name || "Periood"}: {group.start_date} – {group.end_date}
          </div>
          <div className="text-xs text-muted-foreground mb-2">{items.length} treeningut</div>
          {items.map((t) => (
            <TrainingCard key={t.id} training={t} onUpdateTrainings={onUpdateTrainings} trainings={trainings} />
          ))}
        </div>
      ))}

      {/* Ungrouped */}
      {groupedTrainings.ungrouped.length === 0 && groupedTrainings.grouped.length === 0 ? (
        <p className="text-sm">Treeninguid pole veel lisatud.</p>
      ) : (
        groupedTrainings.ungrouped.map((t) => <TrainingCard key={t.id} training={t} onUpdateTrainings={onUpdateTrainings} trainings={trainings} />)
      )}
    </div>
  );
}

function TrainingCard({ training: t, onUpdateTrainings, trainings }: { training: Training; onUpdateTrainings: (updated: Training[]) => void; trainings: Training[] }) {
  const visLabel = t.visibility === "private" ? "🔒 Privaatne" : t.visibility === "hidden" ? "👁️‍🗨️ Peidetud" : "👥 Sõpradele";
  
  const updateVisibility = async (newVisibility: string) => {
    await supabase.from("trainings").update({ visibility: newVisibility }).eq("id", t.id);
    onUpdateTrainings(trainings.map((tr) => tr.id === t.id ? { ...tr, visibility: newVisibility } : tr));
  };

  return (
    <div className="border border-border rounded-sm p-3 mb-2 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{t.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
              title="Muuda nähtavust"
            >
              {t.visibility === "private" ? <EyeOff className="h-3 w-3" /> : t.visibility === "hidden" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{visLabel}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => updateVisibility("friends")}>
              <Eye className="h-3 w-3 mr-2" />
              👥 Sõpradele nähtav
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateVisibility("private")}>
              <EyeOff className="h-3 w-3 mr-2" />
              🔒 Privaatne
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateVisibility("hidden")}>
              <EyeSlash className="h-3 w-3 mr-2" />
              👁️‍🗨️ Peidetud
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-muted-foreground text-[13px]">
        {t.date} · {t.duration} min
      </div>
      {t.note && <div className="text-[13px] mt-0.5">{t.note}</div>}
      <div className="text-muted-foreground text-[11px] mt-1">
        Lisatud: {formatDateTime(t.created_at)}
      </div>
    </div>
  );
}
