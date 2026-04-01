import { useState } from "react";
import { Training } from "@/types/training";
import { SPORT_TYPES } from "@/constants/sports";
import InfoTooltip from "./InfoTooltip";

const todayStr = () => new Date().toISOString().slice(0, 10);

type NewTraining = Omit<Training, "id" | "created_at">;

function SportSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isCustom, setIsCustom] = useState(!SPORT_TYPES.includes(value as any) && value !== "");
  const [customValue, setCustomValue] = useState(isCustom ? value : "");

  if (isCustom) {
    return (
      <div className="flex gap-1">
        <input type="text" value={customValue}
          onChange={(e) => { setCustomValue(e.target.value); onChange(e.target.value); }}
          placeholder="Sisesta spordiala"
          className="flex-1 border border-border rounded-sm px-2 py-1 text-sm bg-background" />
        <button type="button" onClick={() => { setIsCustom(false); onChange(SPORT_TYPES[0]); }}
          className="text-xs text-primary cursor-pointer bg-transparent border-none underline">
          Nimekiri
        </button>
      </div>
    );
  }

  return (
    <select value={value} onChange={(e) => {
      if (e.target.value === "__custom__") { setIsCustom(true); onChange(""); }
      else onChange(e.target.value);
    }} className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background">
      <option value="" disabled>Vali spordiala</option>
      {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
      <option value="__custom__">Muu...</option>
    </select>
  );
}

