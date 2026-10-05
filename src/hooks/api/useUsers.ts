import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { User } from '@/types';

// Query key factory
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: () => [...usersKeys.lists()] as const,
  byType: (type: string) => [...usersKeys.lists(), 'type', type] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
};

// Fetch all users
export function useUsers() {
  return useQuery<User[]>({
    queryKey: usersKeys.list(),
    queryFn: () => usersApi.getAll(),
  });
}

// Fetch users by type
export function useUsersByType(type: string) {
  return useQuery<User[]>({
    queryKey: usersKeys.byType(type),
    queryFn: () => usersApi.getByType(type),
    enabled: !!type,
  });
}

// Fetch single user
export function useUser(id: string) {
  return useQuery<User>({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
      type: string;
    }) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      usersApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(usersKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

// Update password mutation
export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { currentPassword: string; newPassword: string } }) =>
      usersApi.updatePassword(id, data),
  });
}

// Upload avatar mutation
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      usersApi.uploadAvatar(id, file),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

// Delete user mutation
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

// Update calendar colour ('me' for the current user, or a user id for ADMIN/OWNER)
export function useUpdateCalendarColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, calendarColor }: { id: string | 'me'; calendarColor: string }) =>
      usersApi.updateCalendarColor(id, calendarColor),
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(usersKeys.detail(data.id), data);
      }
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
