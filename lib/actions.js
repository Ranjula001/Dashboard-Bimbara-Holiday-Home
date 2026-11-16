// Database changes that more than one screen needs, plus friendly error text.
import { supabase } from "./supabase";

// Postgres error codes you will meet most often
const ERROR_TEXT = {
  "23P01": "That room is already booked for those dates.",
  "23505": "That value is already in use.",
  "23514": "One of the values is outside the allowed range.",
};

export function friendlyError(error, linkedMessage) {
  if (!error) return "";
  if (error.code === "23503") return linkedMessage || "This record is still linked to other records.";
  return ERROR_TEXT[error.code] || error.message || "Something went wrong.";
}

// Deleting a booking means deleting the rows that point to it first:
// payments and add-on services. The database refuses the booking otherwise.
export async function deleteBooking(bookingId) {
  for (const table of ["payment", "booking_service"]) {
    const { error } = await supabase.from(table).delete().eq("booking_id", bookingId);
    if (error) return { error };
  }
  return supabase.from("booking").delete().eq("booking_id", bookingId);
}

export function deletePayment(paymentId) {
  return supabase.from("payment").delete().eq("payment_id", paymentId);
}

// Guests and rooms with bookings cannot be deleted (foreign key), and that is intended:
// the history must stay. The screens explain this using friendlyError.
export function deleteGuest(guestId) {
  return supabase.from("guest").delete().eq("guest_id", guestId);
}

export function deleteRoom(roomId) {
  return supabase.from("room").delete().eq("room_id", roomId);
}

export function deleteService(serviceId) {
  return supabase.from("service").delete().eq("service_id", serviceId);
}

export function setBookingStatus(bookingId, status) {
  return supabase.from("booking").update({ booking_status: status }).eq("booking_id", bookingId);
}

export function addPayment({ bookingId, amount, type }) {
  return supabase.from("payment").insert({
    booking_id: bookingId,
    amount: Number(amount),
    payment_type: type,
  });
}

// Turn rows into a CSV file the browser downloads (for Excel)
export function downloadCsv(filename, header, rows) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const text = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