function EffortInput({
  effortType, setEffortType, effortValue, setEffortValue,
}: {
  effortType: string; setEffortType: (v: string) => void;
  effortValue: string; setEffortValue: (v: string) => void;
}) {
  return (
    <div className="mb-2">
      <label className="block text-[13px] mb-0.5 flex items-center">
        Pingutus / Pulss
        <InfoTooltip text="Pingutus: hinda oma pingutust skaalal 1-10. Pulss: sisesta keskmine treeningu pulss löökides minutis (BPM)." />
      </label>
      <div className="flex gap-1 mb-1.5">
        {[
          { key: "", label: "Pole" },
          { key: "effort", label: "Pingutus (1-10)" },
          { key: "heart_rate", label: "Pulss (BPM)" },
        ].map((opt) => (
          <button key={opt.key} type="button"
            onClick={() => { setEffortType(opt.key); setEffortValue(""); }}
            className={`px-2 py-0.5 rounded-sm text-xs cursor-pointer border ${
              effortType === opt.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
      {effortType === "effort" && (
        <input type="number" min={1} max={10} value={effortValue}
          onChange={(e) => setEffortValue(e.target.value)} placeholder="1–10"
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      )}
      {effortType === "heart_rate" && (
        <input type="number" min={30} max={250} value={effortValue}
          onChange={(e) => setEffortValue(e.target.value)} placeholder="Keskmine pulss (BPM)"
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      )}
    </div>
  );
}

function SingleAddForm({ onAdd }: { onAdd: (t: NewTraining) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [effortType, setEffortType] = useState("");
  const [effortValue, setEffortValue] = useState("");
  const [msg, setMsg] = useState("");

  const handleSave = () => {
    if (!name || !date || !duration) return;
    onAdd({
      name, date, duration: parseInt(duration), note: note || null, visibility, group_id: null,
      effort_type: effortType || null,
      effort_value: effortValue ? parseInt(effortValue) : null,
    });
    setName(""); setDate(""); setDuration(""); setNote(""); setEffortType(""); setEffortValue("");
    setMsg("Treening lisatud!");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div>
      <div className="mb-2">
        <label className="block text-[13px] mb-0.5">Spordiala</label>
        <SportSelect value={name} onChange={setName} />
      </div>
      <div className="mb-2">
        <label className="block text-[13px] mb-0.5">Kuupäev</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div className="mb-2">
        <label className="block text-[13px] mb-0.5">Kestus (minutites)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div className="mb-2">
        <label className="block text-[13px] mb-0.5">Märkus</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <EffortInput effortType={effortType} setEffortType={setEffortType} effortValue={effortValue} setEffortValue={setEffortValue} />
      <div className="mb-3">
        <label className="block text-[13px] mb-0.5 flex items-center">
          Nähtavus
          <InfoTooltip text="Sõpradele nähtav: sõbrad näevad sinu treeningut. Privaatne: ainult sina näed. Peidetud: ei näidata avalehel, aga nähtav arhiivis." />
        </label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background">
          <option value="friends">Sõpradele nähtav</option>
          <option value="private">Privaatne</option>
          <option value="hidden">Peidetud</option>
        </select>
      </div>
      <button onClick={handleSave}
        className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer">
        Salvesta
      </button>
      {msg && <p className="text-[13px] mt-2 text-primary">{msg}</p>}
    </div>
  );
}

function PeriodAddForm({ onAddPeriod }: {
  onAddPeriod: (group: { name: string; start_date: string; end_date: string }, entries: NewTraining[]) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [days, setDays] = useState<{ date: string; name: string; duration: string; note: string; enabled: boolean; effortType: string; effortValue: string }[]>([]);
  const [msg, setMsg] = useState("");

  const generateDays = () => {
    if (!startDate || !endDate || startDate > endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: typeof days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push({ date: d.toISOString().slice(0, 10), name: "", duration: "", note: "", enabled: true, effortType: "", effortValue: "" });
    }
    setDays(result);
  };

  const updateDay = (idx: number, field: string, value: string | boolean) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const weekday = (dateStr: string) => new Date(dateStr).toLocaleDateString("et-EE", { weekday: "short" });

  const handleSave = () => {
    const entries = days
      .filter((d) => d.enabled && d.name && d.duration)
      .map((d) => ({
        name: d.name, date: d.date, duration: parseInt(d.duration),
        note: d.note || null, visibility, group_id: null,
        effort_type: d.effortType || null,
        effort_value: d.effortValue ? parseInt(d.effortValue) : null,
      }));
    if (entries.length === 0) return;
    onAddPeriod({ name: groupName || "Periood", start_date: startDate, end_date: endDate }, entries);
    setDays([]); setStartDate(""); setEndDate(""); setGroupName("");
    setMsg(`${entries.length} treeningut lisatud!`);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div>
      <div className="mb-2">
        <label className="block text-[13px] mb-0.5 flex items-center">
          Perioodi nimi
          <InfoTooltip text="Periood grupeerib mitu treeningut koos. Perioodi nähtavus kehtib kõigile selle treeningutele." />
        </label>
        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
          placeholder="nt. Treeningunädal 1"
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
      </div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-[13px] mb-0.5">Algus</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={todayStr()}
            className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
        </div>
        <div className="flex-1">
          <label className="block text-[13px] mb-0.5">Lõpp</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayStr()} min={startDate}
            className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background" />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[13px] mb-0.5 flex items-center">
          Nähtavus
          <InfoTooltip text="See kehtib kogu perioodile. Üksikuid treeninguid perioodi sees eraldi muuta ei saa." />
        </label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background">
          <option value="friends">Sõpradele nähtav</option>
          <option value="private">Privaatne</option>
          <option value="hidden">Peidetud</option>
        </select>
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
                    onChange={(e) => updateDay(idx, "enabled", e.target.checked)} className="accent-primary" />
                  <span className="text-sm font-medium">{day.date}</span>
                  <span className="text-xs text-muted-foreground">({weekday(day.date)})</span>
                </div>
                {day.enabled && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      <select value={day.name} onChange={(e) => {
                        if (e.target.value === "__custom__") updateDay(idx, "name", "");
                        else updateDay(idx, "name", e.target.value);
                      }} className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background">
                        <option value="" disabled>Spordiala</option>
                        {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                        <option value="__custom__">Muu...</option>
                      </select>
                      <input type="number" placeholder="Min" value={day.duration}
                        onChange={(e) => updateDay(idx, "duration", e.target.value)}
                        className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                      <input type="text" placeholder="Märkus" value={day.note}
                        onChange={(e) => updateDay(idx, "note", e.target.value)}
                        className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background" />
                    </div>
                    {day.name === "" && !SPORT_TYPES.includes(day.name as any) && (
                      <input type="text" placeholder="Sisesta spordiala" value={day.name}
                        onChange={(e) => updateDay(idx, "name", e.target.value)}
                        className="border border-border rounded-sm px-1.5 py-0.5 text-xs bg-background w-full" />
                    )}
                    <div className="flex gap-1.5 items-center">
                      <select value={day.effortType} onChange={(e) => { updateDay(idx, "effortType", e.target.value); updateDay(idx, "effortValue", ""); }}
                        className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background">
                        <option value="">Pole</option>
                        <option value="effort">Pingutus</option>
                        <option value="heart_rate">Pulss</option>
                      </select>
                      {day.effortType === "effort" && (
                        <input type="number" min={1} max={10} placeholder="1-10" value={day.effortValue}
                          onChange={(e) => updateDay(idx, "effortValue", e.target.value)}
                          className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background w-16" />
                      )}
                      {day.effortType === "heart_rate" && (
                        <input type="number" min={30} max={250} placeholder="BPM" value={day.effortValue}
                          onChange={(e) => updateDay(idx, "effortValue", e.target.value)}
                          className="border border-border rounded-sm px-1 py-0.5 text-xs bg-background w-16" />
                      )}
                    </div>
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

export default function AddView({
  onAdd,
  onAddPeriod,
}: {
  onAdd: (t: NewTraining) => void;
  onAddPeriod: (group: { name: string; start_date: string; end_date: string }, entries: NewTraining[]) => void;
}) {
  const [mode, setMode] = useState<"single" | "period">("single");

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">Lisa treening</h2>
      <div className="flex gap-1 mb-4">
        {(["single", "period"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-sm text-sm cursor-pointer border ${
              mode === m ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"
            }`}>
            {m === "single" ? "Üksik treening" : "Periood"}
          </button>
        ))}
      </div>
      {mode === "single" ? <SingleAddForm onAdd={onAdd} /> : <PeriodAddForm onAddPeriod={onAddPeriod} />}
    </div>
  );
}
