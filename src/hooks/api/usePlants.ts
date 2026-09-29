import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { plantsApi } from '@/lib/api';
import { Plant, PaginatedResponse } from '@/types';

// Query key factory
export const plantsKeys = {
  all: ['plants'] as const,
  lists: () => [...plantsKeys.all, 'list'] as const,
  list: (page?: number, size?: number, search?: string) => [...plantsKeys.lists(), { page, size, search }] as const,
  // Nested under lists() so mutations invalidating lists() also refresh dropdowns
  allList: () => [...plantsKeys.lists(), 'all'] as const,
  details: () => [...plantsKeys.all, 'detail'] as const,
  detail: (id: string) => [...plantsKeys.details(), id] as const,
};

// Fetch all plants with pagination
export function usePlants(page = 0, size = 20, search?: string) {
  return useQuery<PaginatedResponse<Plant>>({
    queryKey: plantsKeys.list(page, size, search),
    queryFn: () => plantsApi.getAll(page, size, search),
    placeholderData: keepPreviousData,
  });
}

// Fetch all plants, no pagination (for dropdowns)
export function useAllPlants() {
  return useQuery<Plant[]>({
    queryKey: plantsKeys.allList(),
    queryFn: () => plantsApi.getAllList(),
  });
}

// Fetch single plant
export function usePlant(id: string) {
  return useQuery<Plant>({
    queryKey: plantsKeys.detail(id),
    queryFn: () => plantsApi.getById(id),
    enabled: !!id,
  });
}

// Create plant mutation
export function useCreatePlant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => plantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plantsKeys.lists() });
    },
  });
}

// Update plant mutation
export function useUpdatePlant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      plantsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(plantsKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: plantsKeys.lists() });
    },
  });
}

// Delete plant mutation
export function useDeletePlant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => plantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plantsKeys.lists() });
    },
  });
}
