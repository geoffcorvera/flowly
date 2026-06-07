import { $ } from "../utils/format";

interface Payload { name: string; value: number; color?: string; stroke?: string; }

interface ChartTipProps {
  active?: boolean;
  payload?: Payload[];
  label?: string;
}

export function ChartTip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #1c2333" }}>
      <p style={{ color: "#6b7280", fontSize: 11, margin: "0 0 6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke, fontSize: 12, margin: "2px 0", fontWeight: 500 }}>
          {p.name}: {$(p.value)}
        </p>
      ))}
    </div>
  );
}
