"use client";
// New booking, or editing an existing one (pass bookingId).
// Saving a new booking: (1) guest, (2) booking, (3) add-on services, (4) advance payment.

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { roomIsFree, useData } from "@/lib/data";
import { friendlyError } from "@/lib/actions";
import { addDays, diffDays, fmtDay, money, stayInstant, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorText, Spinner } from "./shared";

export default function BookingForm({ prefill = {}, bookingId, onClose, onSaved }) {
  const { data, reload } = useData();
  const editing = bookingId ? data.bookings.find((b) => b.booking_id === bookingId) : null;
  const today = todayKey();

  const [guestMode, setGuestMode] = useState(editing || data.guests.length > 0 ? "existing" : "new");
  const [guestId, setGuestId] = useState(editing ? String(editing.guest_id) : prefill.guestId ? String(prefill.guestId) : "");
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [inKey, setInKey] = useState(editing?.inKey || prefill.inKey || today);
  const [outKey, setOutKey] = useState(editing?.outKey || addDays(prefill.inKey || today, 1));
  const [roomId, setRoomId] = useState(editing ? String(editing.room_id) : prefill.roomId ? String(prefill.roomId) : "");
  const [headCount, setHeadCount] = useState(editing?.head_count ?? 2);
  const [serviceIds, setServiceIds] = useState(editing ? editing.services.map((s) => s.service_id) : []);
  const [customTotal, setCustomTotal] = useState(editing ? String(editing.total_price) : null);
  const [advance, setAdvance] = useState("");
  const [payType, setPayType] = useState("cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nights = diffDays(inKey, outKey);
  const datesOk = nights > 0;

  // Rooms free for these dates: the overlap formula, ignoring this booking when editing
  const rooms = useMemo(
    () =>
      data.rooms.map((room) => ({
        ...room,
        free:
          datesOk &&
          !room.under_maintenance &&
          roomIsFree(data.bookings, room.room_id, inKey, outKey, bookingId),
      })),
    [data, inKey, outKey, datesOk, bookingId]
  );
  const room = rooms.find((r) => String(r.room_id) === roomId);
  const chosenServices = data.services.filter((s) => serviceIds.includes(s.service_id));
  const calculatedTotal =
    (room && datesOk ? nights * Number(room.price_per_night) : 0) +
    chosenServices.reduce((sum, s) => sum + Number(s.price), 0);
  const total = customTotal ?? calculatedTotal;

  function changeCheckIn(key) {
    setInKey(key);
    if (diffDays(key, outKey) <= 0) setOutKey(addDays(key, 1));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    if (!datesOk) return setError("The leaving date must be after the arrival date.");
    if (!room) return setError("Choose a room.");
    if (!room.free) return setError(`Room ${room.room_number} is not free for these dates.`);
    if (guestMode === "existing" && !guestId) return setError("Choose a guest, or switch to New guest.");
    if (!editing && Number(advance) > Number(total)) return setError("The advance is more than the total price.");

    setBusy(true);
    try {
      let finalGuestId = Number(guestId);
      if (guestMode === "new") {
        const { data: created, error } = await supabase
          .from("guest")
          .insert({ name: guestName.trim(), contact: guestContact.trim() })
          .select()
          .single();
        if (error) throw error;
        finalGuestId = created.guest_id;
      }

      const row = {
        room_id: room.room_id,
        guest_id: finalGuestId,
        check_in: stayInstant(inKey, "in"),
        check_out: stayInstant(outKey, "out"),
        head_count: Number(headCount),
        total_price: Number(total),
      };

      let savedId = bookingId;
      if (editing) {
        const { error } = await supabase.from("booking").update(row).eq("booking_id", bookingId);
        if (error) throw error;
        // Replace the add-on services with the new list
        const { error: clearError } = await supabase.from("booking_service").delete().eq("booking_id", bookingId);
        if (clearError) throw clearError;
      } else {
        const { data: booking, error } = await supabase.from("booking").insert(row).select().single();
        if (error) throw error;
        savedId = booking.booking_id;
      }

      if (chosenServices.length > 0) {
        const { error } = await supabase.from("booking_service").insert(
          chosenServices.map((s) => ({ booking_id: savedId, service_id: s.service_id, price: s.price }))
        );
        if (error) throw error;
      }

      if (!editing && Number(advance) > 0) {
        const { error } = await supabase
          .from("payment")
          .insert({ booking_id: savedId, amount: Number(advance), payment_type: payType });
        if (error) throw error;
      }

      await reload();
      onSaved ? onSaved(savedId) : onClose();
    } catch (problem) {
      setError(friendlyError(problem));
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit booking · Room ${editing.room?.room_number}` : "New booking"}</DialogTitle>
          <DialogDescription>
            {editing ? "Change the dates, room, guests or price. Payments are managed on the booking itself." : "Reserve a room for a guest."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-5">
          {/* Guest */}
          <div className="space-y-3">
            <Tabs value={guestMode} onValueChange={setGuestMode}>
              <TabsList className="w-full">
                <TabsTrigger value="existing" className="flex-1">Returning guest</TabsTrigger>
                <TabsTrigger value="new" className="flex-1">New guest</TabsTrigger>
              </TabsList>
            </Tabs>
            {guestMode === "existing" ? (
              <div className="space-y-1.5">
                <Label>Guest</Label>
                <Select value={guestId} onValueChange={setGuestId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose a guest" /></SelectTrigger>
                  <SelectContent>
                    {data.guests.map((guest) => (
                      <SelectItem key={guest.guest_id} value={String(guest.guest_id)}>
                        {guest.name} · {guest.contact}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-name">Guest name</Label>
                  <Input id="g-name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-phone">Phone number</Label>
                  <Input id="g-phone" required type="tel" inputMode="tel" value={guestContact} onChange={(e) => setGuestContact(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="in">Arrives</Label>
              <Input id="in" type="date" required value={inKey} onChange={(e) => changeCheckIn(e.target.value)} />
              <p className="text-xs text-muted-foreground">Check-in from 2 PM</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="out">Leaves</Label>
              <Input id="out" type="date" required min={addDays(inKey, 1)} value={outKey} onChange={(e) => setOutKey(e.target.value)} />
              <p className="text-xs text-muted-foreground">Check-out by 11 AM</p>
            </div>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label>
              Room{datesOk && <span className="font-normal text-muted-foreground"> · {nights} night{nights === 1 ? "" : "s"}, {fmtDay(inKey)} to {fmtDay(outKey)}</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rooms.map((r) => {
                const selected = String(r.room_id) === roomId;
                return (
                  <button
                    key={r.room_id}
                    type="button"
                    disabled={!r.free}
                    onClick={() => setRoomId(String(r.room_id))}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-md border p-3 text-left transition disabled:opacity-40",
                      selected ? "border-primary bg-primary/10" : "bg-background hover:bg-accent"
                    )}
                  >
                    <span className="block text-base font-semibold">Room {r.room_number}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.under_maintenance ? "Under maintenance" : r.free ? `${money(r.price_per_night)} a night` : "Booked on these dates"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Up to {r.max_capacity}{r.has_hotwater ? ", hot water" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heads">Number of guests</Label>
            <Input id="heads" type="number" inputMode="numeric" min="1" required value={headCount} onChange={(e) => setHeadCount(e.target.value)} />
            {room && Number(headCount) > room.max_capacity && (
              <p className="text-xs text-warning">Room {room.room_number} is meant for up to {room.max_capacity}.</p>
            )}
          </div>

          {/* Add-on services */}
          {data.services.length > 0 && (
            <div className="space-y-1.5">
              <Label>Add-on services</Label>
              <div className="flex flex-wrap gap-2">
                {data.services.map((service) => {
                  const on = serviceIds.includes(service.service_id);
                  return (
                    <button
                      key={service.service_id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setServiceIds((ids) => (on ? ids.filter((x) => x !== service.service_id) : [...ids, service.service_id]))}
                      className={cn("h-8 rounded-full border px-3 text-sm transition", on ? "border-primary bg-primary/10" : "text-muted-foreground hover:bg-accent")}
                    >
                      {service.name}{Number(service.price) > 0 && ` · ${money(service.price)}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Money */}
          <div className={cn("grid gap-3", editing ? "sm:grid-cols-1" : "sm:grid-cols-3")}>
            <div className="space-y-1.5">
              <Label htmlFor="total">Total price (Rs.)</Label>
              <Input id="total" type="number" inputMode="numeric" min="0" required value={total}
                onChange={(e) => setCustomTotal(e.target.value === "" ? null : e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {customTotal === null ? "Calculated for you" : `Calculated: ${money(calculatedTotal)}`}
              </p>
            </div>
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="advance">Advance paid (Rs.)</Label>
                  <Input id="advance" type="number" inputMode="numeric" min="0" placeholder="0" value={advance} onChange={(e) => setAdvance(e.target.value)} />
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
              </>
            )}
          </div>

          <ErrorText>{error}</ErrorText>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />} {editing ? "Save changes" : "Save booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
