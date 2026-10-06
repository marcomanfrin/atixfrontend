import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEvents, useUsers } from '@/hooks/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { MonthView } from '@/components/calendar/MonthView';
import { GanttView } from '@/components/calendar/GanttView';
import { WeekView } from '@/components/calendar/WeekView';
import { UserColorLegend } from '@/components/calendar/UserColorLegend';
import { EventDialog, EventDialogDefaults } from '@/components/calendar/EventDialog';
import {
  getDateFnsLocale,
  getPeriodLabel,
  getVisibleRange,
  shiftAnchor,
  toLocalIso,
} from '@/components/calendar/calendarUtils';
import type { User } from '@/types';
import type { CalendarEvent, CalendarView, GanttSpan } from '@/types/calendar';

const VIEW_KEY = 'calendar.view';
const ONLY_MINE_KEY = 'calendar.onlyMine';

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode, blocked): preference is simply not remembered
  }
};

const byName = (a: User, b: User) =>
  a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName);

export default function CalendarPage() {
  const { t, i18n } = useTranslation('calendar');
  const { user: currentUser } = useAuth();
  const locale = getDateFnsLocale(i18n.language);

  const [view, setView] = useState<CalendarView>(() => {
    const stored = readStorage(VIEW_KEY);
    return stored === 'gantt' || stored === 'week' ? stored : 'month';
  });
  const [onlyMine, setOnlyMine] = useState<boolean>(() => readStorage(ONLY_MINE_KEY) === 'true');
  const [span, setSpan] = useState<GanttSpan>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogDefaults, setDialogDefaults] = useState<EventDialogDefaults | null>(null);

  useEffect(() => writeStorage(VIEW_KEY, view), [view]);
  useEffect(() => writeStorage(ONLY_MINE_KEY, String(onlyMine)), [onlyMine]);

  const range = useMemo(() => getVisibleRange(view, anchor, span), [view, anchor, span]);

  const { data: usersData } = useUsers();
  const users = useMemo(() => [...(usersData ?? [])].sort(byName), [usersData]);

  const { data: events = [], isLoading, isError } = useCalendarEvents({
    from: toLocalIso(range.start),
    to: toLocalIso(range.end),
    mine: onlyMine,
    participantIds,
  });

  // People shown as Gantt rows and in the legend follow the same filters as the events
  const visibleUsers = useMemo(() => {
    let result = users;
    if (onlyMine) {
      result = result.filter((u) => u.id === currentUser?.id);
    }
    if (participantIds.length > 0) {
      result = result.filter((u) => participantIds.includes(u.id));
    }
    return result;
  }, [users, onlyMine, participantIds, currentUser?.id]);

  const openCreate = (date: Date, participants?: string[], options?: Pick<EventDialogDefaults, 'timed' | 'allDay'>) => {
    setSelectedEvent(null);
    setDialogDefaults({
      date,
      participantIds: participants ?? (currentUser?.id ? [currentUser.id] : []),
      ...options,
    });
    setDialogOpen(true);
  };

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogDefaults(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        span={span}
        onSpanChange={setSpan}
        periodLabel={getPeriodLabel(view, anchor, span, locale)}
        onPrevious={() => setAnchor((a) => shiftAnchor(view, a, span, -1))}
        onToday={() => setAnchor(new Date())}
        onNext={() => setAnchor((a) => shiftAnchor(view, a, span, 1))}
        onlyMine={onlyMine}
        onOnlyMineChange={setOnlyMine}
        users={users}
        participantIds={participantIds}
        onParticipantIdsChange={setParticipantIds}
        onCreate={() => openCreate(new Date())}
      />

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {t('messages.loadError')}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : view === 'month' ? (
        <MonthView
          anchor={anchor}
          range={range}
          events={events}
          locale={locale}
          onDayClick={(day) => openCreate(day)}
          onEventClick={openEvent}
        />
      ) : view === 'week' ? (
        <WeekView
          range={range}
          events={events}
          locale={locale}
          onSlotClick={(start) => openCreate(start, undefined, { timed: true })}
          onAllDayClick={(day) => openCreate(day, undefined, { allDay: true })}
          onEventClick={openEvent}
        />
      ) : (
        <GanttView
          range={range}
          span={span}
          users={visibleUsers}
          events={events}
          locale={locale}
          onCellClick={(day, userId) => openCreate(day, [userId])}
          onEventClick={openEvent}
        />
      )}

      <UserColorLegend users={visibleUsers} />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        defaults={dialogDefaults}
        users={users}
        locale={locale}
      />
    </div>
  );
}
