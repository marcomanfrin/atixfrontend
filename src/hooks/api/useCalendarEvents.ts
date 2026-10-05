import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { calendarApi } from '@/lib/api';
import type { CalendarEvent, CalendarEventInput } from '@/types/calendar';

export interface CalendarEventsParams {
  from: string;
  to: string;
  mine?: boolean;
  participantIds?: string[];
}

// Query key factory
export const calendarKeys = {
  all: ['calendar-events'] as const,
  lists: () => [...calendarKeys.all, 'list'] as const,
  list: (params: CalendarEventsParams) => [...calendarKeys.lists(), params] as const,
};

// Fetch events overlapping the [from, to) window
export function useCalendarEvents(params: CalendarEventsParams) {
  return useQuery<CalendarEvent[]>({
    queryKey: calendarKeys.list(params),
    queryFn: () => calendarApi.getEvents(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CalendarEventInput) => calendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CalendarEventInput }) => calendarApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
