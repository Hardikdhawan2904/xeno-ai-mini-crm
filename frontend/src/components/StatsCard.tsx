interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: "indigo" | "green" | "amber" | "rose";
}

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

export default function StatsCard({ label, value, sub, color = "indigo" }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color].split(" ")[1]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
