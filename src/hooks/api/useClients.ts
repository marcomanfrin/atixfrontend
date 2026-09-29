import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';
import { Client, ClientType, PaginatedResponse } from '@/types';

// Query key factory
export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  list: (page?: number, size?: number, search?: string, type?: ClientType) =>
    [...clientsKeys.lists(), { page, size, search, type }] as const,
  // Nested under lists() so mutations invalidating lists() also refresh dropdowns
  allList: () => [...clientsKeys.lists(), 'all'] as const,
  details: () => [...clientsKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientsKeys.details(), id] as const,
};

// Fetch all clients with pagination
export function useClients(page = 0, size = 20, search?: string, type?: ClientType) {
  return useQuery<PaginatedResponse<Client>>({
    queryKey: clientsKeys.list(page, size, search, type),
    queryFn: () => clientsApi.getAll(page, size, search, type),
    placeholderData: keepPreviousData,
  });
}

// Fetch all clients, no pagination (for dropdowns)
export function useAllClients() {
  return useQuery<Client[]>({
    queryKey: clientsKeys.allList(),
    queryFn: () => clientsApi.getAllList(),
  });
}

// Fetch single client
export function useClient(id: string) {
  return useQuery<Client>({
    queryKey: clientsKeys.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  });
}

// Create client mutation
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; type: string }) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}

// Update client mutation
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      clientsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(clientsKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}

// Delete client mutation
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}
