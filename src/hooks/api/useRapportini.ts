import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rapportiniApi } from '@/lib/api';
import type {
  RapportiniFilters,
  RapportinoCreateRequest,
  RapportinoDetail,
  RapportinoSignRequest,
  RapportinoUpdateRequest,
} from '@/types/rapportino';
import { workReportsKeys } from './useWorkReports';

// Query key factory
export const rapportiniKeys = {
  all: ['rapportini'] as const,
  lists: () => [...rapportiniKeys.all, 'list'] as const,
  list: (filters: RapportiniFilters) => [...rapportiniKeys.lists(), filters] as const,
  details: () => [...rapportiniKeys.all, 'detail'] as const,
  detail: (id: string) => [...rapportiniKeys.details(), id] as const,
  checklistTemplate: () => [...rapportiniKeys.all, 'checklist-template'] as const,
};

export function useRapportini(filters: RapportiniFilters = {}) {
  return useQuery({
    queryKey: rapportiniKeys.list(filters),
    queryFn: () => rapportiniApi.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useRapportino(id: string) {
  return useQuery({
    queryKey: rapportiniKeys.detail(id),
    queryFn: () => rapportiniApi.getById(id),
    enabled: !!id,
  });
}

export function useChecklistTemplate() {
  return useQuery({
    queryKey: rapportiniKeys.checklistTemplate(),
    queryFn: () => rapportiniApi.getChecklistTemplate(),
    staleTime: 5 * 60 * 1000,
  });
}

// Signing and voiding change the work order hours: refresh its work report too
function useRapportinoMutationSuccess() {
  const queryClient = useQueryClient();
  return (data: RapportinoDetail | null | undefined, id: string, touchesHours = false) => {
    if (data) {
      queryClient.setQueryData(rapportiniKeys.detail(id), data);
    } else {
      queryClient.invalidateQueries({ queryKey: rapportiniKeys.detail(id) });
    }
    queryClient.invalidateQueries({ queryKey: rapportiniKeys.lists() });
    if (touchesHours && data?.workId) {
      queryClient.invalidateQueries({ queryKey: workReportsKeys.byWork(data.workId) });
      queryClient.invalidateQueries({ queryKey: workReportsKeys.entries(data.workId) });
    }
  };
}

export function useCreateRapportino() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RapportinoCreateRequest) => rapportiniApi.create(data),
    onSuccess: (data) => {
      queryClient.setQueryData(rapportiniKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: rapportiniKeys.lists() });
    },
  });
}

export function useUpdateRapportino() {
  const onSuccess = useRapportinoMutationSuccess();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RapportinoUpdateRequest }) => rapportiniApi.update(id, data),
    onSuccess: (data, variables) => onSuccess(data, variables.id),
  });
}

export function useDeleteRapportino() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rapportiniApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: rapportiniKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rapportiniKeys.lists() });
    },
  });
}

export function useSignRapportino() {
  const onSuccess = useRapportinoMutationSuccess();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RapportinoSignRequest }) => rapportiniApi.sign(id, data),
    onSuccess: (data, variables) => onSuccess(data, variables.id, true),
  });
}

export function useRequestSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiresInMinutes }: { id: string; expiresInMinutes: number }) =>
      rapportiniApi.requestSignature(id, expiresInMinutes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rapportiniKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: rapportiniKeys.lists() });
    },
  });
}

export function useRevokeSignatureRequest() {
  const onSuccess = useRapportinoMutationSuccess();
  return useMutation({
    mutationFn: (id: string) => rapportiniApi.revokeSignatureRequest(id),
    onSuccess: (data, id) => onSuccess(data, id),
  });
}

export function useVoidRapportino() {
  const onSuccess = useRapportinoMutationSuccess();
  return useMutation({
    mutationFn: (id: string) => rapportiniApi.void(id),
    onSuccess: (data, id) => onSuccess(data, id, true),
  });
}
