// Date and money helpers.
// The database stores exact moments in UTC (timestamptz). BIMBARA thinks in
// Sri Lanka days, so we turn every moment into a "day key" like "2026-11-20".

export const TZ = "Asia/Colombo";
export const CHECK_IN_TIME = "14:00";
export const CHECK_OUT_TIME = "11:00";

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Any date or timestamp -> "YYYY-MM-DD" in Sri Lanka time
export function dayKey(value) {
  return keyFormat.format(new Date(value));
}

export function todayKey() {
  return dayKey(Date.now());
}

// "2026-11-20" + 2 -> "2026-11-22"
export function addDays(key, count) {
  const date = new Date(key + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

// Number of nights between two day keys
export function diffDays(fromKey, toKey) {
  const ms = new Date(toKey + "T00:00:00Z") - new Date(fromKey + "T00:00:00Z");
  return Math.round(ms / 86400000);
}

// Day key -> the exact moment we save: check-in 2 PM, check-out 11 AM, Sri Lanka time
export function stayInstant(key, kind) {
  const time = kind === "in" ? CHECK_IN_TIME : CHECK_OUT_TIME;
  return `${key}T${time}:00+05:30`;
}

// "2026-11-20" -> "20 Nov" (or "Fri 20 Nov" with { weekday: true })
export function fmtDay(key, { weekday = false, year = false } = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(weekday ? { weekday: "short" } : {}),
    ...(year ? { year: "numeric" } : {}),
  }).format(new Date(key + "T00:00:00Z"));
}

export function fmtDateTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

// "2026-11-20" -> "Tue, Nov 20"
export function fmtDayLong(key) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(key + "T00:00:00Z"));
}

export function monthKey(key) {
  return key.slice(0, 7);
}

export function weekdayName(key) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" }).format(
    new Date(key + "T00:00:00Z")
  );
}

// 12000 -> "Rs. 12,000"
export function money(amount) {
  return "Rs. " + Math.round(Number(amount) || 0).toLocaleString("en-US");
}
