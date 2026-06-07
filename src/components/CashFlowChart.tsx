import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RChart, ResponsiveContainer,
} from "recharts";
import { ChartTip } from "./ChartTip";
import type { MonthlyDataPoint } from "../types";

interface CashFlowChartProps {
  data: MonthlyDataPoint[];
  height: number;
}

export function CashFlowChart({ data, height }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="36%" barGap={1}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v / 1000)}k`} width={34} />
        <RChart content={<ChartTip />} />
        <Bar dataKey="income"      name="Income"     fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="savings"     name="Savings"    fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="investments" name="Investment" fill="#a78bfa" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="retirement"  name="Retirement" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="spending"    name="Spending"   fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Line type="monotone" dataKey="net" name="Net" stroke="#475569" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5, fill: "#475569" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
