export interface CalendarParticipant {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  calendarColor?: string | null;
}

export interface CalendarWorkRef {
  id: string;
  label: string;
}

// Date-time are local (Europe/Rome) ISO strings without offset, e.g. "2026-10-12T09:00:00".
// Intervals are half-open [startAt, endAt): all-day events end at 00:00 of the day after the last day.
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  participants: CalendarParticipant[];
  createdBy: CalendarParticipant;
  work?: CalendarWorkRef | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

// For all-day events endAt carries the last included day; the server normalises the interval.
export interface CalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  participantIds: string[];
  workId?: string | null;
}

export type CalendarView = 'month' | 'gantt';
export type GanttSpan = 'week' | 'twoWeeks' | 'month';
