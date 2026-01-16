import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Calendar, Settings, Search, Filter, Trash2, Edit, MoreVertical, RefreshCw, Download, Eye, Lock, Unlock, Briefcase, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import type { StatsRowConfig, FilterConfig } from '@/components/ui/unified-filter-dashboard/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function UsersManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const { data: allUsers, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("/api/users", "GET");
      return res;
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest(`/api/users/${userId}/role`, "PATCH", { role });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "تم تحديث الصلاحيات",
        description: "تم تغيير دور المستخدم بنجاح.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "فشل التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center shadow-sm">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">إدارة المستخدمين</h1>
            <p className="text-sm font-medium text-slate-500">التحكم في مستويات الوصول وصلاحيات النظام</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl font-bold">
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث القائمة
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            قائمة المستخدمين المسجلين
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="text-right font-black">المستخدم</TableHead>
                <TableHead className="text-right font-black">البريد الإلكتروني</TableHead>
                <TableHead className="text-right font-black">الدور الحالي</TableHead>
                <TableHead className="text-right font-black">تغيير الصلاحية</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers?.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-bold py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-600 dark:text-slate-400">
                        {user.firstName?.[0]}
                      </div>
                      <span>{user.firstName} {user.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}
                      className="font-black rounded-lg px-3"
                    >
                      {user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير مشروع' : 'مستخدم (قراءة فقط)'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                      disabled={updateRoleMutation.isPending || user.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[200px] h-10 rounded-xl font-bold border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="admin" className="font-bold">مدير نظام</SelectItem>
                        <SelectItem value="manager" className="font-bold">مدير مشروع</SelectItem>
                        <SelectItem value="user" className="font-bold">مستخدم (قراءة فقط)</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">مدير نظام</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">صلاحية كاملة لجميع الأقسام والإعدادات.</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-purple-600 uppercase tracking-widest">مدير مشروع</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">إدارة العمليات اليومية والمشاريع المخصصة.</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-600/20">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest">مستخدم</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">صلاحية "قراءة فقط" لجميع مكونات التطبيق.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
