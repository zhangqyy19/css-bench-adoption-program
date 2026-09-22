import type { DateString } from "./types";

// Pure calendar-date helpers, shared by the browser and the server.
// Everything works on YYYY-MM-DD strings, which compare correctly as text
// and carry no time zone.

export const PARK_TIME_ZONE = "America/New_York";
export const EXPIRING_SOON_DAYS = 60;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayInPark(now: Date = new Date()): DateString {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parse(date: DateString): [number, number, number] {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function build(year: number, month: number, day: number): DateString {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidDate(date: string): boolean {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

// Jan 31 + 1 month = Feb 28 (or 29): the day is clamped to the target month.
export function addMonths(date: DateString, months: number): DateString {
  const [year, month, day] = parse(date);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return build(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

function toUtc(date: DateString): number {
  const [year, month, day] = parse(date);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: DateString, days: number): DateString {
  const result = new Date(toUtc(date) + days * 86_400_000);
  return build(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export function daysBetween(from: DateString, to: DateString): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

// Half-open ranges: [aStart, aEnd) and [bStart, bEnd) sharing only a boundary
// date do not overlap, so back-to-back adoptions are allowed.
export function rangesOverlap(
  aStart: DateString,
  aEnd: DateString,
  bStart: DateString,
  bEnd: DateString,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function formatDate(date: DateString): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(toUtc(date)));
}

export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

export function formatRemaining(today: DateString, endDate: DateString): string {
  const days = daysBetween(today, endDate);
  if (days <= 0) return "ended";
  if (days === 1) return "1 day left";
  if (days < 60) return `${days} days left`;
  // whole calendar months, so a term ending a year from today reads "12 months"
  const [fromYear, fromMonth] = parse(today);
  const [toYear, toMonth] = parse(endDate);
  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  if (addMonths(today, months) > endDate) months -= 1;
  if (months < 24) return `${months} months left`;
  return `${Math.floor(months / 12)} years left`;
}
