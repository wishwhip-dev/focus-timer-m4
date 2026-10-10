"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { database } from "@/lib/db";
import { countSessionsByDay, localDayKey } from "@/lib/data/sessions";
import { useStoredQuery } from "@/lib/storage/react";

const chartConfig = {
  sessions: { label: "Sessions", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** `2026-10-10` → `Fri 10`, today by name. Formatted in the browser only (the server never has data). */
function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(year, month - 1, date).toLocaleDateString("en", { weekday: "short" });
  return `${weekday} ${date}`;
}

export function SessionHistory() {
  const { data, isLoading } = useStoredQuery(database, () => countSessionsByDay("focus", 7));
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Last 7 days</CardTitle>
          <CardDescription>Counting your sessions…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]" aria-hidden />
        </CardContent>
      </Card>
    );
  }
  const today = localDayKey(new Date());
  const rows = (data ?? []).map(({ day, count }) => ({ label: dayLabel(day, today), sessions: count }));
  const total = rows.reduce((sum, row) => sum + row.sessions, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Last 7 days</CardTitle>
        <CardDescription>
          {`${total} finished focus session${total === 1 ? "" : "s"} this week`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={rows} margin={{ top: 8, left: -24, right: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={0} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sessions" fill="var(--color-sessions)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
  );
}