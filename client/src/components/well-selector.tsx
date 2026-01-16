import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface WellSelectorProps {
  projectId?: string;
  value?: number | string;
  onChange: (wellId: number | undefined) => void;
  showLabel?: boolean;
  disabled?: boolean;
  optional?: boolean;
}

/**
 * مكون اختيار البئر - يظهر فقط عندما يكون المشروع من نوع "آبار"
 * Well Selector Component - shows only when project type is "آبار" (Wells)
 */
export function WellSelector({
  projectId,
  value,
  onChange,
  showLabel = true,
  disabled = false,
  optional = true
}: WellSelectorProps) {
  // جلب الآبار
  const { data: wells = [], isLoading } = useQuery({
    queryKey: ['wells', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const response = await apiRequest(`/api/wells?projectId=${projectId}`);
        // Handle both possible response structures
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        console.error('Error fetching wells:', error);
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const options = useMemo(() => {
    const wellOptions = wells.map((well: any) => ({
      value: String(well.id),
      label: `بئر #${well.wellNumber} - ${well.ownerName}`
    }));

    if (optional) {
      return [{ value: "none", label: "بدون بئر" }, ...wellOptions];
    }
    return wellOptions;
  }, [wells, optional]);

  if (!projectId || wells.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1">
          البئر {!optional && <span className="text-red-500">*</span>}
        </Label>
      )}
      <SearchableSelect
        options={options}
        value={value ? String(value) : "none"}
        onValueChange={(val) => onChange(val === "none" ? undefined : parseInt(val))}
        placeholder="اختر البئر"
        searchPlaceholder="بحث عن بئر..."
        emptyText="لا توجد آبار مطابقة"
        disabled={disabled || isLoading}
      />
    </div>
  );
}

export default WellSelector;
