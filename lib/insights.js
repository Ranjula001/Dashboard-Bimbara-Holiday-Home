// Smart insights: plain rules that read your bookings and point out
// what needs attention. No AI service is called; it is all calculated here.

import { staysOnNight } from "./data";
import { addDays, fmtDay, money, todayKey, weekdayName } from "./dates";

// tone: "warning" (act on it), "good" (nice to know), "info" (heads-up)
export function buildInsights(data) {
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const { rooms, bookings } = data;
  const active = bookings.filter((b) => b.active);
  const insights = [];

  // 1. Guests leaving today who still owe money
  for (const b of active.filter((b) => b.outKey === today && b.balance > 0)) {
    insights.push({
      tone: "warning",
      title: `Collect ${money(b.balance)} from ${b.guest?.name} before checkout`,
      detail: `Room ${b.room?.room_number} leaves today.`,
      bookingId: b.booking_id,
    });
  }

  // 2. Past stays that were never fully paid
  const unpaidPast = active.filter((b) => b.outKey < today && b.balance > 0);
  if (unpaidPast.length > 0) {
    const sum = unpaidPast.reduce((total, b) => total + b.balance, 0);
    insights.push({
      tone: "warning",
      title: `${money(sum)} unpaid from ${plural(unpaidPast.length, "past stay")}`,
      detail: unpaidPast
        .slice(0, 3)
        .map((b) => b.guest?.name)
        .join(", "),
      href: "/bookings",
    });
  }

  // 3. Statuses that were not updated
  const notCheckedIn = active.filter((b) => b.booking_status === "confirmed" && b.inKey < today);
  if (notCheckedIn.length > 0) {
    insights.push({
      tone: "warning",
      title: `${plural(notCheckedIn.length, "booking")} passed the arrival date without check-in`,
      detail: "Mark them as checked in, or cancel them to free the room.",
      bookingId: notCheckedIn[0].booking_id,
    });
  }
  const notCheckedOut = active.filter((b) => b.booking_status === "checked_in" && b.outKey < today);
  if (notCheckedOut.length > 0) {
    insights.push({
      tone: "warning",
      title: `${plural(notCheckedOut.length, "guest")} still marked in house after the leaving date`,
      detail: "Check them out so the room shows as free.",
      bookingId: notCheckedOut[0].booking_id,
    });
  }

  // 4. Who is coming tomorrow
  for (const b of active.filter((b) => b.inKey === tomorrow)) {
    const returning = active.filter((x) => x.guest_id === b.guest_id).length > 1;
    insights.push({
      tone: "info",
      title: `Prepare room ${b.room?.room_number} for tomorrow`,
      detail: `${b.guest?.name}, ${plural(b.head_count, "guest")}${returning ? ". A returning guest." : "."}`,
      bookingId: b.booking_id,
    });
  }

  // 5. How full the next 7 nights are
  const usable = rooms.filter((room) => !room.under_maintenance);
  if (usable.length > 0) {
    let booked = 0;
    for (let i = 0; i < 7; i++) booked += staysOnNight(bookings, addDays(today, i)).length;
    const capacity = usable.length * 7;
    const percent = Math.round((booked / capacity) * 100);
    if (percent >= 80) {
      insights.push({
        tone: "good",
        title: `Next 7 nights are ${percent}% booked`,
        detail: "Nearly full. A good week to hold your prices.",
        href: "/calendar",
      });
    } else {
      insights.push({
        tone: "info",
        title: `${capacity - booked} of ${capacity} room-nights are free this week`,
        detail: `The next 7 nights are ${percent}% booked.`,
        href: "/calendar",
      });
    }
  }

  // 6. One-night gaps that are hard to sell
  // (only the first one found, so the list stays short)
  gaps: for (const room of usable) {
    for (let i = 1; i <= 14; i++) {
      const night = addDays(today, i);
      const isFree = (key) => !staysOnNight(bookings, key).some((b) => b.room_id === room.room_id);
      if (isFree(night) && !isFree(addDays(night, -1)) && !isFree(addDays(night, 1))) {
        insights.push({
          tone: "info",
          title: `Room ${room.room_number} has a single free night on ${fmtDay(night)}`,
          detail: "Offer it to the guest before or after as an extra night.",
          href: "/calendar",
        });
        break gaps;
      }
    }
  }

  // 7. Rooms out of service
  const closed = rooms.filter((room) => room.under_maintenance);
  if (closed.length > 0) {
    insights.push({
      tone: "info",
      title: `${plural(closed.length, "room")} under maintenance`,
      detail: `Room ${closed.map((room) => room.room_number).join(", ")} cannot be booked.`,
      href: "/rooms",
    });
  }

  // 8. Patterns, once there is enough history to trust them
  if (active.length >= 8) {
    const byWeekday = {};
    for (const b of active) {
      const name = weekdayName(b.inKey);
      byWeekday[name] = (byWeekday[name] || 0) + 1;
    }
    const [busiest, count] = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      tone: "good",
      title: `${busiest} is your busiest arrival day`,
      detail: `${count} of ${active.length} bookings start on a ${busiest}.`,
    });

    const earned = {};
    for (const b of active) earned[b.room_id] = (earned[b.room_id] || 0) + b.total_price;
    const top = rooms
      .map((room) => ({ room, sum: earned[room.room_id] || 0 }))
      .sort((a, b) => b.sum - a.sum)[0];
    if (top && top.sum > 0) {
      insights.push({
        tone: "good",
        title: `Room ${top.room.room_number} earns the most`,
        detail: `${money(top.sum)} booked so far.`,
        href: "/rooms",
      });
    }
  }

  return insights;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
