"use client";
// The graphs, drawn with Recharts through the shadcn/ui chart wrapper.

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { money } from "@/lib/dates";

const config = {
  amount: { label: "Received", color: "var(--chart-1)" },
  booked: { label: "Rooms booked", color: "var(--chart-2)" },
};

function TipBox({ title, rows }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map(([label, value, color]) => (
        <p key={label} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {label} <span className="ml-auto pl-3 font-medium text-foreground nums">{value}</span>
        </p>
      ))}
    </div>
  );
}

// Money received per day, with a crosshair and tooltip
export function RevenueChart({ points }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fill-amount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox title={payload[0].payload.long} rows={[["Received", money(payload[0].value), "var(--color-amount)"]]} />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--color-amount)"
          strokeWidth={1.5}
          fill="url(#fill-amount)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--background)", stroke: "var(--color-amount)", strokeWidth: 1.5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// Rooms booked on each of the next nights
export function OccupancyChart({ nights, roomCount }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={nights} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} domain={[0, Math.max(roomCount, 1)]} tickCount={Math.min(roomCount, 4) + 1} />
        <ChartTooltip
          cursor={{ fill: "var(--accent)", opacity: 0.6 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox title={payload[0].payload.long} rows={[["Rooms booked", `${payload[0].value} of ${roomCount}`, "var(--color-booked)"]]} />
            ) : null
          }
        />
        <Bar dataKey="booked" fill="var(--color-booked)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
