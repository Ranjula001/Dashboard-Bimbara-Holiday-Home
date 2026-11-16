"use client";
// Rooms: prices, capacity, maintenance, add and delete.

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { staysOnNight, useData } from "@/lib/data";
import { deleteRoom, friendlyError } from "@/lib/actions";
import { addDays, money, todayKey } from "@/lib/dates";
import { ConfirmDelete, ErrorText, PageTitle, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const BLANK = { room_number: "", price_per_night: "", max_capacity: 4, has_ac: true, has_hotwater: false, under_maintenance: false };

export default function RoomsPage() {
  const { data, reload } = useData();
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  async function confirmDelete() {
    setBusy(true);
    const { error } = await deleteRoom(toDelete.room_id);
    setError(friendlyError(error, `Room ${toDelete.room_number} has bookings, so it cannot be deleted. Mark it as under maintenance instead to stop new bookings.`));
    await reload();
    setBusy(false);
    if (!error) setToDelete(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle description={`${data.rooms.length} rooms`} actions={<Button size="sm" onClick={() => setEditing(BLANK)}><Plus /> Add room</Button>}>
        Rooms
      </PageTitle>
      <ErrorText>{error}</ErrorText>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.rooms.map((room) => {
          let booked = 0;
          for (let i = 0; i < 30; i++) if (staysOnNight(data.bookings, addDays(today, i)).some((b) => b.room_id === room.room_id)) booked++;
          const earned = data.bookings.filter((b) => b.active && b.room_id === room.room_id).reduce((s, b) => s + b.total_price, 0);
          return (
            <Card key={room.room_id} className="py-5">
              <CardContent className="space-y-4 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-3xl font-semibold nums">{room.room_number}</p>
                    <p className="text-sm text-muted-foreground">Up to {room.max_capacity} guests</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-right">
                      <span className="block font-medium nums">{money(room.price_per_night)}</span>
                      <span className="block text-xs text-muted-foreground">a night</span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(room)}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setToDelete(room)}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {room.has_ac && <Badge variant="secondary">AC</Badge>}
                  {room.has_hotwater && <Badge variant="secondary">Hot water</Badge>}
                  {room.under_maintenance && <Badge variant="outline" className="border-warning/40 text-warning">Under maintenance</Badge>}
                </div>
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-chart-2" style={{ width: `${(booked / 30) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 flex justify-between text-xs text-muted-foreground nums">
                    <span>{booked} of the next 30 nights booked</span>
                    <span>{money(earned)} booked in total</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && <RoomForm room={editing} onClose={() => setEditing(null)} />}
      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete ? `Delete room ${toDelete.room_number}?` : ""}
        description="Rooms with bookings cannot be deleted; mark them as under maintenance instead. A room with no bookings is removed permanently."
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function RoomForm({ room, onClose }) {
  const { reload } = useData();
  const isNew = !room.room_id;
  const [form, setForm] = useState({ ...room });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    const row = {
      room_number: String(form.room_number).trim(),
      price_per_night: Number(form.price_per_night),
      max_capacity: Number(form.max_capacity),
      has_ac: form.has_ac,
      has_hotwater: form.has_hotwater,
      under_maintenance: form.under_maintenance,
    };
    const { error } = isNew ? await supabase.from("room").insert(row) : await supabase.from("room").update(row).eq("room_id", room.room_id);
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "Another room already has that number." : friendlyError(error));
    await reload();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Add a room" : `Room ${room.room_number}`}</DialogTitle>
          <DialogDescription>A new price applies to new bookings only. Existing bookings keep the price they were made at.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-num">Room number</Label>
              <Input id="r-num" required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-price">Price a night (Rs.)</Label>
              <Input id="r-price" required type="number" inputMode="numeric" min="0" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-cap">Most guests</Label>
              <Input id="r-cap" required type="number" inputMode="numeric" min="1" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} />
            </div>
          </div>
          <div className="divide-y rounded-md border">
            <Toggle label="Air conditioning" checked={form.has_ac} onChange={(v) => setForm({ ...form, has_ac: v })} />
            <Toggle label="Hot water" checked={form.has_hotwater} onChange={(v) => setForm({ ...form, has_hotwater: v })} />
            <Toggle label="Under maintenance" hint="The room cannot be booked while this is on" checked={form.under_maintenance} onChange={(v) => setForm({ ...form, under_maintenance: v })} />
          </div>
          <ErrorText>{error}</ErrorText>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Spinner />} {isNew ? "Add room" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
