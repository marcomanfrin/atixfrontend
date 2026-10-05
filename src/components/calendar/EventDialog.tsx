import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import type { Locale } from 'date-fns';
import { Link } from 'react-router-dom';
import { Briefcase, Clock, ExternalLink, MapPin, Trash2, User as UserIcon, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreateCalendarEvent, useDeleteCalendarEvent, useUpdateCalendarEvent } from '@/hooks/api';
import { colorOrFallback } from '@/lib/color';
import type { User } from '@/types';
import type { CalendarEvent, CalendarEventInput, CalendarWorkRef } from '@/types/calendar';
import { ParticipantPicker } from './ParticipantPicker';
import { WorkPicker } from './WorkPicker';
import { formatEventTime, parseLocal } from './calendarUtils';

export interface EventDialogDefaults {
  date: Date;
  participantIds: string[];
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaults: EventDialogDefaults | null;
  users: User[];
  locale: Locale;
}

interface FormState {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  participantIds: string[];
  work: CalendarWorkRef | null;
}

const DATE = 'yyyy-MM-dd';
const TIME = 'HH:mm';

function formFromEvent(event: CalendarEvent): FormState {
  const start = parseLocal(event.startAt);
  // all-day events are stored with an exclusive end: show the last included day
  const end = event.allDay ? addDays(parseLocal(event.endAt), -1) : parseLocal(event.endAt);
  return {
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    allDay: event.allDay,
    startDate: format(start, DATE),
    startTime: event.allDay ? '09:00' : format(start, TIME),
    endDate: format(end, DATE),
    endTime: event.allDay ? '10:00' : format(end, TIME),
    participantIds: event.participants.map((p) => p.id),
    work: event.work ?? null,
  };
}

function formFromDefaults(defaults: EventDialogDefaults): FormState {
  const day = format(defaults.date, DATE);
  return {
    title: '',
    description: '',
    location: '',
    allDay: false,
    startDate: day,
    startTime: '09:00',
    endDate: day,
    endTime: '10:00',
    participantIds: defaults.participantIds,
    work: null,
  };
}

