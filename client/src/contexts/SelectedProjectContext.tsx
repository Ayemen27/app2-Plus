import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient as globalQueryClient } from "@/lib/queryClient";

const SELECTED_PROJECT_KEY = "construction-app-selected-project";
const SELECTED_PROJECT_NAME_KEY = "construction-app-selected-project-name";

export const ALL_PROJECTS_ID = "all";
export const ALL_PROJECTS_NAME = "جميع المشاريع";

const ALL_QUERY_KEYS = [
  ["/api/projects"],
  ["/api/projects/with-stats"],
  ["/api/workers"],
  ["/api/worker-attendance"],
  ["/api/material-purchases"],
  ["/api/fund-transfers"],
  ["/api/transportation-expenses"],
  ["/api/worker-transfers"],
  ["/api/worker-misc-expenses"],
  ["/api/suppliers"],
  ["/api/daily-expense-summaries"],
  ["/api/materials"],
  ["/api/notifications"],
];

interface Project {
  id: string;
  name: string;
  status?: string;
  budget?: number;
}

interface SelectedProjectContextType {
  selectedProjectId: string;
  selectedProjectName: string;
  isLoading: boolean;
  isAllProjects: boolean;
  selectProject: (projectId: string, projectName?: string) => void;
  clearProject: () => void;
  selectAllProjects: () => void;
  hasStoredProject: () => boolean;
  getProjectIdForApi: () => string | undefined;
  projects: Project[];
  projectsError: Error | null;
  isProjectsLoading: boolean;
  refreshAllData: () => Promise<void>;
}

const SelectedProjectContext = createContext<SelectedProjectContextType | null>(null);

interface SelectedProjectProviderProps {
  children: ReactNode;
}

export function SelectedProjectProvider({ children }: SelectedProjectProviderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS_ID);
  const [selectedProjectName, setSelectedProjectName] = useState<string>(ALL_PROJECTS_NAME);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: isProjectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });
      if (!response.ok) {
        throw new Error("فشل في جلب المشاريع");
      }
      const data = await response.json();
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 2,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const projects = useMemo(() => {
    if (Array.isArray(projectsData)) {
      return projectsData;
    }
    return [];
  }, [projectsData]);

  useEffect(() => {
    try {
      const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      const savedProjectName = localStorage.getItem(SELECTED_PROJECT_NAME_KEY);
      
      if (savedProjectId && savedProjectId !== "undefined" && savedProjectId !== "null") {
        setSelectedProjectId(savedProjectId);
        if (savedProjectName) {
          setSelectedProjectName(savedProjectName);
        }
      } else {
        setSelectedProjectId(ALL_PROJECTS_ID);
        setSelectedProjectName(ALL_PROJECTS_NAME);
      }
    } catch (error) {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
      localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
      setSelectedProjectId(ALL_PROJECTS_ID);
      setSelectedProjectName(ALL_PROJECTS_NAME);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const isLoading = !isInitialized || isProjectsLoading;

  const instantRefreshAllData = useCallback(async (projectId?: string) => {
    console.log("⚡ [SelectedProjectContext] تحديث فوري لجميع البيانات...", projectId);
    
    const startTime = Date.now();
    
    await queryClient.cancelQueries();
    
    const invalidatePromises = ALL_QUERY_KEYS.map(key => 
      queryClient.invalidateQueries({ 
        queryKey: key, 
        refetchType: 'all',
        exact: false 
      })
    );
    
    if (projectId && projectId !== ALL_PROJECTS_ID) {
      invalidatePromises.push(
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(k => String(k) === projectId);
          },
          refetchType: 'all'
        })
      );
    }
    
    await Promise.all(invalidatePromises);
    
    await queryClient.refetchQueries({ 
      type: 'active',
      exact: false
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ [SelectedProjectContext] تم تحديث جميع البيانات في ${duration}ms`);
  }, [queryClient]);

  const selectProject = useCallback(async (projectId: string, projectName?: string) => {
    console.log("📁 [SelectedProjectContext] تحديد المشروع الفوري:", { projectId, projectName });
    
    setSelectedProjectId(projectId);
    
    if (projectName) {
      setSelectedProjectName(projectName);
    } else if (projectId === ALL_PROJECTS_ID) {
      setSelectedProjectName(ALL_PROJECTS_NAME);
    }
    
    try {
      if (projectId && projectId !== "undefined" && projectId !== "null") {
        localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
        if (projectName) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, projectName);
        } else if (projectId === ALL_PROJECTS_ID) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, ALL_PROJECTS_NAME);
        }
      } else {
        localStorage.removeItem(SELECTED_PROJECT_KEY);
        localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
        setSelectedProjectName("");
      }
    } catch (error) {
      console.error("❌ [SelectedProjectContext] خطأ في حفظ المشروع:", error);
    }

    await instantRefreshAllData(projectId);
  }, [instantRefreshAllData]);

  const selectAllProjects = useCallback(() => {
    selectProject(ALL_PROJECTS_ID, ALL_PROJECTS_NAME);
  }, [selectProject]);

  const clearProject = useCallback(() => {
    console.log("🗑️ [SelectedProjectContext] مسح تحديد المشروع");
    selectProject(ALL_PROJECTS_ID, ALL_PROJECTS_NAME);
  }, [selectProject]);

  const hasStoredProject = useCallback(() => {
    try {
      const storedId = localStorage.getItem(SELECTED_PROJECT_KEY);
      return !!(storedId && storedId !== "undefined" && storedId !== "null" && storedId !== ALL_PROJECTS_ID);
    } catch {
      return false;
    }
  }, []);

  const getProjectIdForApi = useCallback((): string | undefined => {
    if (selectedProjectId === ALL_PROJECTS_ID || !selectedProjectId) {
      return undefined;
    }
    return selectedProjectId;
  }, [selectedProjectId]);

  const isAllProjects = selectedProjectId === ALL_PROJECTS_ID;

  const refreshAllData = useCallback(async () => {
    await instantRefreshAllData(selectedProjectId);
  }, [instantRefreshAllData, selectedProjectId]);

  const value = useMemo(() => ({
    selectedProjectId,
    selectedProjectName,
    isLoading,
    isAllProjects,
    selectProject,
    clearProject,
    selectAllProjects,
    hasStoredProject,
    getProjectIdForApi,
    projects,
    projectsError: projectsError as Error | null,
    isProjectsLoading,
    refreshAllData,
  }), [
    selectedProjectId,
    selectedProjectName,
    isLoading,
    isAllProjects,
    selectProject,
    clearProject,
    selectAllProjects,
    hasStoredProject,
    getProjectIdForApi,
    projects,
    projectsError,
    isProjectsLoading,
    refreshAllData,
  ]);

  return (
    <SelectedProjectContext.Provider value={value}>
      {children}
    </SelectedProjectContext.Provider>
  );
}

export function useSelectedProjectContext() {
  const context = useContext(SelectedProjectContext);
  if (!context) {
    throw new Error("useSelectedProjectContext must be used within a SelectedProjectProvider");
  }
  return context;
}
