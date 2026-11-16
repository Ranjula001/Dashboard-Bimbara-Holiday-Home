"use client";
// Room calendar: rooms down the side, nights across.
// Click an empty night to start a booking there; click a bar to open that booking.

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/data";
import { addDays, diffDays, fmtDay, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useDialogs } from "@/components/Shell";
import { PageTitle } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BAR = {
  confirmed: "bg-chart-1/10 border-chart-1/40",
  checked_in: "bg-good/15 border-good/50",
  checked_out: "bg-muted border-border text-muted-foreground",
};

export default function CalendarPage() {
  const { data } = useData();
  const { newBooking, openBooking } = useDialogs();
  const today = todayKey();
  const [start, setStart] = useState(today);
  const [span, setSpan] = useState("14");
  const DAYS = Number(span);

  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const end = addDays(start, DAYS);
  const columns = { gridTemplateColumns: `80px repeat(${DAYS}, minmax(${DAYS > 14 ? 34 : 52}px, 1fr))` };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        description={`${fmtDay(start)} to ${fmtDay(addDays(end, -1), { year: true })}`}
        actions={
          <>
            <Tabs value={span} onValueChange={setSpan}>
              <TabsList className="h-8">
                <TabsTrigger value="7" className="px-2.5 text-xs">7 nights</TabsTrigger>
                <TabsTrigger value="14" className="px-2.5 text-xs">14</TabsTrigger>
                <TabsTrigger value="28" className="px-2.5 text-xs">28</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon-sm" onClick={() => setStart(addDays(start, -7))} aria-label="Earlier"><ChevronLeft /></Button>
            <Button variant="outline" size="sm" onClick={() => setStart(today)}>Today</Button>
            <Button variant="outline" size="icon-sm" onClick={() => setStart(addDays(start, 7))} aria-label="Later"><ChevronRight /></Button>
          </>
        }
      >
        Calendar
      </PageTitle>

      <Card className="overflow-x-auto py-0">
        <div style={{ minWidth: 80 + DAYS * (DAYS > 14 ? 34 : 52) }}>
          <div className="grid border-b text-center text-xs text-muted-foreground" style={columns}>
            <div />
            {days.map((key) => {
              const [weekday, day] = fmtDay(key, { weekday: true }).replace(",", "").split(" ");
              return (
                <div key={key} className={cn("py-2", key === today && "text-foreground")}>
                  <span className="block">{weekday}</span>
                  <span className={cn("mx-auto mt-0.5 block w-6 rounded-md text-sm nums", key === today ? "bg-primary font-semibold text-primary-foreground" : "text-foreground")}>{day}</span>
                </div>
              );
            })}
          </div>

          {data.rooms.map((room) => {
            const stays = data.bookings.filter((b) => b.active && b.room_id === room.room_id && b.inKey < end && b.outKey > start);
            return (
              <div key={room.room_id} className="grid border-b last:border-b-0" style={columns}>
                <div className="sticky left-0 z-10 flex flex-col justify-center bg-card px-3 py-2">
                  <span className="text-base font-semibold nums">{room.room_number}</span>
                  <span className="text-[11px] text-muted-foreground">{room.under_maintenance ? "Maintenance" : room.has_hotwater ? "Hot water" : "AC"}</span>
                </div>
                {days.map((key, index) => (
                  <button
                    key={key}
                    disabled={room.under_maintenance}
                    onClick={() => newBooking({ roomId: room.room_id, inKey: key })}
                    aria-label={`Book room ${room.room_number} from ${fmtDay(key)}`}
                    style={{ gridColumn: index + 2, gridRow: 1 }}
                    className={cn("h-12 border-l hover:bg-accent disabled:bg-muted/40", key === today && "bg-primary/5")}
                  />
                ))}
                {stays.map((b) => {
                  const from = Math.max(diffDays(start, b.inKey), 0);
                  const to = Math.min(diffDays(start, b.outKey), DAYS);
                  return (
                    <button
                      key={b.booking_id}
                      onClick={() => openBooking(b.booking_id)}
                      style={{ gridColumn: `${from + 2} / ${to + 2}`, gridRow: 1 }}
                      className={cn("z-[5] m-1.5 truncate rounded-md border px-2 text-left text-xs font-medium", BAR[b.booking_status])}
                      title={`${b.guest?.name}, ${fmtDay(b.inKey)} to ${fmtDay(b.outKey)}`}
                    >
                      {b.guest?.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {[["confirmed", "Confirmed"], ["checked_in", "In house"], ["checked_out", "Checked out"]].map(([status, label]) => (
          <li key={status} className="flex items-center gap-2"><span className={cn("inline-block h-3 w-5 rounded border", BAR[status])} />{label}</li>
        ))}
      </ul>
    </div>
  );
}
