import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMinutes, differenceInCalendarDays, format, isToday, isWeekend, startOfDay } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { colorOrFallback, readableTextColor } from '@/lib/color';
import type { CalendarEvent } from '@/types/calendar';
import { compareEvents, daysOf, minuteOfDay, packLanes, parseLocal, VisibleRange } from './calendarUtils';

const HOUR_HEIGHT = 48;
const DAY_MINUTES = 24 * 60;
const GUTTER = 56;
const MIN_DAY_WIDTH = 88;
const SLOT_MINUTES = 30;
const MIN_EVENT_MINUTES = 20; // visual minimum so short events stay clickable
const ALL_DAY_BAR = 20;
const ALL_DAY_GAP = 2;
const SCROLL_TO_HOUR = 7;

interface WeekViewProps {
  range: VisibleRange;
  events: CalendarEvent[];
  locale: Locale;
  onSlotClick: (start: Date) => void;
  onAllDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

interface AllDayBar {
  event: CalendarEvent;
  start: number; // day index, inclusive
  end: number; // day index, exclusive
}

interface Segment {
  event: CalendarEvent;
  start: number; // minutes since midnight of its day
  end: number;
  visualEnd: number;
  column: number;
  columns: number;
}

// Like Google Calendar: all-day events and timed events lasting 24h or more go in the top row
const isAllDayRow = (event: CalendarEvent) =>
  event.allDay || parseLocal(event.endAt).getTime() - parseLocal(event.startAt).getTime() >= DAY_MINUTES * 60_000;

// Overlapping segments of a day share the width: clusters of transitively overlapping segments, columns within each
function layoutDay(segments: Omit<Segment, 'column' | 'columns'>[]): Segment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start || b.visualEnd - a.visualEnd);
  const result: Segment[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -1;

  const flush = () => {
    const { placed, laneCount } = packLanes(cluster, (s) => s.start, (s) => s.visualEnd);
    placed.forEach(({ item, lane }) => result.push({ ...item, column: lane, columns: laneCount }));
    cluster = [];
  };

  for (const segment of sorted) {
    if (cluster.length > 0 && segment.start >= clusterEnd) flush();
    cluster.push(segment);
    clusterEnd = Math.max(clusterEnd, segment.visualEnd);
  }
  if (cluster.length > 0) flush();
  return result;
}

function eventStyle(event: CalendarEvent) {
  const color = colorOrFallback(event.participants[0]?.calendarColor);
  return event.participants.length === 1 ? { backgroundColor: color, color: readableTextColor(color) } : undefined;
}

// Group events: neutral background with one colour stripe per participant, as in EventChip
function ParticipantStripe({ event }: { event: CalendarEvent }) {
  if (event.participants.length === 1) return null;
  return (
    <span className="flex w-1.5 shrink-0 flex-col self-stretch">
      {event.participants.map((p) => (
        <span key={p.id} className="flex-1" style={{ backgroundColor: colorOrFallback(p.calendarColor) }} />
      ))}
    </span>
  );
}

