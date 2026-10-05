import { useMemo } from 'react';
import { addDays, format, isSameDay, isSameMonth, isToday, isWeekend, startOfDay } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import { EventChip } from './EventChip';
import { compareEvents, daysOf, eventCoversDay, parseLocal, VisibleRange, WEEK_OPTIONS } from './calendarUtils';

const MAX_VISIBLE = 3;

interface MonthViewProps {
  anchor: Date;
  range: VisibleRange;
  events: CalendarEvent[];
  locale: Locale;
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthView({ anchor, range, events, locale, onDayClick, onEventClick }: MonthViewProps) {
  const { t } = useTranslation('calendar');
  const days = useMemo(() => daysOf(range), [range]);

  const eventsByDay = useMemo(() => {
    const sorted = [...events].sort(compareEvents);
    return days.map((day) => sorted.filter((event) => eventCoversDay(event, day)));
  }, [days, events]);

  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(range.start, i), 'EEE', { locale, ...WEEK_OPTIONS })),
    [range.start, locale],
  );

  const renderChip = (event: CalendarEvent, day: Date) => (
    <EventChip
      key={event.id}
      event={event}
      continued={!isSameDay(parseLocal(event.startAt), day)}
      onClick={onEventClick}
    />
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = eventsByDay[index];
          const hidden = dayEvents.length - MAX_VISIBLE;
          const visible = hidden > 0 ? dayEvents.slice(0, MAX_VISIBLE - 1) : dayEvents;
          const overflow = hidden > 0 ? dayEvents.length - visible.length : 0;

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(startOfDay(day))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick(startOfDay(day));
                }
              }}
              className={cn(
                'flex min-h-[92px] min-w-0 cursor-pointer flex-col gap-0.5 border-b border-r p-1 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-[116px]',
                (index + 1) % 7 === 0 && 'border-r-0',
                index >= days.length - 7 && 'border-b-0',
                !isSameMonth(day, anchor) && 'bg-muted/30 text-muted-foreground',
                isWeekend(day) && isSameMonth(day, anchor) && 'bg-muted/15',
              )}
            >
              <span
                className={cn(
                  'mb-0.5 flex h-6 w-6 items-center justify-center self-end rounded-full text-xs tabular-nums',
                  isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              {visible.map((event) => renderChip(event, day))}
              {overflow > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {t('month.more', { count: overflow })}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="px-1 pb-1 text-sm font-medium capitalize">
                      {format(day, 'EEEE d MMMM', { locale })}
                    </div>
                    {dayEvents.map((event) => renderChip(event, day))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
