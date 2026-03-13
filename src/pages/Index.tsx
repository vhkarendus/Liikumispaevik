import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Training = {
  id: string;
  name: string;
  date: string;
  duration: number;
  note: string | null;
  created_at: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("et-EE") + " " + d.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
}

// Home / Diary view
function HomeView({ trainings }: { trainings: Training[] }) {
  const recent = trainings.slice(0, 5);
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Liikumispäevik</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Siia saad oma treeningud kirja panna.
      </p>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Viimased treeningud</h2>
      {recent.length === 0 ? (
        <p style={{ fontSize: 14 }}>Treeninguid pole veel lisatud.</p>
      ) : (
        <div>
          {recent.map((t) => (
            <div key={t.id} className="border border-border rounded-sm p-3 mb-2 bg-card">
              <div style={{ fontSize: 14, fontWeight: "bold" }}>{t.name}</div>
              <div className="text-muted-foreground text-[13px]">
                {t.date} · {t.duration} min
              </div>
              {t.note && <div style={{ fontSize: 13, marginTop: 2 }}>{t.note}</div>}
              <div className="text-muted-foreground text-[11px] mt-1">
                Lisatud: {formatDateTime(t.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Single training add view
function SingleAddForm({ onAdd }: { onAdd: (t: Omit<Training, "id" | "created_at">) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const handleSave = () => {
    if (!name || !date || !duration) return;
    onAdd({ name, date, duration: parseInt(duration), note: note || null });
    setName("");
    setDate("");
    setDuration("");
    setNote("");
    setMsg("Treening lisatud!");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label className="block text-[13px] mb-0.5">Treeningu nimetus</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label className="block text-[13px] mb-0.5">Kuupäev</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          max={todayStr()}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label className="block text-[13px] mb-0.5">Kestus (minutites)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="block text-[13px] mb-0.5">Märkus</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <button onClick={handleSave}
        className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer">
        Salvesta
      </button>
      {msg && <p className="text-[13px] mt-2 text-green-600">{msg}</p>}
    </div>
  );
}

// Period training add view
function PeriodAddForm({ onAddMultiple }: { onAddMultiple: (entries: Omit<Training, "id" | "created_at">[]) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<{ date: string; name: string; duration: string; note: string; enabled: boolean }[]>([]);
  const [msg, setMsg] = useState("");

  const generateDays = () => {
    if (!startDate || !endDate || startDate > endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: typeof days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push({
        date: d.toISOString().slice(0, 10),
        name: "",
        duration: "",
        note: "",
        enabled: true,
      });
    }
    setDays(result);
  };

  const updateDay = (idx: number, field: string, value: string | boolean) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const handleSave = () => {
    const entries = days
      .filter((d) => d.enabled && d.name && d.duration)
      .map((d) => ({
        name: d.name,
        date: d.date,
        duration: parseInt(d.duration),
        note: d.note || null,
      }));
    if (entries.length === 0) return;
    onAddMultiple(entries);
    setDays([]);
    setStartDate("");
    setEndDate("");
    setMsg(`${entries.length} treeningut lisatud!`);
    setTimeout(() => setMsg(""), 3000);
  };

  const weekday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("et-EE", { weekday: "short" });
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[13px] mb-0.5">Algus</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            max={todayStr()}
            className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
        </div>
        <div className="flex-1">
          <label className="block text-[13px] mb-0.5">Lõpp</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            max={todayStr()}
            min={startDate}
            className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
        </div>
      </div>
      <button onClick={generateDays}
        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-sm text-sm cursor-pointer mb-4">
        Genereeri päevad
      </button>

      {days.length > 0 && (
        <div>
          <p className="text-[13px] text-muted-foreground mb-2">
            Märgi iga päeva juurde treening. Tühjaks jäetud päevi ei salvestata.
          </p>
          <div className="space-y-3">
            {days.map((day, idx) => (
              <div key={day.date} className={`border border-border rounded-sm p-2 ${!day.enabled ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <input type="checkbox" checked={day.enabled}
                    onChange={(e) => updateDay(idx, "enabled", e.target.checked)}
                    className="accent-primary" />
                  <span className="text-sm font-medium">{day.date}</span>
                  <span className="text-xs text-muted-foreground">({weekday(day.date)})</span>
                </div>
                {day.enabled && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="text" placeholder="Nimetus" value={day.name}
                      onChange={(e) => updateDay(idx, "name", e.target.value)}
                      className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                    <input type="number" placeholder="Min" value={day.duration}
                      onChange={(e) => updateDay(idx, "duration", e.target.value)}
                      className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                    <input type="text" placeholder="Märkus" value={day.note}
                      onChange={(e) => updateDay(idx, "note", e.target.value)}
                      className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleSave}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer mt-3">
            Salvesta kõik
          </button>
        </div>
      )}
      {msg && <p className="text-[13px] mt-2 text-green-600">{msg}</p>}
    </div>
  );
}

// Add training view with tabs
function AddView({ onAdd, onAddMultiple }: {
  onAdd: (t: Omit<Training, "id" | "created_at">) => void;
  onAddMultiple: (entries: Omit<Training, "id" | "created_at">[]) => void;
}) {
  const [mode, setMode] = useState<"single" | "period">("single");

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Lisa treening</h2>
      <div className="flex gap-1 mb-4">
        <button onClick={() => setMode("single")}
          className={`px-3 py-1 rounded-sm text-sm cursor-pointer border ${
            mode === "single"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border"
          }`}>
          Üksik treening
        </button>
        <button onClick={() => setMode("period")}
          className={`px-3 py-1 rounded-sm text-sm cursor-pointer border ${
            mode === "period"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border"
          }`}>
          Periood
        </button>
      </div>
      {mode === "single" ? (
        <SingleAddForm onAdd={onAdd} />
      ) : (
        <PeriodAddForm onAddMultiple={onAddMultiple} />
      )}
    </div>
  );
}

// Archive view
function ArchiveView({ trainings, onDelete }: { trainings: Training[]; onDelete: (id: string) => void }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Arhiiv</h2>
      {trainings.length === 0 ? (
        <p style={{ fontSize: 14 }}>Arhiiv on tühi</p>
      ) : (
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
                  <button onClick={() => onDelete(t.id)}
                    className="text-destructive text-xs cursor-pointer border border-destructive rounded-sm px-2 py-0.5 bg-background hover:bg-destructive hover:text-destructive-foreground">
                    Kustuta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Bottom nav with profile picture and logout confirmation
function BottomNav({
  current,
  onChange,
  avatarUrl,
  displayName,
}: {
  current: string;
  onChange: (v: string) => void;
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const items = [
    { key: "home", label: "Avaleht" },
    { key: "add", label: "Lisa treening" },
    { key: "archive", label: "Arhiiv" },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex items-center justify-around py-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="text-xs cursor-pointer bg-transparent border-none px-2 py-1"
            style={{
              fontWeight: current === item.key ? "bold" : "normal",
              color: current === item.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={() => setShowLogoutDialog(true)}
          className="flex items-center gap-1.5 text-xs cursor-pointer bg-transparent border-none px-2 py-1 text-muted-foreground"
        >
          {avatarUrl && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
              <AvatarFallback className="text-[10px]">
                {(displayName || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          Logi välja
        </button>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kas oled kindel, et soovid välja logida?</AlertDialogTitle>
            <AlertDialogDescription>
              Sinu sessioon lõpetatakse ja sind suunatakse sisselogimislehele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tühista</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange("logout")}>
              Jah, logi välja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main app
export default function Index() {
  const { user, username, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("home");
  const [trainings, setTrainings] = useState<Training[]>([]);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchTrainings = async () => {
      const { data } = await supabase
        .from("trainings")
        .select("id, name, date, duration, note, created_at")
        .order("date", { ascending: false });
      if (data) setTrainings(data);
    };
    fetchTrainings();
  }, [user]);

  const handleNav = (v: string) => {
    if (v === "logout") {
      logout().then(() => navigate("/login"));
    } else {
      setView(v);
    }
  };

  const addTraining = async (t: Omit<Training, "id" | "created_at">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("trainings")
      .insert({ ...t, user_id: user.id })
      .select()
      .single();
    if (data && !error) {
      setTrainings((prev) => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const addMultipleTrainings = async (entries: Omit<Training, "id" | "created_at">[]) => {
    if (!user) return;
    const rows = entries.map((t) => ({ ...t, user_id: user.id }));
    const { data, error } = await supabase
      .from("trainings")
      .insert(rows)
      .select();
    if (data && !error) {
      setTrainings((prev) => [...prev, ...data].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const deleteTraining = async (id: string) => {
    await supabase.from("trainings").delete().eq("id", id);
    setTrainings((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Laadin...</div>;
  if (!user) return null;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 70px 16px" }}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {avatarUrl && (
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
            <AvatarFallback className="text-[10px]">
              {(displayName || "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <span>Sisse logitud: <strong>{displayName}</strong></span>
      </div>
      {view === "home" && <HomeView trainings={trainings} />}
      {view === "add" && <AddView onAdd={addTraining} onAddMultiple={addMultipleTrainings} />}
      {view === "archive" && <ArchiveView trainings={trainings} onDelete={deleteTraining} />}
      <BottomNav current={view} onChange={handleNav} avatarUrl={avatarUrl} displayName={displayName} />
    </div>
  );
}
