"use client";
// Every payment received, with totals, filters, export, and record/delete.

import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data";
import { addPayment, deletePayment, downloadCsv, friendlyError } from "@/lib/actions";
import { addDays, dayKey, fmtDateTime, fmtDay, money, monthKey, todayKey } from "@/lib/dates";
import { useDialogs } from "@/components/Shell";
import { ConfirmDelete, EmptyState, ErrorText, PageTitle, PAY_LABEL, Spinner, StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RANGES = [["month", "This month"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "All time"]];

export default function PaymentsPage() {
  const { data, reload } = useData();
  const { openBooking } = useDialogs();
  const [range, setRange] = useState("month");
  const [type, setType] = useState("all");
  const [recording, setRecording] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  // Join each payment to its booking, guest and room
  const payments = useMemo(() => {
    const byId = new Map(data.bookings.map((b) => [b.booking_id, b]));
    return [...data.payments]
      .map((p) => ({ ...p, amount: Number(p.amount), key: dayKey(p.payment_timestamp), booking: byId.get(p.booking_id) }))
      .sort((a, b) => (a.payment_timestamp < b.payment_timestamp ? 1 : -1));
  }, [data]);

  const inRange = (p) =>
    range === "all" ? true : range === "month" ? monthKey(p.key) === monthKey(today) : p.key >= addDays(today, -Number(range) + 1);
  const list = payments.filter(inRange).filter((p) => type === "all" || p.payment_type === type);
  const total = list.reduce((s, p) => s + p.amount, 0);

  const thisMonth = payments.filter((p) => monthKey(p.key) === monthKey(today)).reduce((s, p) => s + p.amount, 0);
  const lastMonth = payments.filter((p) => monthKey(p.key) === monthKey(addDays(today.slice(0, 7) + "-01", -1))).reduce((s, p) => s + p.amount, 0);
  const weekList = payments.filter((p) => p.key >= addDays(today, -6));
  const thisWeek = weekList.reduce((s, p) => s + p.amount, 0);
  const outstanding = data.bookings.filter((b) => b.active && b.balance > 0);
  const toCollect = outstanding.reduce((s, b) => s + b.balance, 0);
  const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0);
  const byType = ["cash", "bank", "card"].map((t) => [t, list.filter((p) => p.payment_type === t).reduce((s, p) => s + p.amount, 0)]);

  async function confirmDelete() {
    setBusy(true);
    const { error } = await deletePayment(toDelete.payment_id);
    setError(friendlyError(error));
    await reload();
    setBusy(false);
    if (!error) setToDelete(null);
  }

  function exportCsv() {
    downloadCsv(
      `bimbara-payments-${today}.csv`,
      ["Date", "Guest", "Room", "Arrives", "Method", "Amount"],
      list.map((p) => [p.key, p.booking?.guest?.name, p.booking?.room?.room_number, p.booking?.inKey, PAY_LABEL[p.payment_type], p.amount])
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        description="Money received, and what is still owed"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={list.length === 0}><Download /> Export CSV</Button>
            <Button size="sm" onClick={() => setRecording(true)} disabled={outstanding.length === 0}><Plus /> Record payment</Button>
          </>
        }
      >
        Payments
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Received this month" value={money(thisMonth)} change={pct(thisMonth, lastMonth)} delta={`${thisMonth - lastMonth >= 0 ? "+" : "-"}Rs. ${Math.abs(thisMonth - lastMonth).toLocaleString()}`} />
        <StatCard label="Received last 7 days" value={money(thisWeek)} hint={`${weekList.length} payment${weekList.length === 1 ? "" : "s"}`} />
        <StatCard label="Still to collect" value={money(toCollect)} hint={`${outstanding.length} booking${outstanding.length === 1 ? "" : "s"}`} />
        <StatCard label="Shown below" value={money(total)} hint={`${list.length} payment${list.length === 1 ? "" : "s"}`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={range} onValueChange={setRange} className="overflow-x-auto">
          <TabsList>{RANGES.map(([id, label]) => <TabsTrigger key={id} value={id}>{label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground nums lg:inline">
            {byType.map(([t, sum]) => `${PAY_LABEL[t]} ${money(sum)}`).join(" · ")}
          </span>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {list.length === 0 ? (
        <EmptyState title="No payments in this period">Record a payment from a booking, or with the button above.</EmptyState>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden sm:table-cell">Stay</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.payment_id} className="cursor-pointer" onClick={() => p.booking && openBooking(p.booking_id)}>
                  <TableCell className="nums">{fmtDateTime(p.payment_timestamp)}</TableCell>
                  <TableCell>
                    <span className="block font-medium">{p.booking?.guest?.name || "Deleted booking"}</span>
                    <span className="block text-xs text-muted-foreground md:hidden">{PAY_LABEL[p.payment_type]}</span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {p.booking && `Room ${p.booking.room?.room_number} · ${fmtDay(p.booking.inKey)}`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{PAY_LABEL[p.payment_type]}</TableCell>
                  <TableCell className="text-right font-medium nums">{money(p.amount)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete payment" onClick={() => setToDelete(p)}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {recording && <RecordPayment bookings={outstanding} onClose={() => setRecording(false)} />}
      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this payment?"
        description={toDelete ? `${money(toDelete.amount)} from ${toDelete.booking?.guest?.name || "a deleted booking"} will be removed. The booking's balance goes up again.` : ""}
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// Record a payment against any booking that still owes money
function RecordPayment({ bookings, onClose }) {
  const { reload } = useData();
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const booking = bookings.find((b) => String(b.booking_id) === bookingId);

  async function save(event) {
    event.preventDefault();
    if (!booking) return setError("Choose a booking.");
    setBusy(true);
    const { error } = await addPayment({ bookingId: booking.booking_id, amount, type });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await reload();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Only bookings that still owe money are listed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Booking</Label>
            <Select value={bookingId} onValueChange={(v) => { setBookingId(v); setAmount(""); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a booking" /></SelectTrigger>
              <SelectContent>
                {bookings.map((b) => (
                  <SelectItem key={b.booking_id} value={String(b.booking_id)}>
                    {b.guest?.name} · Room {b.room?.room_number} · {fmtDay(b.inKey)} · {money(b.balance)} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-amount">Amount (Rs.)</Label>
              <Input id="rp-amount" type="number" inputMode="numeric" min="1" max={booking?.balance} required placeholder={booking ? String(booking.balance) : ""} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Paid by</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Spinner />} Save payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
