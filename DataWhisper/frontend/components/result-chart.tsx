"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type Props = {
  chartType: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export function ResultChart({ chartType, columns, rows }: Props) {
  if (!columns.length || !rows.length) return null;

  const labels = rows.map((r) => String(r[columns[0]] ?? ""));
  const numericCol = columns.find((c, i) => i > 0 && typeof rows[0][c] === "number") || columns[1];
  const values = numericCol ? rows.map((r) => Number(r[numericCol]) || 0) : [];

  if (chartType === "line" && columns.length >= 2) {
    return (
      <div className="h-72 w-full">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: numericCol || "value",
                data: values,
                borderColor: "rgba(45, 212, 191, 0.9)",
                backgroundColor: "rgba(45, 212, 191, 0.15)",
                tension: 0.25,
                fill: true,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#e2e8f0" } } },
            scales: {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
              y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
            },
          }}
        />
      </div>
    );
  }

  if (chartType === "bar" && columns.length >= 2) {
    return (
      <div className="h-72 w-full">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: numericCol || columns[1],
                data: values,
                backgroundColor: "rgba(56, 189, 248, 0.55)",
                borderRadius: 6,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#e2e8f0" } } },
            scales: {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
              y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
            },
          }}
        />
      </div>
    );
  }

  if (chartType === "kpi" && rows.length === 1) {
    const entries = columns.slice(0, 3).map((c) => ({ label: c, value: Number(rows[0][c]) || rows[0][c] }));
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {entries.map((e) => (
          <div key={e.label} className="rounded-lg border border-[hsl(var(--border))] p-4 bg-[hsl(var(--muted))]/30">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{e.label}</p>
            <p className="text-2xl font-semibold mt-1">{String(e.value)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (chartType === "pivot" && columns.length >= 3 && rows.length) {
    const rowKey = columns[0];
    const colKey = columns[1];
    const valKey = columns[2];
    const colSet = Array.from(new Set(rows.map((r) => String(r[colKey] ?? "")))).sort();
    const rowSet = Array.from(new Set(rows.map((r) => String(r[rowKey] ?? "")))).sort();
    const cell = new Map<string, number | string>();
    for (const r of rows) {
      const rk = String(r[rowKey] ?? "");
      const ck = String(r[colKey] ?? "");
      const v = r[valKey];
      const num = typeof v === "number" ? v : Number(v);
      const k = `${rk}\t${ck}`;
      cell.set(k, Number.isFinite(num) ? num : String(v ?? ""));
    }
    return (
      <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border border-[hsl(var(--border))]/70 p-2 text-left bg-[hsl(var(--muted))]/40">{rowKey}</th>
              {colSet.map((c) => (
                <th key={c} className="border border-[hsl(var(--border))]/70 p-2 text-right bg-[hsl(var(--muted))]/40">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowSet.map((rname) => (
              <tr key={rname}>
                <td className="border border-[hsl(var(--border))]/50 p-2 font-medium">{rname}</td>
                {colSet.map((cname) => {
                  const v = cell.get(`${rname}\t${cname}`);
                  return (
                    <td key={cname} className="border border-[hsl(var(--border))]/50 p-2 text-right tabular-nums">
                      {v === undefined ? "—" : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-2 text-[10px] text-[hsl(var(--muted-foreground))]">
          Pivot: rows = {rowKey}, columns = {colKey}, values = {valKey}
        </p>
      </div>
    );
  }

  if (chartType === "doughnut" && labels.length <= 12 && values.length) {
    const palette = ["#2dd4bf", "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#4ade80", "#f472b6", "#818cf8", "#34d399", "#f97316", "#06b6d4", "#e879f9"];
    return (
      <div className="h-72 w-full max-w-lg mx-auto">
        <Doughnut
          data={{
            labels,
            datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length) }],
          }}
          options={{ plugins: { legend: { position: "bottom", labels: { color: "#e2e8f0", font: { size: 11 } } } } }}
        />
      </div>
    );
  }

  // doughnut selected but too many slices → fall back to bar
  if (chartType === "doughnut" && labels.length > 12 && values.length && columns.length >= 2) {
    return (
      <div className="h-72 w-full">
        <Bar
          data={{
            labels,
            datasets: [{ label: numericCol || columns[1], data: values, backgroundColor: "rgba(56, 189, 248, 0.55)", borderRadius: 6 }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#e2e8f0" } } },
            scales: {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
              y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
            },
          }}
        />
      </div>
    );
  }

  // "table" / "empty" / fallback — the parent renders a raw HTML table below
  return null;
}
