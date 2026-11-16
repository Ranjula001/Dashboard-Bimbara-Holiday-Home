"use client";
// The Ctrl+K search: jump to a page, a guest or a booking.

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useData } from "@/lib/data";
import { fmtDay } from "@/lib/dates";
import { NAV, SYSTEM_NAV } from "./AppSidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export default function CommandMenu({ open, onOpenChange, openBooking, newBooking }) {
  const router = useRouter();
  const { data } = useData();

  function go(action) {
    onOpenChange(false);
    action();
  }

  const recent = data ? [...data.bookings].reverse().slice(0, 40) : [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a page, guest or booking">
      <CommandInput placeholder="Type a guest name, phone or page…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => newBooking())}>
            <Plus /> New booking
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Pages">
          {[...NAV, ...SYSTEM_NAV].map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={`page ${label}`} onSelect={() => go(() => router.push(href))}>
              <Icon /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
        {data?.guests.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Guests">
              {data.guests.map((guest) => (
                <CommandItem
                  key={guest.guest_id}
                  value={`guest ${guest.name} ${guest.contact}`}
                  onSelect={() => go(() => router.push(`/guests?q=${encodeURIComponent(guest.contact)}`))}
                >
                  <span className="flex-1 truncate">{guest.name}</span>
                  <span className="text-xs text-muted-foreground nums">{guest.contact}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Bookings">
              {recent.map((b) => (
                <CommandItem
                  key={b.booking_id}
                  value={`booking ${b.guest?.name} ${b.guest?.contact} room ${b.room?.room_number} ${b.inKey}`}
                  onSelect={() => go(() => openBooking(b.booking_id))}
                >
                  <span className="flex-1 truncate">
                    {b.guest?.name} <span className="text-muted-foreground">· Room {b.room?.room_number}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDay(b.inKey)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
