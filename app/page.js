"use client";
// Dashboard: the numbers that matter, the money graph, tonight's rooms, and insights.

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info, Sparkles, TrendingUp } from "lucide-react";
import { staysOnNight, useData } from "@/lib/data";
import { buildInsights } from "@/lib/insights";
import { addDays, dayKey, fmtDay, fmtDayLong, money, monthKey, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useDialogs } from "@/components/Shell";
import { StatCard, StatusBadge } from "@/components/shared";
import { RevenueChart, OccupancyChart } from "@/components/Charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RANGES = { "30d": 30, "90d": 90, "1y": 365 };

export default function DashboardPage() {
  const { data } = useData();
  const { newBooking, openBooking } = useDialogs();
  const [range, setRange] = useState("30d");
  const today = todayKey();
  const active = data.bookings.filter((b) => b.active);
  const usableRooms = data.rooms.filter((room) => !room.under_maintenance);

  // ---- Stat cards: this month vs last month, next 7 nights vs the 7 before ----
  const thisMonth = monthKey(today);
  const lastMonth = monthKey(addDays(today.slice(0, 7) + "-01", -1));
  const received = (key) => data.payments.filter((p) => monthKey(dayKey(p.payment_timestamp)) === key).reduce((s, p) => s + Number(p.amount), 0);
  const bookingsIn = (key) => active.filter((b) => monthKey(b.inKey) === key).length;
  const occupancy = (from) => {
    let booked = 0;
    for (let i = 0; i < 7; i++) booked += staysOnNight(data.bookings, addDays(from, i)).length;
    return usableRooms.length ? Math.round((booked / (usableRooms.length * 7)) * 100) : 0;
  };
  const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0);
  const signed = (n, prefix = "") => (n > 0 ? `+${prefix}${n.toLocaleString()}` : `${prefix}${n.toLocaleString()}`);

  const recNow = received(thisMonth), recBefore = received(lastMonth);
  const bkNow = bookingsIn(thisMonth), bkBefore = bookingsIn(lastMonth);
  const occNow = occupancy(today), occBefore = occupancy(addDays(today, -7));
  const outstanding = active.filter((b) => b.balance > 0);
  const toCollect = outstanding.reduce((s, b) => s + b.balance, 0);

  // ---- Revenue graph: money received per day over the chosen range ----
  const days = RANGES[range];
  const byDay = {};
  for (const p of data.payments) {
    const key = dayKey(p.payment_timestamp);
    byDay[key] = (byDay[key] || 0) + Number(p.amount);
  }
  const points = Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - days + 1);
    return { key, label: fmtDay(key), long: fmtDayLong(key), amount: byDay[key] || 0 };
  });
  const rangeTotal = points.reduce((s, p) => s + p.amount, 0);
  const previousTotal = data.payments
    .filter((p) => { const k = dayKey(p.payment_timestamp); return k >= addDays(today, -2 * days + 1) && k < addDays(today, -days + 1); })
    .reduce((s, p) => s + Number(p.amount), 0);

  // ---- Occupancy graph: next 14 nights ----
  const nights = Array.from({ length: 14 }, (_, i) => {
    const key = addDays(today, i);
    return { label: fmtDay(key).split(" ")[0], long: fmtDayLong(key), booked: staysOnNight(data.bookings, key).length };
  });

  const tonight = staysOnNight(data.bookings, today);
  const arrivals = active.filter((b) => b.inKey === today);
  const departures = active.filter((b) => b.outKey === today);
  const inHouse = data.bookings.filter((b) => b.booking_status === "checked_in");
  const insights = buildInsights(data);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy, next 7 nights" value={`${occNow}%`} change={pct(occNow, occBefore)} delta={`${signed(occNow - occBefore)} pts`} compare="vs last 7 nights" />
        <StatCard label="Received this month" value={money(recNow)} change={pct(recNow, recBefore)} delta={signed(recNow - recBefore, "Rs. ")} />
        <StatCard label="Bookings this month" value={bkNow} change={pct(bkNow, bkBefore)} delta={signed(bkNow - bkBefore)} />
        <StatCard label="Still to collect" value={money(toCollect)} hint={`${outstanding.length} booking${outstanding.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardDescription>Money received over time</CardDescription>
              <CardTitle className="mt-1 text-2xl font-semibold nums">{money(rangeTotal)}</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {previousTotal > 0 && (
                <span className={cn("text-xs nums", rangeTotal >= previousTotal ? "text-good" : "text-critical")}>
                  {signed(pct(rangeTotal, previousTotal))}% <span className="text-muted-foreground">vs previous {days} days</span>
                </span>
              )}
              <Tabs value={range} onValueChange={setRange}>
                <TabsList className="h-8">
                  {Object.keys(RANGES).map((key) => <TabsTrigger key={key} value={key} className="px-2.5 text-xs">{key}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent><RevenueChart points={points} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tonight</CardTitle>
            <CardDescription>{fmtDay(today, { weekday: true, year: true })} · {tonight.length} of {usableRooms.length} rooms booked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.rooms.map((room) => {
              const stay = tonight.find((b) => b.room_id === room.room_id);
              return (
                <button
                  key={room.room_id}
                  disabled={room.under_maintenance}
                  onClick={() => (stay ? openBooking(stay.booking_id) : newBooking({ roomId: room.room_id, inKey: today }))}
                  className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-left transition hover:bg-accent disabled:opacity-50"
                >
                  <span className="w-8 text-lg font-semibold nums">{room.room_number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {room.under_maintenance ? "Under maintenance" : stay ? stay.guest?.name : "Free tonight"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {room.under_maintenance ? "Cannot be booked" : stay ? `Until ${fmtDay(stay.outKey)}${stay.balance > 0 ? ` · ${money(stay.balance)} due` : ""}` : `${money(room.price_per_night)} a night`}
                    </span>
                  </span>
                  {stay && <StatusBadge status={stay.booking_status} />}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="today">
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="status">By status</TabsTrigger>
                <TabsTrigger value="rooms">By room</TabsTrigger>
                <TabsTrigger value="occupancy">Next 14 nights</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="mt-4 grid gap-4 sm:grid-cols-3">
                <MiniList title="Arriving" list={arrivals} empty="No arrivals today" openBooking={openBooking} />
                <MiniList title="Leaving" list={departures} empty="No departures today" openBooking={openBooking} />
                <MiniList title="In house" list={inHouse} empty="Nobody checked in" openBooking={openBooking} />
              </TabsContent>
              <TabsContent value="status" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["confirmed", "checked_in", "checked_out", "cancelled"].map((status) => (
                  <Link key={status} href="/bookings" className="rounded-md border bg-background p-4 transition hover:bg-accent">
                    <StatusBadge status={status} />
                    <p className="mt-3 text-2xl font-semibold nums">{data.bookings.filter((b) => b.booking_status === status).length}</p>
                    <p className="text-xs text-muted-foreground">bookings</p>
                  </Link>
                ))}
              </TabsContent>
              <TabsContent value="rooms" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.rooms.map((room) => {
                  const mine = active.filter((b) => b.room_id === room.room_id);
                  return (
                    <Link key={room.room_id} href="/rooms" className="rounded-md border bg-background p-4 transition hover:bg-accent">
                      <p className="text-sm text-muted-foreground">Room {room.room_number}</p>
                      <p className="mt-2 text-2xl font-semibold nums">{mine.length}</p>
                      <p className="text-xs text-muted-foreground nums">{money(mine.reduce((s, b) => s + b.total_price, 0))} booked</p>
                    </Link>
                  );
                })}
              </TabsContent>
              <TabsContent value="occupancy" className="mt-4">
                <OccupancyChart nights={nights} roomCount={usableRooms.length} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-warning" /> Smart insights</CardTitle>
            <CardDescription>Worked out from your bookings and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
            ) : (
              <ul className="space-y-2">
                {insights.map((insight, index) => <li key={index}><InsightRow insight={insight} openBooking={openBooking} /></li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniList({ title, list, empty, openBooking }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="mb-2 text-xs text-muted-foreground">{title} <span className="nums">{list.length}</span></p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 5).map((b) => (
            <li key={b.booking_id}>
              <button onClick={() => openBooking(b.booking_id)} className="w-full rounded-md px-1 py-1 text-left text-sm hover:bg-accent">
                <span className="block truncate font-medium">{b.guest?.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Room {b.room?.room_number}{b.balance > 0 && ` · ${money(b.balance)} due`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TONE = {
  warning: { icon: AlertTriangle, color: "text-warning" },
  good: { icon: TrendingUp, color: "text-good" },
  info: { icon: Info, color: "text-muted-foreground" },
};

function InsightRow({ insight, openBooking }) {
  const { icon: Icon, color } = TONE[insight.tone];
  const body = (
    <span className="flex gap-2.5 rounded-md border bg-background p-3 text-left transition hover:bg-accent">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{insight.title}</span>
        {insight.detail && <span className="block text-xs text-muted-foreground">{insight.detail}</span>}
      </span>
    </span>
  );
  if (insight.bookingId) return <button className="block w-full" onClick={() => openBooking(insight.bookingId)}>{body}</button>;
  if (insight.href) return <Link className="block" href={insight.href}>{body}</Link>;
  return body;
}
