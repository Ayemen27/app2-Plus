import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { User, Clock, DollarSign, FileText, Calendar, Activity, AlertCircle, CheckCircle, Timer, Calculator, MessageSquare, Banknote, TrendingUp, Target, Users, Briefcase, Hammer, Wrench, Paintbrush, Grid3X3, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Worker } from "@shared/schema";


interface AttendanceData {
  isPresent: boolean;
  startTime?: string;
  endTime?: string;
  workDescription?: string;
  workDays?: number;
  paidAmount?: string;
  paymentType?: string;
  hoursWorked?: number;
  overtime?: number;
  overtimeRate?: number;
  actualWage?: number;
  totalPay?: number;
  remainingAmount?: number;
  notes?: string;
  recordType?: "work" | "advance";
}

interface EnhancedWorkerCardProps {
  worker: Worker;
  attendance: AttendanceData;
  onAttendanceChange: (attendance: AttendanceData) => void;
  selectedDate?: string;
}

export default function EnhancedWorkerCard({
  worker,
  attendance,
  onAttendanceChange,
  selectedDate = getCurrentDate()
}: EnhancedWorkerCardProps) {
  const [localAttendance, setLocalAttendance] = useState<AttendanceData>(attendance);
  const [showDetails, setShowDetails] = useState(false);
  const [recordType, setRecordType] = useState<"work" | "advance">(attendance.recordType || "work");

  const { data: workerStats } = useQuery({
    queryKey: ["/api/workers", worker.id, "stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/workers/${worker.id}/stats`, "GET");
        if (response && response.data) {
          return response.data;
        }
        return response || { totalWorkDays: 0, totalProjects: 0, totalEarnings: 0 };
      } catch (error) {
        console.error("Error fetching worker stats:", error);
        return { totalWorkDays: 0, totalProjects: 0, totalEarnings: 0 };
      }
    },
    staleTime: 30000
  });

  const isPresentToday = localAttendance.isPresent && selectedDate === getCurrentDate();

  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  const updateAttendance = (updates: Partial<AttendanceData>) => {
    const newAttendance = { ...localAttendance, ...updates };
    
    if (newAttendance.isPresent && (
      updates.workDays !== undefined || 
      updates.paidAmount !== undefined ||
      updates.overtime !== undefined ||
      updates.overtimeRate !== undefined
    )) {
      newAttendance.actualWage = calculateBaseWage();
      newAttendance.totalPay = calculateTotalPay();
      newAttendance.remainingAmount = calculateRemainingAmount();
      newAttendance.hoursWorked = calculateWorkingHours();
    }
    
    setLocalAttendance(newAttendance);
    onAttendanceChange(newAttendance);
  };

  const handleAttendanceToggle = (checked: boolean | "indeterminate") => {
    const isPresent = checked === true;
    if (!isPresent) {
      setShowDetails(false);
    }

    if (isPresent && recordType === "work") {
      updateAttendance({
        isPresent: isPresent,
        startTime: localAttendance.startTime || "07:00",
        endTime: localAttendance.endTime || "15:00",
        workDescription: localAttendance.workDescription,
        workDays: localAttendance.workDays === undefined ? 0 : localAttendance.workDays,
        paidAmount: localAttendance.paidAmount,
        paymentType: localAttendance.paymentType || "partial",
      });
    } else if (isPresent && recordType === "advance") {
      updateAttendance({
        isPresent: isPresent,
        workDays: 0,
        paidAmount: localAttendance.paidAmount || "0",
        paymentType: "advance",
        startTime: undefined,
        endTime: undefined,
      });
    } else {
      updateAttendance({ isPresent: isPresent });
    }
  };

  const calculateWorkingHours = () => {
    if (!localAttendance.startTime || !localAttendance.endTime) return 0;
    const start = new Date(`2000-01-01T${localAttendance.startTime}:00`);
    const end = new Date(`2000-01-01T${localAttendance.endTime}:00`);
    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000;
    }
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  };

  const calculateBaseWage = () => {
    if (!localAttendance.isPresent) return 0;
    if (recordType === "advance") return 0;
    const workDays = localAttendance.workDays || 0;
    // Ensure we handle both numeric and string dailyWage values correctly
    const dailyWage = parseFloat(String(worker.dailyWage || "0"));
    return Math.max(0, dailyWage * workDays);
  };

  const calculateOvertimePay = () => {
    const overtime = localAttendance.overtime || 0;
    const overtimeRate = localAttendance.overtimeRate || 0;
    return overtime * overtimeRate;
  };

  const calculateTotalPay = () => {
    const baseWage = calculateBaseWage();
    const overtimePay = calculateOvertimePay();
    return Math.max(0, baseWage + overtimePay);
  };

  const calculateRemainingAmount = () => {
    if (recordType === "advance") {
      const advanceAmount = parseFloat(localAttendance.paidAmount || "0");
      return -advanceAmount;
    }
    const totalPay = calculateTotalPay();
    const paidAmount = parseFloat(localAttendance.paidAmount || "0");
    const remaining = totalPay - paidAmount;
    return remaining;
  };

  const getProfessionIcon = (profession: string) => {
    switch (profession) {
      case "معلم": return <Users className="h-5 w-5" />;
      case "حداد": return <Hammer className="h-5 w-5" />;
      case "بلاط": return <Grid3X3 className="h-5 w-5" />;
      case "دهان": return <Paintbrush className="h-5 w-5" />;
      case "عامل": return <Wrench className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getProfessionColor = (profession: string) => {
    const p = profession.toLowerCase();
    if (p.includes("معلم") || p.includes("master")) return "bg-gradient-to-br from-primary to-primary/80";
    if (p.includes("حداد") || p.includes("smith")) return "bg-gradient-to-br from-orange-500 to-orange-600";
    if (p.includes("بلاط") || p.includes("tile")) return "bg-gradient-to-br from-blue-500 to-blue-600";
    if (p.includes("دهان") || p.includes("paint")) return "bg-gradient-to-br from-green-500 to-green-600";
    if (p.includes("عامل") || p.includes("labor")) return "bg-gradient-to-br from-purple-500 to-purple-600";
    if (p.includes("نجار") || p.includes("carpenter")) return "bg-gradient-to-br from-amber-600 to-amber-700";
    if (p.includes("كهربائي") || p.includes("electric")) return "bg-gradient-to-br from-yellow-500 to-yellow-600";
    if (p.includes("سباك") || p.includes("plumb")) return "bg-gradient-to-br from-cyan-500 to-cyan-600";
    return "bg-gradient-to-br from-gray-500 to-gray-600";
  };

  return (
    <Card className={`mb-3 shadow-sm border-r-4 w-full max-w-full overflow-hidden ${
      isPresentToday
        ? "border-r-green-400 bg-green-50/50 dark:bg-green-950/20"
        : "border-r-primary/20"
    }`} data-testid={`worker-card-detailed-${worker.id}`}>
      <CardContent className="p-2 sm:p-3 max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30 w-full max-w-full">
          <div className="flex items-center space-x-reverse space-x-2 flex-1 min-w-0 max-w-full overflow-hidden">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md profession-icon-container ${getProfessionColor(worker.type)}`}>
              {getProfessionIcon(worker.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-reverse space-x-2 mb-1">
                <h4 className="font-bold text-lg text-foreground truncate" data-testid={`worker-name-detailed-${worker.id}`}>{worker.name}</h4>
                {worker.isActive ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" data-testid={`worker-status-active-${worker.id}`} />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" data-testid={`worker-status-inactive-${worker.id}`} />
                )}
              </div>
              <div className="flex items-center space-x-reverse space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center space-x-reverse space-x-1">
                  <Badge variant="secondary" className={`${getProfessionColor(worker.type)} text-white border-none shadow-sm text-[10px] px-2 py-0 h-5`}>
                    {worker.type}
                  </Badge>
                </span>
                <span className="flex items-center space-x-reverse space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-bold arabic-numbers" data-testid={`worker-daily-wage-${worker.id}`}>
                    {formatCurrency(worker.dailyWage)}
                  </span>
                </span>
                <span className="flex items-center space-x-reverse space-x-1">
                  <Activity className="h-3 w-3" />
                  <span className="arabic-numbers">
                    {workerStats?.totalWorkDays || 0} يوم
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-reverse space-x-2 flex-shrink-0">
            {localAttendance.isPresent && (
              <>
                <Button
                  variant={recordType === "work" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecordType("work")}
                  className="px-2 py-1 h-8 text-xs"
                  data-testid={`record-type-work-${worker.id}`}
                >
                  عمل
                </Button>
                <Button
                  variant={recordType === "advance" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecordType("advance")}
                  className="px-2 py-1 h-8 text-xs"
                  data-testid={`record-type-advance-${worker.id}`}
                >
                  سحب
                </Button>
                <Button
                  variant={showDetails ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-2 py-1 h-8 flex items-center gap-1"
                  data-testid={`toggle-details-${worker.id}`}
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="text-xs">{showDetails ? "إخفاء" : "تفاصيل"}</span>
                </Button>
              </>
            )}
            <Label htmlFor={`present-${worker.id}`} className="text-sm font-medium text-foreground cursor-pointer">
              حاضر
            </Label>
            <Checkbox
              id={`present-${worker.id}`}
              checked={localAttendance.isPresent}
              onCheckedChange={handleAttendanceToggle}
              className="w-5 h-5"
              data-testid={`attendance-checkbox-${worker.id}`}
            />
          </div>
        </div>

        {localAttendance.isPresent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">الاسم</span>
                  <span className="font-bold text-foreground">{worker.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">الأجر اليومي</span>
                  <span className="font-bold text-foreground arabic-numbers">{formatCurrency(worker.dailyWage || "0")}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-muted-foreground font-medium">المستحق</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 arabic-numbers">{formatCurrency(calculateBaseWage())}</span>
                </div>
              </div>
            </div>

            <div className={`bg-gradient-to-br ${recordType === "advance" ? "from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800" : "from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800"} p-2 rounded-lg border`}>
              <div className="space-y-1.5 text-sm">
                {recordType === "work" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">عدد الأيام</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        max="10.0"
                        value={localAttendance.workDays || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateAttendance({ workDays: value === "" ? 0 : parseFloat(value) || 0 });
                        }}
                        placeholder="0"
                        className="w-24 text-center text-sm h-7 english-numbers"
                        style={{ direction: 'ltr', unicodeBidi: 'embed' }}
                        data-testid={`work-days-summary-${worker.id}`}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">المدفوع</span>
                      <span className="font-bold text-foreground arabic-numbers">{formatCurrency(parseFloat(localAttendance.paidAmount || "0"))}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-muted-foreground font-medium">المتبقي</span>
                      <span className={`font-bold arabic-numbers ${
                        calculateRemainingAmount() > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>{formatCurrency(Math.abs(calculateRemainingAmount()))}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">المبلغ المسحوب</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        placeholder="0"
                        value={localAttendance.paidAmount || ""}
                        onChange={(e) => updateAttendance({ paidAmount: e.target.value })}
                        className="w-24 text-center arabic-numbers text-sm h-7"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-red-200 dark:border-red-700">
                      <span className="text-muted-foreground font-medium">الدين</span>
                      <span className="font-bold text-red-600 dark:text-red-400 arabic-numbers">{formatCurrency(Math.abs(calculateRemainingAmount()))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {localAttendance.isPresent && showDetails && (
          <div className="space-y-2 w-full max-w-full overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 p-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-full overflow-hidden">
              <div className="flex items-center space-x-reverse space-x-2 mb-2">
                <Clock className="h-4 w-4 text-slate-600" />
                <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">تفاصيل العمل والدفع</h5>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">من</Label>
                  <Input
                    type="time"
                    value={localAttendance.startTime || "07:00"}
                    onChange={(e) => updateAttendance({ startTime: e.target.value })}
                    className="text-center font-mono text-xs h-8 px-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">إلى</Label>
                  <Input
                    type="time"
                    value={localAttendance.endTime || "15:00"}
                    onChange={(e) => updateAttendance({ endTime: e.target.value })}
                    className="text-center font-mono text-xs h-8 px-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">أيام</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max="2.0"
                    value={localAttendance.workDays || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateAttendance({ workDays: value === "" ? 0 : parseFloat(value) || 0 });
                    }}
                    placeholder="0"
                    className="text-center font-mono english-numbers text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">المدفوع</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={localAttendance.paidAmount || ""}
                    onChange={(e) => updateAttendance({ paidAmount: e.target.value })}
                    className="text-center arabic-numbers text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">ساعات</Label>
                  <div className="h-8 px-2 py-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-md flex items-center justify-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300 arabic-numbers text-sm">
                      {calculateWorkingHours().toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">ساعات إضافية</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    max="8"
                    value={localAttendance.overtime === undefined ? "" : localAttendance.overtime}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateAttendance({ overtime: value === "" ? 0 : parseFloat(value) || 0 });
                    }}
                    placeholder="0"
                    className="text-center english-numbers text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">معدل الساعة</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={localAttendance.overtimeRate === undefined ? "" : localAttendance.overtimeRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateAttendance({ overtimeRate: value === "" ? 0 : parseFloat(value) || 0 });
                    }}
                    className="text-center english-numbers text-sm h-8"
                  />
                </div>
              </div>

              <div className="space-y-1 mb-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">وصف العمل</Label>
                <AutocompleteInput
                  value={localAttendance.workDescription || ""}
                  onChange={(value) => updateAttendance({ workDescription: value })}
                  placeholder="اكتب وصف العمل المنجز..."
                  category="workDescriptions"
                  className="w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">الملاحظات</Label>
                  <Input
                    type="text"
                    value={localAttendance.notes || ""}
                    onChange={(e) => updateAttendance({ notes: e.target.value })}
                    placeholder="أضف ملاحظات..."
                    className="text-sm h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">إجمالي الدفع المطلوب</Label>
                  <div className="h-8 px-2 py-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-md flex items-center justify-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200 arabic-numbers text-sm">
                      {formatCurrency(calculateTotalPay())}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">الوقت الإضافي</Label>
                  <div className="h-8 px-2 py-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-md flex items-center justify-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300 arabic-numbers text-sm">
                      {formatCurrency(calculateOvertimePay())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}