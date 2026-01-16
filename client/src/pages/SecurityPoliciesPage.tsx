import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, TrendingUp, AlertTriangle, ShieldAlert, ShieldCheck, Zap, Clock, Lock, 
  Eye, CheckCircle2, XCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter, STATUS_FILTER_OPTIONS, PRIORITY_OPTIONS } from "@/components/ui/unified-search-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SecurityPolicy {
  id: string;
  policyId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'inactive';
  complianceLevel: string;
  violationsCount: number;
  lastViolation?: string;
  createdAt: string;
  updatedAt: string;
}

interface PolicySuggestion {
  id: string;
  suggestedPolicyId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  createdAt: string;
}

interface PolicyViolation {
  violation: {
    id: string;
    violationId: string;
    violatedRule: string;
    severity: string;
    status: string;
    detectedAt: string;
  };
  policy: {
    id: string;
    title: string;
    category: string;
  };
}

export function SecurityPoliciesPage() {
  const [activeTab, setActiveTab] = useState("policies");
  
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset
  } = useUnifiedFilter({
    status: 'all',
    severity: 'all'
  });

  // جلب السياسات الأمنية
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ['/api/security/policies'],
    queryFn: async () => {
      const response = await fetch('/api/security/policies');
      if (!response.ok) throw new Error('فشل في جلب السياسات الأمنية');
      const result = await response.json();
      return (result.success ? result.data : result) as SecurityPolicy[];
    }
  });

  // جلب اقتراحات السياسات
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/security/suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/security/suggestions');
      if (!response.ok) throw new Error('فشل في جلب اقتراحات السياسات');
      const result = await response.json();
      return (result.success ? result.data : result) as PolicySuggestion[];
    }
  });

  // جلب انتهاكات السياسات
  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ['/api/security/violations'],
    queryFn: async () => {
      const response = await fetch('/api/security/violations');
      if (!response.ok) throw new Error('فشل في جلب انتهاكات السياسات');
      const result = await response.json();
      return (result.success ? result.data : result) as PolicyViolation[];
    }
  });

  const filteredPolicies = policies.filter(policy => 
    (policy.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchValue.toLowerCase())) &&
    (filterValues.status === 'all' || policy.status === filterValues.status) &&
    (filterValues.severity === 'all' || policy.severity === filterValues.severity)
  );

  const statsItems = [
    { title: 'مؤشر الأمان', value: '85%', icon: Zap, color: 'orange' as const },
    { title: 'السياسات النشطة', value: policies.filter(p => p.status === 'active').length, icon: ShieldCheck, color: 'green' as const },
    { title: 'انتهاكات حرجة', value: violations.filter(v => v.violation.severity === 'critical').length, icon: ShieldAlert, color: 'red' as const },
    { title: 'اقتراحات ذكية', value: suggestions.filter(s => s.status === 'pending').length, icon: TrendingUp, color: 'blue' as const }
  ];

  const chartData = [
    { name: 'الأحد', violations: 4 },
    { name: 'الاثنين', violations: 3 },
    { name: 'الثلاثاء', violations: 7 },
    { name: 'الأربعاء', violations: 5 },
    { name: 'الخميس', violations: 2 },
    { name: 'الجمعة', violations: 0 },
    { name: 'السبت', violations: 1 },
  ];

  const policyFilters = [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'active', label: 'نشط' },
        { value: 'draft', label: 'مسودة' },
        { value: 'inactive', label: 'غير نشط' }
      ]
    },
    {
      key: 'severity',
      label: 'المستوى',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'جميع المستويات' },
        { value: 'critical', label: 'حرج' },
        { value: 'high', label: 'عالي' },
        { value: 'medium', label: 'متوسط' },
        { value: 'low', label: 'منخفض' }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6" dir="rtl">
      {/* الإحصائيات الموحدة */}
      <UnifiedStats stats={statsItems} columns={4} hideHeader={true} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المحتوى الرئيسي */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <TabsList className="w-full sm:w-auto p-1 rounded-xl h-11">
                <TabsTrigger value="policies" className="rounded-lg px-6 h-9">السياسات</TabsTrigger>
                <TabsTrigger value="suggestions" className="rounded-lg px-6 h-9">الاقتراحات</TabsTrigger>
                <TabsTrigger value="violations" className="rounded-lg px-6 h-9">الانتهاكات</TabsTrigger>
              </TabsList>

              <UnifiedSearchFilter
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                searchPlaceholder="بحث في السياسات..."
                filters={activeTab === 'policies' ? policyFilters : []}
                filterValues={filterValues}
                onFilterChange={onFilterChange}
                onReset={onReset}
                className="w-full sm:w-80"
                showActiveFilters={true}
              />
            </div>

            <AnimatePresence mode="wait">
              <TabsContent value="policies" key="policies">
                <UnifiedCardGrid columns={2}>
                  {filteredPolicies.map((policy) => (
                    <motion.div
                      key={policy.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <UnifiedCard
                        title={policy.title}
                        subtitle={policy.policyId}
                        titleIcon={Shield}
                        headerColor={policy.status === 'active' ? '#10b981' : '#64748b'}
                        badges={[
                          { 
                            label: policy.severity === 'critical' ? 'حرج' : policy.severity === 'high' ? 'عالي' : 'متوسط',
                            variant: policy.severity === 'critical' ? 'destructive' : policy.severity === 'high' ? 'warning' : 'default'
                          },
                          {
                            label: policy.status === 'active' ? 'نشط' : 'مسودة',
                            variant: policy.status === 'active' ? 'success' : 'secondary'
                          }
                        ]}
                        fields={[
                          { label: 'الفئة', value: policy.category, icon: Lock },
                          { label: 'الانتهاكات', value: policy.violationsCount, icon: AlertTriangle, color: policy.violationsCount > 0 ? 'danger' : 'success' },
                          { label: 'آخر تحديث', value: new Date(policy.updatedAt).toLocaleDateString('ar'), icon: Clock, color: 'muted' }
                        ]}
                        actions={[
                          { icon: Eye, label: 'عرض التفاصيل', onClick: () => {} },
                          { icon: CheckCircle2, label: 'تفعيل', onClick: () => {}, hidden: policy.status === 'active' }
                        ]}
                      />
                    </motion.div>
                  ))}
                </UnifiedCardGrid>
              </TabsContent>

              <TabsContent value="suggestions" key="suggestions">
                <div className="space-y-4">
                  {suggestions.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <UnifiedCard
                        title={s.title}
                        subtitle={`اقتراح ذكي - ثقة ${s.confidence}%`}
                        titleIcon={Zap}
                        fields={[
                          { label: 'الوصف', value: s.description },
                          { label: 'الفئة', value: s.category, icon: Lock }
                        ]}
                        actions={[
                          { icon: CheckCircle2, label: 'تطبيق', onClick: () => {}, color: 'green' },
                          { icon: XCircle, label: 'رفض', onClick: () => {}, color: 'red' }
                        ]}
                      />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="violations" key="violations">
                <div className="space-y-4">
                  {violations.map((v) => (
                    <motion.div
                      key={v.violation.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <UnifiedCard
                        title={v.violation.violatedRule}
                        subtitle={`السياسة: ${v.policy?.title || 'غير محدد'}`}
                        titleIcon={ShieldAlert}
                        headerColor="#ef4444"
                        fields={[
                          { label: 'التوقيت', value: new Date(v.violation.detectedAt).toLocaleString('ar'), icon: Clock },
                          { label: 'المستوى', value: v.violation.severity, color: 'danger' }
                        ]}
                        actions={[
                          { icon: Eye, label: 'تحليل', onClick: () => {} }
                        ]}
                      />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* الجانب التحليلي */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                تحليل الانتهاكات الأسبوعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="violations" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" />
                آخر الانتهاكات
              </h3>
              <Button variant="link" className="text-xs">مشاهدة الكل</Button>
            </div>
            <div className="space-y-3">
              {violations.slice(0, 4).map((v) => (
                <div key={v.violation.id} className="p-4 bg-card rounded-xl border flex items-center gap-4 group cursor-pointer hover:border-destructive/30 transition-all">
                  <div className="p-2 bg-destructive/10 rounded-lg group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{v.violation.violatedRule}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(v.violation.detectedAt).toLocaleTimeString('ar')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
