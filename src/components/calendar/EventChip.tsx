import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { colorOrFallback, readableTextColor } from '@/lib/color';
import type { CalendarEvent } from '@/types/calendar';
import { parseLocal } from './calendarUtils';

interface EventChipProps {
  event: CalendarEvent;
  // true when the event started on an earlier day: the time is not repeated
  continued?: boolean;
  onClick: (event: CalendarEvent) => void;
  className?: string;
}

// Single participant: chip filled with their colour. Group: neutral chip with one colour segment per participant.
export function EventChip({ event, continued, onClick, className }: EventChipProps) {
  const single = event.participants.length === 1;
  const color = colorOrFallback(event.participants[0]?.calendarColor);
  const showTime = !event.allDay && !continued;
  const tooltip = `${event.title} — ${event.participants.map((p) => p.fullName).join(', ')}`;

  return (
    <button
      type="button"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={cn(
        'flex w-full min-w-0 items-stretch overflow-hidden rounded text-left text-xs leading-5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !single && 'border bg-muted text-foreground',
        className,
      )}
      style={single ? { backgroundColor: color, color: readableTextColor(color) } : undefined}
    >
      {!single && (
        <span className="flex w-1.5 shrink-0 flex-col">
          {event.participants.map((p) => (
            <span key={p.id} className="flex-1" style={{ backgroundColor: colorOrFallback(p.calendarColor) }} />
          ))}
        </span>
      )}
      <span className="min-w-0 truncate px-1.5">
        {showTime && <span className="mr-1 font-semibold tabular-nums">{format(parseLocal(event.startAt), 'HH:mm')}</span>}
        {event.title}
      </span>
    </button>
  );
}
