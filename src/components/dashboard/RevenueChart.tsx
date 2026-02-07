"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSAR } from "@/lib/utils/formatters";

interface RevenueChartProps {
  data: { date: string; revenue: number; label?: string }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
        No settled revenue data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number | undefined) => [formatSAR(value ?? 0), "Revenue"]}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.label ?? payload?.[0]?.payload?.date
          }
          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--chart-1)"
          fill="url(#revenueGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
