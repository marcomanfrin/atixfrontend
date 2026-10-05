import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { User } from '@/types';
import type { CalendarEvent, CalendarView, GanttSpan } from '@/types/calendar';

export const fullName = (user: Pick<User, 'firstName' | 'lastName'>) => `${user.firstName} ${user.lastName}`.trim();

export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export const getDateFnsLocale = (language: string): Locale => (language?.startsWith('it') ? it : enUS);

// Backend works with local date-times without offset
export const toLocalIso = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
export const parseLocal = (value: string) => parseISO(value);

export interface VisibleRange {
  start: Date; // inclusive, at midnight
  end: Date; // exclusive, at midnight
}

export function getVisibleRange(view: CalendarView, anchor: Date, span: GanttSpan): VisibleRange {
  if (view === 'month') {
    const start = startOfWeek(startOfMonth(anchor), WEEK_OPTIONS);
    const end = addDays(startOfDay(endOfWeek(endOfMonth(anchor), WEEK_OPTIONS)), 1);
    return { start, end };
  }
  switch (span) {
    case 'week': {
      const start = startOfWeek(anchor, WEEK_OPTIONS);
      return { start, end: addDays(start, 7) };
    }
    case 'twoWeeks': {
      const start = startOfWeek(anchor, WEEK_OPTIONS);
      return { start, end: addDays(start, 14) };
    }
    case 'month': {
      const start = startOfMonth(anchor);
      return { start, end: startOfMonth(addMonths(anchor, 1)) };
    }
  }
}

export function shiftAnchor(view: CalendarView, anchor: Date, span: GanttSpan, direction: 1 | -1): Date {
  if (view === 'month' || span === 'month') {
    return addMonths(anchor, direction);
  }
  return addWeeks(anchor, span === 'twoWeeks' ? 2 * direction : direction);
}

export function getPeriodLabel(view: CalendarView, anchor: Date, span: GanttSpan, locale: Locale): string {
  if (view === 'month' || span === 'month') {
    return format(anchor, 'LLLL yyyy', { locale });
  }
  const { start, end } = getVisibleRange(view, anchor, span);
  const last = addDays(end, -1);
  const sameYear = start.getFullYear() === last.getFullYear();
  return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale })} – ${format(last, 'd MMM yyyy', { locale })}`;
}

export const daysOf = (range: VisibleRange) => eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) });

// Half-open overlap between [eventStart, eventEnd) and the given day
export function eventCoversDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = parseLocal(event.startAt);
  const end = parseLocal(event.endAt);
  if (start.getTime() === end.getTime()) {
    // zero-length events belong to the day they happen in
    return start >= dayStart && start < dayEnd;
  }
  return start < dayEnd && end > dayStart;
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.startAt.localeCompare(b.startAt) || a.endAt.localeCompare(b.endAt) || a.title.localeCompare(b.title);
}

// Position in "days since range start", with fractional day for the time of day (DST-safe)
export function dayOffset(date: Date, rangeStart: Date): number {
  return differenceInCalendarDays(date, rangeStart) + (date.getHours() * 60 + date.getMinutes()) / 1440;
}

export function formatEventTime(event: CalendarEvent, locale: Locale, allDayLabel: string): string {
  const start = parseLocal(event.startAt);
  const end = parseLocal(event.endAt);
  if (event.allDay) {
    const lastDay = addDays(end, -1);
    if (differenceInCalendarDays(lastDay, start) <= 0) {
      return `${format(start, 'EEE d MMM', { locale })} · ${allDayLabel}`;
    }
    return `${format(start, 'd MMM', { locale })} – ${format(lastDay, 'd MMM', { locale })} · ${allDayLabel}`;
  }
  if (differenceInCalendarDays(end, start) === 0) {
    return `${format(start, 'EEE d MMM', { locale })} · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
  }
  return `${format(start, 'd MMM HH:mm', { locale })} – ${format(end, 'd MMM HH:mm', { locale })}`;
}

export interface PlacedItem<T> {
  item: T;
  lane: number;
}

// Greedy interval partitioning: each item goes in the first lane whose last end <= item start
export function packLanes<T>(items: T[], startOf: (item: T) => number, endOf: (item: T) => number): { placed: PlacedItem<T>[]; laneCount: number } {
  const sorted = [...items].sort((a, b) => startOf(a) - startOf(b) || endOf(a) - endOf(b));
  const laneEnds: number[] = [];
  const placed = sorted.map((item) => {
    const start = startOf(item);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endOf(item));
    } else {
      laneEnds[lane] = endOf(item);
    }
    return { item, lane };
  });
  return { placed, laneCount: Math.max(laneEnds.length, 1) };
}
