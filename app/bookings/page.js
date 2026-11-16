"use client";
// All bookings in a table, with filters, search and row actions.

import { useState } from "react";
import { Download, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useData } from "@/lib/data";
import { deleteBooking, downloadCsv, friendlyError } from "@/lib/actions";
import { fmtDay, money, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useDialogs } from "@/components/Shell";
import { ConfirmDelete, EmptyState, ErrorText, PageTitle, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const FILTERS = [
  ["upcoming", "Upcoming"],
  ["inhouse", "In house"],
  ["unpaid", "Unpaid"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
  ["all", "All"],
];

export default function BookingsPage() {
  const { data, reload } = useData();
  const { openBooking, editBooking, newBooking } = useDialogs();
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  const matches = {
    upcoming: (b) => b.active && b.booking_status === "confirmed" && b.outKey >= today,
    inhouse: (b) => b.booking_status === "checked_in",
    unpaid: (b) => b.active && b.balance > 0,
    past: (b) => b.active && (b.booking_status === "checked_out" || b.outKey < today),
    cancelled: (b) => !b.active,
    all: () => true,
  };
  const words = search.trim().toLowerCase();
  let list = data.bookings.filter(matches[filter]).filter(
    (b) => !words || b.guest?.name.toLowerCase().includes(words) || b.guest?.contact.includes(words) || b.room?.room_number.toLowerCase().includes(words)
  );
  if (filter === "past" || filter === "cancelled" || filter === "all") list = [...list].reverse();

  async function confirmDelete() {
    setBusy(true);
    const { error } = await deleteBooking(toDelete.booking_id);
    setError(friendlyError(error));
    await reload();
    setBusy(false);
    if (!error) setToDelete(null);
  }

  function exportCsv() {
    downloadCsv(
      `bimbara-bookings-${today}.csv`,
      ["Guest", "Phone", "Room", "Arrives", "Leaves", "Nights", "Guests", "Status", "Total", "Paid", "Balance"],
      list.map((b) => [b.guest?.name, b.guest?.contact, b.room?.room_number, b.inKey, b.outKey, b.nights, b.head_count, b.booking_status, b.total_price, b.paid, b.balance])
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle description={`${data.bookings.length} bookings in total`} actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download /> Export CSV</Button>}>
        Bookings
      </PageTitle>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter} className="overflow-x-auto">
          <TabsList>
            {FILTERS.map(([id, label]) => (
              <TabsTrigger key={id} value={id}>
                {label} <span className="ml-1 text-muted-foreground nums">{data.bookings.filter(matches[id]).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Name, phone or room" aria-label="Search bookings" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {list.length === 0 ? (
        <EmptyState title="No bookings here">
          <button className="underline underline-offset-4" onClick={() => newBooking()}>Add a new booking</button>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden sm:table-cell">Room</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.booking_id} className="cursor-pointer" onClick={() => openBooking(b.booking_id)}>
                  <TableCell>
                    <span className="block font-medium">{b.guest?.name}</span>
                    <span className="block text-xs text-muted-foreground nums">{b.guest?.contact} <span className="sm:hidden">· Room {b.room?.room_number}</span></span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell nums">{b.room?.room_number}</TableCell>
                  <TableCell>
                    <span className="block nums">{fmtDay(b.inKey)} → {fmtDay(b.outKey)}</span>
                    <span className="block text-xs text-muted-foreground">{b.nights} night{b.nights === 1 ? "" : "s"}, {b.head_count} guest{b.head_count === 1 ? "" : "s"}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><StatusBadge status={b.booking_status} /></TableCell>
                  <TableCell className={cn("text-right nums", b.active && b.balance > 0 ? "text-warning" : "text-muted-foreground")}>
                    {b.active && b.balance > 0 ? `${money(b.balance)} due` : money(b.total_price)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openBooking(b.booking_id)}>Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editBooking(b.booking_id)}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setToDelete(b)}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete ? `Delete the booking for ${toDelete.guest?.name}?` : ""}
        description={toDelete ? `Room ${toDelete.room?.room_number}, ${fmtDay(toDelete.inKey)} to ${fmtDay(toDelete.outKey)}. Its ${toDelete.payments.length} payment${toDelete.payments.length === 1 ? "" : "s"} are deleted too. This cannot be undone.` : ""}
        confirmLabel="Delete permanently"
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
