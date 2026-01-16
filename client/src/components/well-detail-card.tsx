import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Wrench, TrendingUp, DollarSign, Edit2, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WellDetailCardProps {
  wellId: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewCosts?: () => void;
}

export function WellDetailCard({ wellId, onEdit, onDelete, onViewCosts }: WellDetailCardProps) {
  const { toast } = useToast();

  // جلب تفاصيل البئر
  const { data: well, isLoading: wellLoading } = useQuery({
    queryKey: ['well', wellId],
    queryFn: async () => {
      const response = await apiRequest(`/wells/${wellId}`);
      return response.data;
    }
  });

  // جلب مصاريف البئر
  const { data: expenses = [] } = useQuery({
    queryKey: ['well-expenses', wellId],
    queryFn: async () => {
      const response = await apiRequest(`/well-expenses/${wellId}`);
      return response.data || [];
    }
  });

  // جلب تقرير التكاليف
  const { data: costReport } = useQuery({
    queryKey: ['well-cost-report', wellId],
    queryFn: async () => {
      const response = await apiRequest(`/well-expenses/cost-report/${wellId}`);
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/wells/${wellId}`, { method: 'DELETE' } as any);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف البئر بنجاح" });
      onDelete?.();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حذف البئر", variant: "destructive" });
    }
  });

  if (!well) {
    return null;
  }

  const statusMap = {
    pending: { label: 'لم يبدأ', badge: 'outline' },
    in_progress: { label: 'قيد التنفيذ', badge: 'warning' },
    completed: { label: 'منجز', badge: 'success' }
  } as const;

  const totalCost = costReport?.totalCost || 0;
  const laborCost = costReport?.laborCost || 0;
  const materialCost = costReport?.materialCost || 0;
  const transportCost = costReport?.transportCost || 0;

  return (
    <UnifiedCardGrid columns={1}>
      {/* بطاقة البئر الرئيسية */}
      <UnifiedCard
        title={`بئر #${well.wellNumber}`}
        subtitle={`${well.ownerName} - ${well.region}`}
        titleIcon={MapPin}
        isLoading={wellLoading}
        badges={[
          {
            label: statusMap[well.status as keyof typeof statusMap]?.label || well.status,
            variant: statusMap[well.status as keyof typeof statusMap]?.badge as any || 'outline'
          }
        ]}
        fields={[
          { label: 'الألواح', value: well.numberOfPanels, icon: Wrench, color: 'info' as const },
          { label: 'المواسير', value: well.numberOfPipes, icon: Wrench, color: 'success' as const },
          { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
          { label: 'القواعد', value: well.numberOfBases, icon: Wrench, color: 'default' as const },
          { label: 'التقدم', value: `${well.completionPercentage}%`, emphasis: true, color: 'info' as const },
          { label: 'مستوى الماء', value: well.waterLevel ? `${well.waterLevel}م` : '-', icon: TrendingUp, color: 'default' as const },
          ...(well.fanType ? [{ label: 'نوع المروحة', value: well.fanType, icon: Wrench, color: 'info' as const }] : []),
          ...(well.pumpPower ? [{ label: 'قوة المضخة', value: `${well.pumpPower}`, icon: Wrench, color: 'warning' as const }] : []),
          ...(well.notes ? [{ label: 'الملاحظات', value: well.notes, color: 'default' as const }] : [])
        ]}
        actions={[
          ...(onEdit ? [{
            icon: Edit2,
            label: 'تعديل',
            onClick: onEdit,
            color: 'blue' as const
          }] : []),
          ...(onDelete ? [{
            icon: Trash2,
            label: 'حذف',
            onClick: () => deleteMutation.mutate(),
            disabled: deleteMutation.isPending,
            color: 'red' as const
          }] : [])
        ]}
      />

      {/* بطاقة التكاليف */}
      <UnifiedCard
        title='التكاليف الإجمالية'
        titleIcon={DollarSign}
        badges={[{ label: formatCurrency(totalCost), variant: 'success' }]}
        fields={[
          { label: 'أجور العمالة', value: formatCurrency(laborCost), icon: Wrench, color: 'info', emphasis: true },
          { label: 'المواد', value: formatCurrency(materialCost), icon: Wrench, color: 'warning', emphasis: true },
          { label: 'المواصلات', value: formatCurrency(transportCost), icon: Wrench, color: 'danger', emphasis: true },
          { label: 'عدد المصاريف', value: expenses.length }
        ]}
        actions={onViewCosts ? [{
          icon: BarChart3,
          label: 'التقرير المفصل',
          onClick: onViewCosts,
          color: 'green' as const
        }] : []}
      />
    </UnifiedCardGrid>
  );
}

export default WellDetailCard;
