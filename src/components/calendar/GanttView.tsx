import { useMemo } from 'react';
import { addDays, format, isToday, isWeekend } from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { colorOrFallback, readableTextColor } from '@/lib/color';
import type { User } from '@/types';
import type { CalendarEvent, GanttSpan } from '@/types/calendar';
import { dayOffset, daysOf, fullName, formatEventTime, packLanes, parseLocal, VisibleRange } from './calendarUtils';

const BAR_HEIGHT = 22;
const LANE_GAP = 4;
const ROW_PADDING = 6;
const NAME_COLUMN = 168;
const MIN_BAR_DAYS = 0.06;

interface GanttViewProps {
  range: VisibleRange;
  span: GanttSpan;
  users: User[];
  events: CalendarEvent[];
  locale: Locale;
  onCellClick: (day: Date, userId: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

interface Bar {
  event: CalendarEvent;
  start: number;
  end: number;
}

export function GanttView({ range, span, users, events, locale, onCellClick, onEventClick }: GanttViewProps) {
  const { t } = useTranslation('calendar');
  const days = useMemo(() => daysOf(range), [range]);
  const dayCount = days.length;
  const minDayWidth = span === 'week' ? 96 : span === 'twoWeeks' ? 56 : 34;

  // One bar per (event, participant): bars are grouped by participant row and packed into lanes
  const rows = useMemo(() => {
    const barsByUser = new Map<string, Bar[]>();
    for (const event of events) {
      const rawStart = dayOffset(parseLocal(event.startAt), range.start);
      const rawEnd = dayOffset(parseLocal(event.endAt), range.start);
      const start = Math.max(0, rawStart);
      const end = Math.min(dayCount, Math.max(rawEnd, rawStart + MIN_BAR_DAYS));
      if (end <= 0 || start >= dayCount) continue;
      for (const participant of event.participants) {
        const list = barsByUser.get(participant.id) ?? [];
        list.push({ event, start, end });
        barsByUser.set(participant.id, list);
      }
    }
    return users.map((user) => {
      const { placed, laneCount } = packLanes(barsByUser.get(user.id) ?? [], (b) => b.start, (b) => b.end);
      return { user, placed, laneCount };
    });
  }, [events, users, range.start, dayCount]);

  const gridTemplate = `${NAME_COLUMN}px repeat(${dayCount}, minmax(${minDayWidth}px, 1fr))`;

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, userId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(((e.clientX - rect.left) / rect.width) * dayCount);
    onCellClick(addDays(range.start, Math.min(Math.max(index, 0), dayCount - 1)), userId);
  };

  const dayBackground = (day: Date) =>
    cn(isToday(day) ? 'bg-primary/10' : isWeekend(day) && 'bg-muted/40');

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div style={{ minWidth: NAME_COLUMN + dayCount * minDayWidth }}>
        {/* Header */}
        <div className="grid border-b bg-muted/50" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="sticky left-0 z-20 flex items-end border-r bg-muted px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            {t('gantt.person')}
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn('border-r px-1 py-1.5 text-center last:border-r-0', dayBackground(day))}
            >
              <div className="text-[10px] uppercase leading-tight text-muted-foreground">
                {format(day, span === 'month' ? 'EEEEE' : 'EEE', { locale })}
              </div>
              <div
                className={cn(
                  'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums',
                  isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('gantt.noUsers')}</div>
        )}
        {rows.map(({ user, placed, laneCount }) => {
          const height = laneCount * BAR_HEIGHT + (laneCount - 1) * LANE_GAP + ROW_PADDING * 2;
          const color = colorOrFallback(user.calendarColor);
          return (
            <div
              key={user.id}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: gridTemplate, minHeight: Math.max(height, 40) }}
            >
              <div className="sticky left-0 z-10 flex items-center gap-2 border-r bg-card px-3 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                <span className="truncate" title={fullName(user)}>{fullName(user)}</span>
              </div>
              <div
                className="relative cursor-pointer"
                style={{ gridColumn: `2 / span ${dayCount}` }}
                onClick={(e) => handleRowClick(e, user.id)}
              >
                {/* Day background columns */}
                <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
                  {days.map((day) => (
                    <div key={day.toISOString()} className={cn('border-r last:border-r-0', dayBackground(day))} />
                  ))}
                </div>
                {placed.map(({ item: bar, lane }) => (
                  <Tooltip key={`${bar.event.id}-${user.id}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(bar.event);
                        }}
                        className="absolute flex items-center overflow-hidden rounded px-1.5 text-left text-xs font-medium shadow-sm transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          left: `calc(${(bar.start / dayCount) * 100}% + 1px)`,
                          width: `calc(${((bar.end - bar.start) / dayCount) * 100}% - 2px)`,
                          minWidth: 6,
                          top: ROW_PADDING + lane * (BAR_HEIGHT + LANE_GAP),
                          height: BAR_HEIGHT,
                          backgroundColor: color,
                          color: readableTextColor(color),
                        }}
                      >
                        <span className="truncate">{bar.event.title}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="font-medium">{bar.event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatEventTime(bar.event, locale, t('month.allDay'))}
                      </div>
                      {bar.event.location && <div className="text-xs">{bar.event.location}</div>}
                      <div className="mt-1 text-xs">{bar.event.participants.map((p) => p.fullName).join(', ')}</div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
