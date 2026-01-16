/**
 * Hook موحد للملخص المالي
 * Unified Financial Summary Hook
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ExpenseSummary {
  materialExpenses: number;
  materialExpensesCredit: number;
  workerWages: number;
  transportExpenses: number;
  workerTransfers: number;
  miscExpenses: number;
  outgoingProjectTransfers: number;
  totalCashExpenses: number;
  totalAllExpenses: number;
}

export interface IncomeSummary {
  fundTransfers: number;
  incomingProjectTransfers: number;
  totalIncome: number;
  carriedForwardBalance?: number;
  totalIncomeWithCarried?: number;
}

export interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  completedDays: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  status: string;
  description: string | null;
  expenses: ExpenseSummary;
  income: IncomeSummary;
  workers: WorkerStats;
  cashBalance: number;
  totalBalance: number;
  counts: {
    materialPurchases: number;
    workerAttendance: number;
    transportationExpenses: number;
    workerTransfers: number;
    miscExpenses: number;
    fundTransfers: number;
  };
  lastUpdated: string;
  date?: string;
}

export interface AllProjectsSummary {
  projects: ProjectFinancialSummary[];
  totals: {
    totalIncome: number;
    totalCashExpenses: number;
    totalAllExpenses: number;
    cashBalance: number;
    totalBalance: number;
    totalWorkers: number;
    activeWorkers: number;
    materialExpensesCredit: number;
    carriedForwardBalance: number;
  };
  projectsCount: number;
}

interface UseFinancialSummaryOptions {
  projectId?: string | null;
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  enabled?: boolean;
}

export function useFinancialSummary(options: UseFinancialSummaryOptions = {}) {
  const { projectId, date, dateFrom, dateTo, enabled = true } = options;

  const queryKey = projectId && projectId !== 'all'
    ? ["/api/financial-summary", projectId, date, dateFrom, dateTo]
    : ["/api/financial-summary", "all", date, dateFrom, dateTo];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        let url = "/api/financial-summary";
        const params = new URLSearchParams();

        if (projectId && projectId !== 'all') {
          params.append("projectId", projectId);
        }
        if (date) {
          params.append("date", date);
        }
        if (dateFrom) {
          params.append("dateFrom", dateFrom);
        }
        if (dateTo) {
          params.append("dateTo", dateTo);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await apiRequest(url, "GET");
        if (response?.success && response?.data) {
          return response.data;
        }
        return null;
      } catch (error) {
        console.error("❌ [useFinancialSummary] خطأ في جلب الملخص المالي:", error);
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const isAllProjects = !projectId || projectId === 'all';

  if (isAllProjects && data) {
    const allProjectsData = data as AllProjectsSummary;
    const totals = allProjectsData.totals || {
      totalIncome: 0,
      totalCashExpenses: 0,
      totalAllExpenses: 0,
      cashBalance: 0,
      totalBalance: 0,
      totalWorkers: 0,
      activeWorkers: 0,
      materialExpensesCredit: 0,
      carriedForwardBalance: 0
    };

    // حساب تفاصيل الفئات المجمعة من جميع المشاريع
    const aggregatedCategories = allProjectsData.projects?.reduce((acc, p) => ({
      totalWorkerWages: acc.totalWorkerWages + (p.expenses?.workerWages || 0),
      totalTransportation: acc.totalTransportation + (p.expenses?.transportExpenses || 0),
      totalMaterialCosts: acc.totalMaterialCosts + (p.expenses?.materialExpenses || 0),
      totalWorkerTransfers: acc.totalWorkerTransfers + (p.expenses?.workerTransfers || 0),
      totalMiscExpenses: acc.totalMiscExpenses + (p.expenses?.miscExpenses || 0),
      totalFundTransfers: acc.totalFundTransfers + (p.income?.fundTransfers || 0),
      incomingProjectTransfers: acc.incomingProjectTransfers + (p.income?.incomingProjectTransfers || 0),
      outgoingProjectTransfers: acc.outgoingProjectTransfers + (p.expenses?.outgoingProjectTransfers || 0),
    }), {
      totalWorkerWages: 0,
      totalTransportation: 0,
      totalMaterialCosts: 0,
      totalWorkerTransfers: 0,
      totalMiscExpenses: 0,
      totalFundTransfers: 0,
      incomingProjectTransfers: 0,
      outgoingProjectTransfers: 0,
    }) || {
      totalWorkerWages: 0,
      totalTransportation: 0,
      totalMaterialCosts: 0,
      totalWorkerTransfers: 0,
      totalMiscExpenses: 0,
      totalFundTransfers: 0,
      incomingProjectTransfers: 0,
      outgoingProjectTransfers: 0,
    };

    return {
      summary: null as ProjectFinancialSummary | null,
      allProjects: allProjectsData,
      totals: {
        ...totals,
        ...aggregatedCategories,
        totalExpenses: totals.totalAllExpenses || 0,
        currentBalance: totals.totalBalance || 0,
        remainingBalance: totals.totalBalance || 0
      },
      isLoading,
      error,
      refetch
    };
  }

  const projectData = data as ProjectFinancialSummary | null;
  const hasValidData = projectData && projectData.income && projectData.expenses && projectData.workers;

  return {
    summary: projectData,
    allProjects: null as AllProjectsSummary | null,
    totals: hasValidData ? {
      totalIncome: projectData!.income?.totalIncome ?? 0,
      totalCashExpenses: projectData!.expenses?.totalCashExpenses ?? 0,
      totalAllExpenses: projectData!.expenses?.totalAllExpenses ?? 0,
      totalExpenses: projectData!.expenses?.totalCashExpenses ?? 0,
      cashBalance: projectData!.cashBalance ?? 0,
      totalBalance: projectData!.totalBalance ?? 0,
      currentBalance: projectData!.totalBalance ?? 0,
      totalWorkers: projectData!.workers?.totalWorkers ?? 0,
      activeWorkers: projectData!.workers?.activeWorkers ?? 0,
      materialExpensesCredit: projectData!.expenses?.materialExpensesCredit ?? 0,
      carriedForwardBalance: projectData!.income?.carriedForwardBalance ?? 0,
      totalWorkerWages: projectData!.expenses?.workerWages ?? 0,
      totalTransportation: projectData!.expenses?.transportExpenses ?? 0,
      totalMaterialCosts: projectData!.expenses?.materialExpenses ?? 0,
      totalWorkerTransfers: projectData!.expenses?.workerTransfers ?? 0,
      totalMiscExpenses: projectData!.expenses?.miscExpenses ?? 0,
      totalFundTransfers: projectData!.income?.fundTransfers ?? 0,
      incomingProjectTransfers: projectData!.income?.incomingProjectTransfers ?? 0,
      outgoingProjectTransfers: projectData!.expenses?.outgoingProjectTransfers ?? 0,
      remainingBalance: projectData!.totalBalance ?? 0
    } : {
      totalIncome: 0,
      totalCashExpenses: 0,
      totalAllExpenses: 0,
      totalExpenses: 0,
      cashBalance: 0,
      totalBalance: 0,
      currentBalance: 0,
      totalWorkers: 0,
      activeWorkers: 0,
      materialExpensesCredit: 0,
      carriedForwardBalance: 0,
      totalWorkerWages: 0,
      totalTransportation: 0,
      totalMaterialCosts: 0,
      totalWorkerTransfers: 0,
      totalMiscExpenses: 0,
      totalFundTransfers: 0,
      incomingProjectTransfers: 0,
      outgoingProjectTransfers: 0,
      remainingBalance: 0
    },
    isLoading,
    error,
    refetch
  };
}

export default useFinancialSummary;