export function EventDialog({ open, onOpenChange, event, defaults, users, locale }: EventDialogProps) {
  const { t } = useTranslation('calendar');
  const { toast } = useToast();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !!event && !event.canEdit;
  const saving = createEvent.isPending || updateEvent.isPending;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (event) {
      setForm(formFromEvent(event));
    } else if (defaults) {
      setForm(formFromDefaults(defaults));
    }
  }, [open, event, defaults]);

  const update = (patch: Partial<FormState>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const validate = (state: FormState): string | null => {
    if (!state.title.trim()) return t('validation.titleRequired');
    if (state.title.trim().length > 200) return t('validation.titleTooLong');
    if (!state.startDate || !state.endDate || (!state.allDay && (!state.startTime || !state.endTime))) {
      return t('validation.datesRequired');
    }
    const start = state.allDay ? state.startDate : `${state.startDate}T${state.startTime}`;
    const end = state.allDay ? state.endDate : `${state.endDate}T${state.endTime}`;
    if (end < start) return t('validation.endBeforeStart');
    if (state.participantIds.length === 0) return t('validation.participantsRequired');
    return null;
  };

  const toInput = (state: FormState): CalendarEventInput => ({
    title: state.title.trim(),
    description: state.description.trim() || null,
    location: state.location.trim() || null,
    allDay: state.allDay,
    startAt: `${state.startDate}T${state.allDay ? '00:00' : state.startTime}:00`,
    endAt: `${state.endDate}T${state.allDay ? '00:00' : state.endTime}:00`,
    participantIds: state.participantIds,
    workId: state.work?.id ?? null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || readOnly) return;
    const validationError = validate(form);
    setError(validationError);
    if (validationError) return;

    const onError = (err: Error) =>
      toast({ title: t('common:titles.error'), description: err.message, variant: 'destructive' });
    const onSuccess = (message: string) => () => {
      toast({ title: message });
      onOpenChange(false);
    };

    if (event) {
      updateEvent.mutate({ id: event.id, data: toInput(form) }, { onSuccess: onSuccess(t('messages.updated')), onError });
    } else {
      createEvent.mutate(toInput(form), { onSuccess: onSuccess(t('messages.created')), onError });
    }
  };

  const handleDelete = () => {
    if (!event) return;
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        toast({ title: t('messages.deleted') });
        onOpenChange(false);
      },
      onError: (err: Error) =>
        toast({ title: t('common:titles.error'), description: err.message, variant: 'destructive' }),
    });
  };

  const title = readOnly ? t('dialog.viewTitle') : event ? t('dialog.editTitle') : t('dialog.createTitle');
  const description = readOnly
    ? t('dialog.viewDescription')
    : event
      ? t('dialog.editDescription')
      : t('dialog.createDescription');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {readOnly && <Badge variant="secondary">{t('dialog.readOnly')}</Badge>}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {readOnly && event && <EventDetails event={event} locale={locale} />}

        {!readOnly && form && (
          <form id="calendar-event-form" onSubmit={handleSubmit} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t('dialog.title')} *</Label>
              <Input
                id="event-title"
                value={form.title}
                maxLength={200}
                placeholder={t('dialog.titlePlaceholder')}
                onChange={(e) => update({ title: e.target.value })}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="event-all-day" className="cursor-pointer">{t('dialog.allDay')}</Label>
              <Switch id="event-all-day" checked={form.allDay} onCheckedChange={(allDay) => update({ allDay })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start-date">{t('dialog.start')} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="event-start-date"
                    type="date"
                    aria-label={t('dialog.startDate')}
                    value={form.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      // keep the end aligned when the start moves past it
                      update(form.endDate < startDate ? { startDate, endDate: startDate } : { startDate });
                    }}
                  />
                  {!form.allDay && (
                    <Input
                      type="time"
                      aria-label={t('dialog.startTime')}
                      className="w-[110px] shrink-0"
                      value={form.startTime}
                      onChange={(e) => update({ startTime: e.target.value })}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-date">{t('dialog.end')} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="event-end-date"
                    type="date"
                    aria-label={t('dialog.endDate')}
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                  />
                  {!form.allDay && (
                    <Input
                      type="time"
                      aria-label={t('dialog.endTime')}
                      className="w-[110px] shrink-0"
                      value={form.endTime}
                      onChange={(e) => update({ endTime: e.target.value })}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('dialog.participants')} *</Label>
              <ParticipantPicker
                users={users}
                value={form.participantIds}
                onChange={(participantIds) => update({ participantIds })}
                placeholder={t('dialog.addParticipants')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">{t('dialog.location')}</Label>
              <Input
                id="event-location"
                value={form.location}
                maxLength={255}
                placeholder={t('dialog.locationPlaceholder')}
                onChange={(e) => update({ location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('dialog.work')}</Label>
              <WorkPicker value={form.work} onChange={(work) => update({ work })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t('dialog.description')}</Label>
              <Textarea
                id="event-description"
                rows={3}
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>

            {event && (
              <p className="text-xs text-muted-foreground">
                {t('dialog.createdBy')}: {event.createdBy.fullName}
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </form>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {event && event.canEdit ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="text-destructive hover:text-destructive" disabled={deleteEvent.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('dialog.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('dialog.deleteDescription', { title: event.title })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t('common:actions.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? t('common:actions.close') : t('common:actions.cancel')}
            </Button>
            {!readOnly && (
              <Button type="submit" form="calendar-event-form" disabled={saving}>
                {saving ? t('dialog.saving') : t('dialog.save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventDetails({ event, locale }: { event: CalendarEvent; locale: Locale }) {
  const { t } = useTranslation('calendar');

  return (
    <div className="space-y-4 text-sm">
      <div className="text-lg font-semibold">{event.title}</div>
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="capitalize">{formatEventTime(event, locale, t('month.allDay'))}</span>
      </div>
      {event.location && (
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{event.location}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap gap-1.5">
          {event.participants.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOrFallback(p.calendarColor) }} />
              {p.fullName}
            </span>
          ))}
        </div>
      </div>
      {event.work && (
        <div className="flex items-start gap-3">
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <Link to={`/works/${event.work.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            {event.work.label}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
      {event.description && <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{event.description}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <UserIcon className="h-4 w-4 shrink-0" />
        {t('dialog.createdBy')}: {event.createdBy.fullName}
      </div>
    </div>
  );
}
