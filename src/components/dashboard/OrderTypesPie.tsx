"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ORDER_TYPE_LABELS } from "@/lib/utils/constants";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface OrderTypesPieProps {
  data: { name: string; value: number }[];
}

export default function OrderTypesPie({ data }: OrderTypesPieProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: ORDER_TYPE_LABELS[d.name] ?? d.name,
  }));

  if (!chartData.length || chartData.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
        لا توجد طلبات لعرضها
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(props: { name?: string; percent?: number }) =>
            `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number | undefined) => [value ?? 0, "العدد"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
