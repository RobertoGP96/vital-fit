"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";

export type SeriesPoint = { date: string; value: number };

export function EvolutionChart({
  data,
  unit,
  color = "#17C964",
}: {
  data: SeriesPoint[];
  unit: string;
  color?: string;
}) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatShortDate(d)}
            tick={{ fontSize: 11, fill: "#0b1f1480" }}
            tickLine={false}
            axisLine={{ stroke: "#0b1f1420" }}
            minTickGap={24}
          />
          <YAxis
            width={44}
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#0b1f1480" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            formatter={(value) => [`${value} ${unit}`, ""]}
            labelFormatter={(d) => formatShortDate(String(d))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #0b1f1420",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
