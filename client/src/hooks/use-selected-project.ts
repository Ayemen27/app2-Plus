import { useSelectedProjectContext, ALL_PROJECTS_ID, ALL_PROJECTS_NAME } from "@/contexts/SelectedProjectContext";

export { ALL_PROJECTS_ID, ALL_PROJECTS_NAME };

export function useSelectedProject() {
  const context = useSelectedProjectContext();
  return {
    ...context,
    refreshAllData: context.refreshAllData,
  };
}
