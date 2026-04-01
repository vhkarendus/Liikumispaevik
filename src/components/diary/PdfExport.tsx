import { Training, TrainingGroup } from "@/types/training";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown } from "lucide-react";

function effortText(t: Training) {
  if (!t.effort_type || !t.effort_value) return "-";
  if (t.effort_type === "effort") return `${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `${t.effort_value} BPM`;
  return "-";
}

export function exportTrainingsPdf(
  trainings: Training[],
  groups: TrainingGroup[],
  title: string = "Liikumispäevik"
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Eksporditud: ${new Date().toLocaleDateString("et-EE")}`, 14, 28);

  let y = 35;

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

  // Periods
  for (const [gid, items] of groupMap) {
    const group = groups.find((g) => g.id === gid);
    if (group) {
      doc.setFontSize(12);
      doc.text(`${group.name || "Periood"}: ${group.start_date} – ${group.end_date}`, 14, y);
      y += 5;
    }

    autoTable(doc, {
      startY: y,
      head: [["Kuupäev", "Spordiala", "Kestus (min)", "Pingutus/Pulss", "Märkus"]],
      body: items.map((t) => [
        t.date,
        t.name,
        String(t.duration),
        effortText(t),
        t.note || "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Ungrouped
  if (ungrouped.length > 0) {
    if (groupMap.size > 0) {
      doc.setFontSize(12);
      doc.text("Üksikud treeningud", 14, y);
      y += 5;
    }
    autoTable(doc, {
      startY: y,
      head: [["Kuupäev", "Spordiala", "Kestus (min)", "Pingutus/Pulss", "Märkus"]],
      body: ungrouped.map((t) => [
        t.date,
        t.name,
        String(t.duration),
        effortText(t),
        t.note || "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
  }

  // Summary
  const totalMin = trainings.reduce((s, t) => s + t.duration, 0);
  const finalY = (doc as any).lastAutoTable?.finalY || y;
  doc.setFontSize(10);
  doc.text(`Kokku: ${trainings.length} treeningut, ${totalMin} minutit`, 14, finalY + 10);

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export default function PdfExportButton({
  trainings,
  groups,
  title,
  label = "PDF",
}: {
  trainings: Training[];
  groups: TrainingGroup[];
  title?: string;
  label?: string;
}) {
  return (
    <button
      onClick={() => exportTrainingsPdf(trainings, groups, title)}
      className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border border-border rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground"
    >
      <FileDown className="h-3 w-3" />
      {label}
    </button>
  );
}
