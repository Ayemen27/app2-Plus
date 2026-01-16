import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OptimisticMutationOptions<TData, TVariables> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<unknown>;
  getOptimisticUpdate: (oldData: TData[] | undefined, variables: TVariables) => TData[];
  successMessage?: string;
  errorMessage?: string;
  invalidateKeys?: QueryKey[];
}

export function useOptimisticMutation<TData extends { id: string }, TVariables>({
  queryKey,
  mutationFn,
  getOptimisticUpdate,
  successMessage = 'تمت العملية بنجاح',
  errorMessage = 'حدث خطأ',
  invalidateKeys = [],
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TData[]>(queryKey);
      
      const optimisticData = getOptimisticUpdate(previousData, variables);
      queryClient.setQueryData<TData[]>(queryKey, optimisticData);
      
      return { previousData };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      toast({
        title: errorMessage,
        description: error?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: successMessage,
        className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      
      for (const key of invalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key, refetchType: 'active' });
      }
    },
  });
}

export function useOptimisticDelete<TData extends { id: string }>(
  queryKey: QueryKey,
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateKeys?: QueryKey[];
  }
) {
  return useOptimisticMutation<TData, string>({
    queryKey,
    mutationFn: (id: string) => apiRequest(`${endpoint}/${id}`, 'DELETE'),
    getOptimisticUpdate: (oldData, id) => 
      (oldData || []).filter((item) => item.id !== id),
    successMessage: options?.successMessage || 'تم الحذف بنجاح',
    errorMessage: options?.errorMessage || 'فشل الحذف',
    invalidateKeys: options?.invalidateKeys || [],
  });
}

export function useOptimisticCreate<TData extends { id: string }>(
  queryKey: QueryKey,
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateKeys?: QueryKey[];
    getTempItem?: (data: Partial<TData>) => TData;
  }
) {
  return useOptimisticMutation<TData, Partial<TData>>({
    queryKey,
    mutationFn: (data: Partial<TData>) => apiRequest(endpoint, 'POST', data),
    getOptimisticUpdate: (oldData, newData) => {
      if (options?.getTempItem) {
        const tempItem = options.getTempItem(newData);
        return [...(oldData || []), tempItem];
      }
      const tempItem = {
        ...newData,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      } as unknown as TData;
      return [...(oldData || []), tempItem];
    },
    successMessage: options?.successMessage || 'تمت الإضافة بنجاح',
    errorMessage: options?.errorMessage || 'فشلت الإضافة',
    invalidateKeys: options?.invalidateKeys || [],
  });
}

export function useOptimisticUpdate<TData extends { id: string }>(
  queryKey: QueryKey,
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateKeys?: QueryKey[];
  }
) {
  return useOptimisticMutation<TData, { id: string; data: Partial<TData> }>({
    queryKey,
    mutationFn: ({ id, data }) => apiRequest(`${endpoint}/${id}`, 'PATCH', data),
    getOptimisticUpdate: (oldData, { id, data }) =>
      (oldData || []).map((item) =>
        item.id === id ? { ...item, ...data } : item
      ),
    successMessage: options?.successMessage || 'تم التحديث بنجاح',
    errorMessage: options?.errorMessage || 'فشل التحديث',
    invalidateKeys: options?.invalidateKeys || [],
  });
}

export function useOptimisticToggle<TData extends { id: string; isActive: boolean }>(
  queryKey: QueryKey,
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateKeys?: QueryKey[];
  }
) {
  return useOptimisticMutation<TData, { id: string; currentStatus: boolean }>({
    queryKey,
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = !currentStatus;
      return apiRequest(`${endpoint}/${id}`, 'PATCH', { isActive: newStatus });
    },
    getOptimisticUpdate: (oldData, { id }) =>
      (oldData || []).map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      ),
    successMessage: options?.successMessage || 'تم تغيير الحالة بنجاح',
    errorMessage: options?.errorMessage || 'فشل تغيير الحالة',
    invalidateKeys: options?.invalidateKeys || [],
  });
}
