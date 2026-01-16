import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface RefreshOptions {
  projectId?: string;
  date?: string;
  immediate?: boolean;
}

const QUERY_KEYS = {
  projects: ["/api/projects"],
  projectsWithStats: ["/api/projects/with-stats"],
  workers: ["/api/workers"],
  workerAttendance: ["/api/worker-attendance"],
  materialPurchases: ["/api/material-purchases"],
  fundTransfers: ["/api/fund-transfers"],
  transportationExpenses: ["/api/transportation-expenses"],
  workerTransfers: ["/api/worker-transfers"],
  workerMiscExpenses: ["/api/worker-misc-expenses"],
  suppliers: ["/api/suppliers"],
  dailyExpenseSummaries: ["/api/daily-expense-summaries"],
  materials: ["/api/materials"],
  notifications: ["/api/notifications"],
} as const;

export function useInstantRefresh() {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const cancelDebounce = useCallback((key: string) => {
    const timer = debounceTimers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.current.delete(key);
    }
  }, []);

  const instantRefetch = useCallback(async (queryKey: readonly unknown[]) => {
    console.log('⚡ [InstantRefresh] تحديث فوري:', queryKey);
    
    await queryClient.invalidateQueries({ 
      queryKey: queryKey as string[], 
      refetchType: 'active',
      exact: false
    });
    
    await queryClient.refetchQueries({
      queryKey: queryKey as string[],
      type: 'active',
      exact: false
    });
  }, [queryClient]);

  const refreshProjectData = useCallback(async (options: RefreshOptions = {}) => {
    const { projectId, date, immediate = true } = options;
    
    console.log('🔄 [InstantRefresh] تحديث بيانات المشروع:', { projectId, date });
    
    const refreshTasks: Promise<void>[] = [];

    if (projectId && projectId !== 'all') {
      refreshTasks.push(
        instantRefetch(["/api/projects", projectId, "daily-expenses", date]),
        instantRefetch(["/api/projects", projectId, "previous-balance", date]),
        instantRefetch(["/api/projects", projectId, "fund-transfers"]),
        instantRefetch(["/api/projects", projectId, "worker-attendance"]),
        instantRefetch(["/api/projects", projectId, "material-purchases"]),
        instantRefetch(["/api/projects", projectId, "transportation-expenses"]),
        instantRefetch(["/api/projects", projectId, "worker-misc-expenses"]),
      );
    }

    refreshTasks.push(
      instantRefetch(QUERY_KEYS.projectsWithStats),
      instantRefetch(QUERY_KEYS.projects),
    );

    if (immediate) {
      await Promise.all(refreshTasks);
    } else {
      Promise.all(refreshTasks);
    }
  }, [instantRefetch]);

  const refreshOnProjectChange = useCallback(async (projectId: string, projectName?: string) => {
    console.log('📁 [InstantRefresh] تغيير المشروع:', { projectId, projectName });
    
    queryClient.cancelQueries();
    
    const allKeys = Object.values(QUERY_KEYS);
    
    await Promise.all(
      allKeys.map(key => 
        queryClient.invalidateQueries({ 
          queryKey: key, 
          refetchType: 'all',
          exact: false 
        })
      )
    );

    if (projectId && projectId !== 'all') {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k => k === projectId);
        },
        refetchType: 'all'
      });
    }

    await Promise.all(
      allKeys.map(key => 
        queryClient.refetchQueries({ 
          queryKey: key, 
          type: 'active',
          exact: false
        })
      )
    );
    
    console.log('✅ [InstantRefresh] تم تحديث جميع البيانات للمشروع:', projectId);
  }, [queryClient]);

  const refreshOnDateChange = useCallback(async (projectId: string, date: string) => {
    console.log('📅 [InstantRefresh] تغيير التاريخ:', { projectId, date });
    
    const dateKeys = [
      ["/api/projects", projectId, "daily-expenses", date],
      ["/api/projects", projectId, "previous-balance", date],
      ["/api/projects", projectId, "daily-summary", date],
      ["/api/daily-project-transfers", projectId, date],
    ];

    await Promise.all(
      dateKeys.map(key => instantRefetch(key))
    );
    
    console.log('✅ [InstantRefresh] تم تحديث بيانات التاريخ:', date);
  }, [instantRefetch]);

  const refreshOnMutation = useCallback(async (
    entityType: keyof typeof QUERY_KEYS,
    projectId?: string,
    date?: string
  ) => {
    console.log('💾 [InstantRefresh] تحديث بعد العملية:', { entityType, projectId, date });
    
    const entityKey = QUERY_KEYS[entityType];
    if (entityKey) {
      await instantRefetch(entityKey);
    }
    
    await instantRefetch(QUERY_KEYS.projectsWithStats);
    
    if (projectId && date) {
      await refreshOnDateChange(projectId, date);
    }
    
    console.log('✅ [InstantRefresh] تم تحديث البيانات بعد العملية');
  }, [instantRefetch, refreshOnDateChange]);

  const refreshAll = useCallback(async () => {
    console.log('🔄 [InstantRefresh] تحديث شامل لجميع البيانات...');
    
    queryClient.cancelQueries();
    
    await queryClient.invalidateQueries();
    
    await queryClient.refetchQueries({ type: 'active' });
    
    console.log('✅ [InstantRefresh] تم تحديث جميع البيانات');
  }, [queryClient]);

  const setQueryData = useCallback(<T>(
    queryKey: readonly unknown[],
    updater: T | ((old: T | undefined) => T)
  ) => {
    queryClient.setQueryData(queryKey, updater);
  }, [queryClient]);

  const getQueryData = useCallback(<T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient]);

  return {
    instantRefetch,
    refreshProjectData,
    refreshOnProjectChange,
    refreshOnDateChange,
    refreshOnMutation,
    refreshAll,
    setQueryData,
    getQueryData,
    QUERY_KEYS,
  };
}

export { QUERY_KEYS };