export function WeekView({ range, events, locale, onSlotClick, onAllDayClick, onEventClick }: WeekViewProps) {
  const { t } = useTranslation('calendar');
  const days = useMemo(() => daysOf(range), [range]);
  const dayCount = days.length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todayIndex = days.findIndex((day) => isToday(day));

  // Open on the working morning, or just before the current time when today is visible
  useEffect(() => {
    if (!scrollRef.current) return;
    const hour = todayIndex >= 0 ? Math.max(0, Math.min(now.getHours() - 1, SCROLL_TO_HOUR)) : SCROLL_TO_HOUR;
    scrollRef.current.scrollTop = hour * HOUR_HEIGHT;
    // only when the visible week changes, not every minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start.getTime()]);

  const { allDay, allDayLanes, segmentsByDay } = useMemo(() => {
    const sorted = [...events].sort(compareEvents);
    const bars: AllDayBar[] = [];
    const perDay: Omit<Segment, 'column' | 'columns'>[][] = days.map(() => []);

    for (const event of sorted) {
      const start = parseLocal(event.startAt);
      const end = parseLocal(event.endAt);

      if (isAllDayRow(event)) {
        // a timed event ending after midnight still covers that last day
        const lastDay = event.allDay || minuteOfDay(end) === 0 ? addDays(end, -1) : end;
        const from = Math.max(0, differenceInCalendarDays(start, range.start));
        const to = Math.min(dayCount, differenceInCalendarDays(lastDay, range.start) + 1);
        if (to > from) bars.push({ event, start: from, end: Math.max(to, from + 1) });
        continue;
      }

      days.forEach((day, index) => {
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        const zeroLength = start.getTime() === end.getTime();
        const overlaps = zeroLength ? start >= dayStart && start < dayEnd : start < dayEnd && end > dayStart;
        if (!overlaps) return;
        const segStart = start > dayStart ? minuteOfDay(start) : 0;
        const segEnd = end < dayEnd ? minuteOfDay(end) : DAY_MINUTES;
        const visualEnd = Math.min(DAY_MINUTES, Math.max(segEnd, segStart + MIN_EVENT_MINUTES));
        perDay[index].push({ event, start: segStart, end: segEnd, visualEnd });
      });
    }

    const { placed, laneCount } = packLanes(bars, (b) => b.start, (b) => b.end);
    return {
      allDay: placed,
      allDayLanes: bars.length > 0 ? laneCount : 0,
      segmentsByDay: perDay.map(layoutDay),
    };
  }, [events, days, dayCount, range.start]);

  const gridTemplate = `${GUTTER}px repeat(${dayCount}, minmax(${MIN_DAY_WIDTH}px, 1fr))`;
  const allDayHeight = Math.max(allDayLanes * (ALL_DAY_BAR + ALL_DAY_GAP) + ALL_DAY_GAP * 2, 28);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = ((e.clientY - rect.top) / rect.height) * DAY_MINUTES;
    const snapped = Math.min(Math.max(Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES, 0), DAY_MINUTES - SLOT_MINUTES);
    onSlotClick(addMinutes(startOfDay(day), snapped));
  };

  const handleAllDayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(((e.clientX - rect.left) / rect.width) * dayCount);
    onAllDayClick(addDays(range.start, Math.min(Math.max(index, 0), dayCount - 1)));
  };

  const dayBackground = (day: Date) => cn(isWeekend(day) && 'bg-muted/25');

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100vh-18rem)] min-h-[420px] overflow-auto rounded-lg border bg-card"
    >
      <div style={{ minWidth: GUTTER + dayCount * MIN_DAY_WIDTH }}>
        {/* Sticky header: weekdays and all-day row */}
        <div className="sticky top-0 z-30 border-b bg-card">
          <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="sticky left-0 z-10 bg-card" />
            {days.map((day) => (
              <div key={day.toISOString()} className="border-l px-1 pb-1 pt-2 text-center">
                <div
                  className={cn(
                    'text-[11px] font-medium uppercase text-muted-foreground',
                    isToday(day) && 'text-primary',
                  )}
                >
                  {format(day, 'EEE', { locale })}
                </div>
                <div
                  className={cn(
                    'mx-auto mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg tabular-nums sm:text-xl',
                    isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="sticky left-0 z-10 flex items-center justify-end bg-card pr-2 text-[10px] uppercase leading-tight text-muted-foreground">
              <span className="text-right">{t('week.allDay')}</span>
            </div>
            <div
              className="relative cursor-pointer"
              style={{ gridColumn: `2 / span ${dayCount}`, height: allDayHeight }}
              onClick={handleAllDayClick}
            >
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
                {days.map((day) => (
                  <div key={day.toISOString()} className={cn('border-l', dayBackground(day))} />
                ))}
              </div>
              {allDay.map(({ item: bar, lane }) => (
                <button
                  key={bar.event.id}
                  type="button"
                  title={`${bar.event.title} — ${bar.event.participants.map((p) => p.fullName).join(', ')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(bar.event);
                  }}
                  className={cn(
                    'absolute flex items-center overflow-hidden rounded text-left text-xs font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    bar.event.participants.length !== 1 && 'border bg-muted text-foreground',
                  )}
                  style={{
                    left: `calc(${(bar.start / dayCount) * 100}% + 2px)`,
                    width: `calc(${((bar.end - bar.start) / dayCount) * 100}% - 4px)`,
                    top: ALL_DAY_GAP + lane * (ALL_DAY_BAR + ALL_DAY_GAP),
                    height: ALL_DAY_BAR,
                    ...eventStyle(bar.event),
                  }}
                >
                  <ParticipantStripe event={bar.event} />
                  <span className="truncate px-1.5">
                    {!bar.event.allDay && (
                      <span className="mr-1 font-semibold tabular-nums">{format(parseLocal(bar.event.startAt), 'HH:mm')}</span>
                    )}
                    {bar.event.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="sticky left-0 z-20 bg-card" style={{ height: 24 * HOUR_HEIGHT }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {`${String(hour).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {days.map((day, index) => (
            <div
              key={day.toISOString()}
              className={cn('relative cursor-pointer border-l', dayBackground(day))}
              style={{ height: 24 * HOUR_HEIGHT }}
              onClick={(e) => handleColumnClick(e, day)}
            >
              {/* Hour and half-hour lines */}
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="pointer-events-none absolute inset-x-0" style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                  {hour > 0 && <div className="border-t" />}
                  <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/50" />
                </div>
              ))}

              {segmentsByDay[index].map((segment) => {
                const height = ((segment.visualEnd - segment.start) / 60) * HOUR_HEIGHT;
                const compact = height < 36;
                const { event } = segment;
                const start = parseLocal(event.startAt);
                const end = parseLocal(event.endAt);
                return (
                  <button
                    key={event.id}
                    type="button"
                    title={`${event.title} — ${event.participants.map((p) => p.fullName).join(', ')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      'absolute z-10 flex overflow-hidden rounded-md text-left text-xs shadow-sm ring-1 ring-card transition-opacity hover:z-20 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      event.participants.length !== 1 && 'border bg-muted text-foreground',
                    )}
                    style={{
                      top: (segment.start / 60) * HOUR_HEIGHT + 1,
                      height: Math.max(height - 2, 14),
                      left: `calc(${(segment.column / segment.columns) * 100}% + 1px)`,
                      width: `calc(${100 / segment.columns}% - 3px)`,
                      ...eventStyle(event),
                    }}
                  >
                    <ParticipantStripe event={event} />
                    <span className={cn('min-w-0 flex-1 px-1.5', compact ? 'flex items-center gap-1 leading-tight' : 'py-0.5')}>
                      <span className={cn('block truncate font-medium', compact && 'inline')}>{event.title}</span>
                      <span className={cn('block truncate tabular-nums opacity-90', compact && 'inline')}>
                        {format(start, 'HH:mm')}
                        {!compact && `–${format(end, 'HH:mm')}`}
                      </span>
                      {!compact && height >= 64 && event.location && (
                        <span className="block truncate opacity-90">{event.location}</span>
                      )}
                    </span>
                  </button>
                );
              })}

              {index === todayIndex && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: (minuteOfDay(now) / 60) * HOUR_HEIGHT }}
                >
                  <span className="-ml-1.5 h-3 w-3 -translate-y-1/2 rounded-full bg-red-500" />
                  <span className="h-0.5 flex-1 -translate-y-1/2 bg-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
