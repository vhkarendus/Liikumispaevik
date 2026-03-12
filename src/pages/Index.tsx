import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Training = {
  id: string;
  name: string;
  date: string;
  duration: number;
  note: string | null;
};

// Home / Diary view
function HomeView({ trainings }: { trainings: Training[] }) {
  const recent = trainings.slice(-5).reverse();
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Liikumispäevik</h1>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, marginBottom: 16 }}>
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
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                {t.date} · {t.duration} min
              </div>
              {t.note && <div style={{ fontSize: 13, marginTop: 2 }}>{t.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add training view
function AddView({ onAdd }: { onAdd: (t: Omit<Training, "id">) => void }) {
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
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Lisa treening</h2>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 2 }}>Treeningu nimetus</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 2 }}>Kuupäev</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 2 }}>Kestus (minutites)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 2 }}>Märkus</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <button onClick={handleSave}
        className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer">
        Salvesta
      </button>
      {msg && <p style={{ color: "green", fontSize: 13, marginTop: 8 }}>{msg}</p>}
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

// Bottom nav
function BottomNav({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const items = [
    { key: "home", label: "Avaleht" },
    { key: "add", label: "Lisa treening" },
    { key: "archive", label: "Arhiiv" },
    { key: "logout", label: "Logi välja" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex justify-around py-2">
      {items.map((item) => (
        <button key={item.key} onClick={() => onChange(item.key)}
          className="text-xs cursor-pointer bg-transparent border-none px-2 py-1"
          style={{
            fontWeight: current === item.key ? "bold" : "normal",
            color: current === item.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Main app
export default function Index() {
  const { user, username, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("home");
  const [trainings, setTrainings] = useState<Training[]>([]);

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
        .select("id, name, date, duration, note")
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

  const addTraining = async (t: Omit<Training, "id">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("trainings")
      .insert({ ...t, user_id: user.id })
      .select()
      .single();
    if (data && !error) {
      setTrainings((prev) => [data, ...prev]);
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
      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 8 }}>
        Sisse logitud: <strong>{username}</strong>
      </div>
      {view === "home" && <HomeView trainings={trainings} />}
      {view === "add" && <AddView onAdd={addTraining} />}
      {view === "archive" && <ArchiveView trainings={trainings} onDelete={deleteTraining} />}
      <BottomNav current={view} onChange={handleNav} />
    </div>
  );
}
