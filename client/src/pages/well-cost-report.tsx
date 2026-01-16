import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, DollarSign, TrendingUp, PieChart, Download } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useToast } from "@/hooks/use-toast";

export default function WellCostReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const { selectedProjectId } = useSelectedProject();

  // جلب الآبار
  const { data: wells = [] } = useQuery({
    queryKey: ['wells', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest(`/wells?projectId=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId
  });

  // جلب تقرير التكاليف للمشروع
  const { data: projectCosts } = useQuery({
    queryKey: ['project-costs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const response = await apiRequest(`/well-expenses/project-costs/${selectedProjectId}`);
      return response.data;
    },
    enabled: !!selectedProjectId
  });

  // جلب تقرير البئر المحددة
  const { data: wellReport } = useQuery({
    queryKey: ['well-cost-report', selectedWellId],
    queryFn: async () => {
      if (!selectedWellId) return null;
      const response = await apiRequest(`/well-expenses/cost-report/${selectedWellId}`);
      return response.data;
    },
    enabled: !!selectedWellId
  });

  // حساب النسب المئوية
  const calculatePercentage = (amount: number, total: number) => {
    return total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* ملخص المشروع */}
      {projectCosts && (
        <UnifiedCardGrid columns={2}>
          <UnifiedCard
            title='إجمالي التكاليف'
            subtitle='جميع الآبار'
            titleIcon={DollarSign}
            fields={[
              { label: 'المبلغ', value: formatCurrency(projectCosts.totalCost || 0), emphasis: true, color: 'success' }
            ]}
            compact
          />
          <UnifiedCard
            title='أجور العمالة'
            subtitle='إجمالي التكلفة'
            titleIcon={TrendingUp}
            fields={[
              { label: 'المبلغ', value: formatCurrency(projectCosts.totalLaborCost || 0), emphasis: true, color: 'info' }
            ]}
            compact
          />
          <UnifiedCard
            title='المواد'
            subtitle='إجمالي التكلفة'
            titleIcon={DollarSign}
            fields={[
              { label: 'المبلغ', value: formatCurrency(projectCosts.totalMaterialCost || 0), emphasis: true, color: 'warning' }
            ]}
            compact
          />
          <UnifiedCard
            title='المواصلات'
            subtitle='إجمالي التكلفة'
            titleIcon={DollarSign}
            fields={[
              { label: 'المبلغ', value: formatCurrency(projectCosts.totalTransportCost || 0), emphasis: true, color: 'danger' }
            ]}
            compact
          />
        </UnifiedCardGrid>
      )}

      {/* قائمة الآبار */}
      <div>
        <div className="text-xl font-semibold mb-4">اختر البئر</div>
        <UnifiedCardGrid columns={3}>
          {wells.map((well: any) => (
            <UnifiedCard
              key={well.id}
              title={`بئر #${well.wellNumber}`}
              subtitle={well.ownerName}
              titleIcon={PieChart}
              fields={[
                { label: 'المنطقة', value: well.region },
                { label: 'التقدم', value: `${well.completionPercentage}%`, emphasis: true }
              ]}
              onClick={() => setSelectedWellId(well.id)}
              className={selectedWellId === well.id ? 'ring-2 ring-primary' : ''}
              badges={[{
                label: well.status === 'completed' ? 'منجز' : well.status === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ',
                variant: well.status === 'completed' ? 'success' : well.status === 'in_progress' ? 'warning' : 'outline'
              }]}
              compact
            />
          ))}
        </UnifiedCardGrid>
      </div>

      {/* تقرير البئر المحددة */}
      {selectedWellId && wellReport && (
        <UnifiedCardGrid columns={1}>
          <UnifiedCard
            title={`تفاصيل التكاليف - بئر #${wells.find((w: any) => w.id === selectedWellId)?.wellNumber}`}
            titleIcon={TrendingUp}
            badges={[
              { label: formatCurrency(wellReport.totalCost || 0), variant: 'success' },
              { label: 'إجمالي', variant: 'default' }
            ]}
            fields={[
              { label: 'أجور العمالة', value: formatCurrency(wellReport.laborCost || 0), emphasis: true, color: 'info' },
              { label: 'النسبة', value: `${calculatePercentage(wellReport.laborCost || 0, wellReport.totalCost || 1)}%`, color: 'info' },
              { label: 'المواد', value: formatCurrency(wellReport.materialCost || 0), emphasis: true, color: 'warning' },
              { label: 'النسبة', value: `${calculatePercentage(wellReport.materialCost || 0, wellReport.totalCost || 1)}%`, color: 'warning' },
              { label: 'المواصلات', value: formatCurrency(wellReport.transportCost || 0), emphasis: true, color: 'danger' },
              { label: 'النسبة', value: `${calculatePercentage(wellReport.transportCost || 0, wellReport.totalCost || 1)}%`, color: 'danger' }
            ]}
          />
        </UnifiedCardGrid>
      )}

      {/* رسالة إذا لم يتم اختيار بئر */}
      {!selectedWellId && wells.length > 0 && (
        <UnifiedCard
          title='اختر بئراً'
          subtitle='لعرض تفاصيل التكاليف والتحليل الشامل'
          titleIcon={PieChart}
          fields={[{ label: 'الحالة', value: 'في انتظار الاختيار' }]}
        />
      )}

      {wells.length === 0 && (
        <UnifiedCard
          title='لا توجد بيانات'
          subtitle='لم يتم العثور على آبار'
          titleIcon={DollarSign}
          fields={[{ label: 'الحالة', value: 'لا توجد آبار للعرض' }]}
        />
      )}
    </div>
  );
}
