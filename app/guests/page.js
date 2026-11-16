"use client";
// Guest list with search, edit and delete.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/data";
import { deleteGuest, friendlyError } from "@/lib/actions";
import { fmtDay, money } from "@/lib/dates";
import { useDialogs } from "@/components/Shell";
import { ConfirmDelete, EmptyState, ErrorText, PageTitle, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const BLANK = { name: "", contact: "", nationality: "", address: "", id_number: "", date_of_birth: "" };

export default function GuestsPage() {
  const { data, reload } = useData();
  const { newBooking } = useDialogs();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || ""); // the Ctrl+K search sends ?q=phone
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const words = search.trim().toLowerCase();
  const guests = data.guests.filter((g) => !words || g.name.toLowerCase().includes(words) || g.contact.includes(words));
  const staysOf = (guest) => data.bookings.filter((b) => b.active && b.guest_id === guest.guest_id);

  async function confirmDelete() {
    setBusy(true);
    const { error } = await deleteGuest(toDelete.guest_id);
    setError(friendlyError(error, `${toDelete.name} has bookings, so the record cannot be deleted. Delete their bookings first if you really want to remove them.`));
    await reload();
    setBusy(false);
    if (!error) setToDelete(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle description={`${data.guests.length} guests`} actions={<Button size="sm" onClick={() => setEditing(BLANK)}><UserPlus /> Add guest</Button>}>
        Guests
      </PageTitle>
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Name or phone number" aria-label="Search guests" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ErrorText>{error}</ErrorText>

      {guests.length === 0 ? (
        <EmptyState title={words ? "No guest matches that search" : "No guests yet"}>Guests are added here, or while making a booking.</EmptyState>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead>Stays</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Spent</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => {
                const stays = staysOf(guest);
                const last = stays[stays.length - 1];
                return (
                  <TableRow key={guest.guest_id} className="cursor-pointer" onClick={() => setEditing(guest)}>
                    <TableCell>
                      <span className="block font-medium">{guest.name}</span>
                      <span className="block text-xs text-muted-foreground nums">{guest.contact}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {[guest.nationality, guest.address].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="block nums">{stays.length}</span>
                      {last && <span className="block text-xs text-muted-foreground">Last {fmtDay(last.inKey, { year: true })}</span>}
                    </TableCell>
                    <TableCell className="hidden text-right nums sm:table-cell">{money(stays.reduce((s, b) => s + b.total_price, 0))}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => newBooking({ guestId: guest.guest_id })}>New booking</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(guest)}><Pencil /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setToDelete(guest)}><Trash2 /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {editing && <GuestForm guest={editing} onClose={() => setEditing(null)} />}
      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete ? `Delete ${toDelete.name}?` : ""}
        description="The guest's details are removed permanently. Guests with bookings cannot be deleted, so their history stays safe."
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function GuestForm({ guest, onClose }) {
  const { reload } = useData();
  const isNew = !guest.guest_id;
  const [form, setForm] = useState(Object.fromEntries(Object.keys(BLANK).map((k) => [k, guest[k] ?? ""])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    // Empty boxes are saved as "no value" (null), not as empty text
    const row = Object.fromEntries(Object.keys(BLANK).map((k) => [k, form[k].trim() === "" ? null : form[k].trim()]));
    const { error } = isNew ? await supabase.from("guest").insert(row) : await supabase.from("guest").update(row).eq("guest_id", guest.guest_id);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await reload();
    onClose();
  }

  const field = (key, label, props = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`g-${key}`}>{label}</Label>
      <Input id={`g-${key}`} value={form[key]} onChange={set(key)} {...props} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Add guest" : guest.name}</DialogTitle>
          <DialogDescription>Only the name and phone number are required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {field("name", "Name", { required: true })}
          {field("contact", "Phone number", { required: true, type: "tel", inputMode: "tel" })}
          {field("id_number", "NIC or passport number")}
          {field("nationality", "Nationality")}
          {field("date_of_birth", "Date of birth", { type: "date" })}
          {field("address", "Address")}
          <div className="space-y-3 sm:col-span-2">
            <ErrorText>{error}</ErrorText>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy && <Spinner />} {isNew ? "Add guest" : "Save changes"}</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
