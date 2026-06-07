interface ChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}

export function Chip({ label, active, color, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px", fontSize: 11,
        border: `0.5px solid ${active ? color || "#6366f1" : "#e4e9f0"}`,
        borderRadius: 20, cursor: "pointer", fontWeight: active ? 500 : 400,
        background: active ? color || "#6366f1" : "#fff",
        color: active ? "#fff" : "#64748b", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
