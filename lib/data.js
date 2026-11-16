"use client";
// Loads everything from Supabase once and shares it with every screen.
// BIMBARA is small (a few rooms, a few hundred bookings), so loading all rows
// and doing the maths in the browser keeps the code simple.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, diffDays } from "./dates";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    const results = await Promise.all([
      supabase.from("room").select("*").order("room_number"),
      supabase.from("guest").select("*").order("name"),
      supabase.from("booking").select("*").order("check_in"),
      supabase.from("payment").select("*").order("payment_timestamp"),
      supabase.from("service").select("*").order("service_id"),
      supabase.from("booking_service").select("*"),
    ]);
    const failed = results.find((result) => result.error);
    if (failed) {
      setError(failed.error.message);
      return;
    }
    const [rooms, guests, bookings, payments, services, bookingServices] = results.map(
      (result) => result.data
    );
    setRaw({ rooms, guests, bookings, payments, services, bookingServices });
    setError(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the data once when the app opens
    reload();
  }, [reload]);

  const data = useMemo(() => (raw ? enrich(raw) : null), [raw]);

  return (
    <DataContext.Provider value={{ data, error, reload }}>{children}</DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

// Join the tables together in JavaScript, the same way your SQL JOIN does.
function enrich({ rooms, guests, bookings, payments, services, bookingServices }) {
  const roomById = new Map(rooms.map((room) => [room.room_id, room]));
  const guestById = new Map(guests.map((guest) => [guest.guest_id, guest]));
  const serviceById = new Map(services.map((service) => [service.service_id, service]));

  const fullBookings = bookings.map((booking) => {
    const bookingPayments = payments.filter((p) => p.booking_id === booking.booking_id);
    const paid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const inKey = dayKey(booking.check_in);
    const outKey = dayKey(booking.check_out);
    return {
      ...booking,
      total_price: Number(booking.total_price),
      room: roomById.get(booking.room_id),
      guest: guestById.get(booking.guest_id),
      payments: bookingPayments,
      services: bookingServices
        .filter((row) => row.booking_id === booking.booking_id)
        .map((row) => ({ ...serviceById.get(row.service_id), price: Number(row.price) })),
      paid,
      // Balance is calculated, never stored
      balance: Number(booking.total_price) - paid,
      inKey,
      outKey,
      nights: diffDays(inKey, outKey),
      active: booking.booking_status !== "cancelled",
    };
  });

  return { rooms, guests, services, payments, bookings: fullBookings };
}

// ---- Small helpers used by several screens ----

// Bookings that have a guest sleeping in the room on the night of `key`
export function staysOnNight(bookings, key) {
  return bookings.filter((b) => b.active && b.inKey <= key && key < b.outKey);
}

// The overlap formula: existing.start < new.end AND existing.end > new.start
export function roomIsFree(bookings, roomId, inKey, outKey, ignoreBookingId) {
  return !bookings.some(
    (b) =>
      b.active &&
      b.room_id === roomId &&
      b.booking_id !== ignoreBookingId &&
      b.inKey < outKey &&
      b.outKey > inKey
  );
}

export const STATUS_LABEL = {
  confirmed: "Confirmed",
  checked_in: "In house",
  checked_out: "Checked out",
  cancelled: "Cancelled",
};
