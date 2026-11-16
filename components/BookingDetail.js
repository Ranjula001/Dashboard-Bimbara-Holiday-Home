"use client";
// One booking: details, payments, and every action for it.

import { useState } from "react";
import { MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import { useData } from "@/lib/data";
import { addPayment, deleteBooking, deletePayment, friendlyError, setBookingStatus } from "@/lib/actions";
import { fmtDateTime, fmtDay, money } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDialogs } from "./Shell";
import { ConfirmDelete, ErrorText, PAY_LABEL, Spinner, StatusBadge } from "./shared";

export default function BookingDetail({ bookingId, onClose }) {
  const { data, reload } = useData();
  const { editBooking } = useDialogs();
  const booking = data.bookings.find((b) => b.booking_id === bookingId);
  const [amount, setAmount] = useState("");
  const [payType, setPayType] = useState("cash");
  const [confirm, setConfirm] = useState(null); // "cancel" | "delete" | { paymentId }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!booking) return null;

  // Run one database change, then refresh the screen
  async function run(action, afterwards) {
    setBusy(true);
    setError("");
    const { error } = await action();
    if (error) setError(friendlyError(error));
    await reload();
    setBusy(false);
    if (!error && afterwards) afterwards();
  }

  const status = booking.booking_status;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <DialogTitle>Room {booking.room?.room_number} · {booking.guest?.name}</DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />
                  <a href={`tel:${booking.guest?.contact}`} className="inline-flex items-center gap-1 hover:underline">
                    <Phone className="size-3.5" /> {booking.guest?.contact}
                  </a>
                </DialogDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label="More actions"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => editBooking(bookingId)}><Pencil /> Edit booking</DropdownMenuItem>
                  {status === "confirmed" && (
                    <DropdownMenuItem onClick={() => setConfirm("cancel")}>Cancel booking</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}>
                    <Trash2 /> Delete booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="Arrives" value={fmtDay(booking.inKey, { weekday: true })} />
            <Fact label="Leaves" value={fmtDay(booking.outKey, { weekday: true })} />
            <Fact label="Nights" value={booking.nights} />
            <Fact label="Guests" value={booking.head_count} />
          </dl>
          {booking.services.length > 0 && (
            <p className="text-sm text-muted-foreground">Add-ons: {booking.services.map((s) => s.name).join(", ")}</p>
          )}

          <div className="grid grid-cols-3 divide-x rounded-md border bg-background text-center">
            <Sum label="Total" value={money(booking.total_price)} />
            <Sum label="Paid" value={money(booking.paid)} />
            <Sum label={booking.balance < 0 ? "Overpaid" : "To collect"} value={money(Math.abs(booking.balance))} strong={booking.balance > 0} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Payments</h3>
            {booking.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {booking.payments.map((payment) => (
                  <li key={payment.payment_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 text-muted-foreground">
                      {fmtDateTime(payment.payment_timestamp)} · {PAY_LABEL[payment.payment_type]}
                    </span>
                    <span className="font-medium nums">{money(payment.amount)}</span>
                    <Button variant="ghost" size="icon-xs" aria-label="Delete payment" onClick={() => setConfirm({ paymentId: payment.payment_id, amount: payment.amount })}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {status !== "cancelled" && booking.balance > 0 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                run(() => addPayment({ bookingId, amount, type: payType }), () => setAmount(""));
              }}
              className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Payment (Rs.)</Label>
                <Input id="pay-amount" type="number" inputMode="numeric" min="1" max={booking.balance} required placeholder={String(booking.balance)} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Paid by</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="secondary" disabled={busy} className="col-span-2 sm:col-span-1">Add payment</Button>
            </form>
          )}

          <ErrorText>{error}</ErrorText>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {status === "confirmed" && <Button disabled={busy} onClick={() => run(() => setBookingStatus(bookingId, "checked_in"))}>Check in</Button>}
            {status === "checked_in" && <Button disabled={busy} onClick={() => run(() => setBookingStatus(bookingId, "checked_out"))}>Check out</Button>}
            {status === "cancelled" && <Button variant="outline" disabled={busy} onClick={() => run(() => setBookingStatus(bookingId, "confirmed"))}>Restore booking</Button>}
            <Button variant="outline" onClick={() => editBooking(bookingId)}><Pencil /> Edit</Button>
            <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Cancel this booking?"
        description="The room becomes free for these dates. The booking stays in the list as cancelled, so you keep the history and any payments."
        confirmLabel="Cancel booking"
        busy={busy}
        onConfirm={() => run(() => setBookingStatus(bookingId, "cancelled"), () => setConfirm(null))}
      />
      <ConfirmDelete
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this booking?"
        description={`This removes the booking${booking.payments.length ? ` and its ${booking.payments.length} payment${booking.payments.length === 1 ? "" : "s"} (${money(booking.paid)})` : ""} permanently. It cannot be undone. To keep the history, cancel it instead.`}
        confirmLabel="Delete permanently"
        busy={busy}
        onConfirm={() => run(() => deleteBooking(bookingId), () => { setConfirm(null); onClose(); })}
      />
      <ConfirmDelete
        open={Boolean(confirm?.paymentId)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this payment?"
        description={confirm?.paymentId ? `${money(confirm.amount)} will be removed from this booking and the balance goes up again.` : ""}
        busy={busy}
        onConfirm={() => run(() => deletePayment(confirm.paymentId), () => setConfirm(null))}
      />
    </>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Sum({ label, value, strong }) {
  return (
    <div className="px-2 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-base font-semibold nums sm:text-lg", strong && "text-warning")}>{value}</p>
    </div>
  );
}
