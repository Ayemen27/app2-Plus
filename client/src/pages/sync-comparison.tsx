import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle, Database, Table2, ChevronDown, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { getDB } from '@/offline/db';

interface TableComparison {
  tableName: string;
  serverCount: number;
  localCount: number;
  difference: number;
  isSynced: boolean;
  columns: string[];
  status: 'synced' | 'missing' | 'partial';
}

export default function SyncComparisonPage() {
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<TableComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [totalLocalRecords, setTotalLocalRecords] = useState(0);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'unsynced'>('all');

  const loadComparison = async () => {
    setIsLoading(true);
    try {
      // جلب بيانات الخادم الكاملة
      const serverResponse = await apiRequest('/api/sync/compare', 'GET');
      const { stats, tableDetails, tables } = serverResponse.data;

      // جلب بيانات IndexedDB
      const db = await getDB();
      const localData: Record<string, number> = {};

      for (const tableName of tables || Object.keys(stats || {})) {
        try {
          const records = await db.getAll(tableName);
          localData[tableName] = records.length;
        } catch (err) {
          localData[tableName] = 0;
        }
      }

      // المقارنة الشاملة
      const results: TableComparison[] = [];
      let totalServer = 0;
      let totalLocal = 0;

      for (const tableName of tables || Object.keys(stats || {})) {
        const serverCount = (stats?.[tableName] as number) || 0;
        const localCount = localData[tableName] || 0;
        const columns = tableDetails?.[tableName]?.columns || [];
        
        totalServer += serverCount;
        totalLocal += localCount;

        let status: 'synced' | 'missing' | 'partial' = 'synced';
        if (serverCount === 0 && localCount === 0) status = 'synced';
        else if (localCount === 0) status = 'missing';
        else if (serverCount !== localCount) status = 'partial';

        results.push({
          tableName,
          serverCount,
          localCount,
          difference: Math.abs(serverCount - localCount),
          isSynced: serverCount === localCount,
          columns,
          status,
        });
      }

      results.sort((a, b) => {
        // الجداول غير المتزامنة أولاً
        if (a.isSynced !== b.isSynced) return a.isSynced ? 1 : -1;
        // ثم حسب الفرق
        return b.difference - a.difference;
      });

      setComparisons(results);
      setTotalServerRecords(totalServer);
      setTotalLocalRecords(totalLocal);

      toast({
        title: 'تم المقارنة بنجاح',
        description: `${results.length} جدول | الخادم: ${totalServer} | المحلي: ${totalLocal}`,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في المقارنة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, []);

  const filtered = comparisons.filter(c => {
    const matchesSearch = c.tableName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'synced' ? c.isSynced : !c.isSynced);
    return matchesSearch && matchesFilter;
  });

  const unsyncedCount = comparisons.filter(c => !c.isSynced).length;
  const totalDifference = comparisons.reduce((sum, c) => sum + c.difference, 0);
  const syncPercentage = comparisons.length > 0 ? ((comparisons.length - unsyncedCount) / comparisons.length * 100).toFixed(1) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="sync-comparison-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="w-8 h-8" />
          مقارنة شاملة للمزامنة
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">مقارنة 66 جدول بين قاعدة البيانات المحلية والخادم</p>
      </div>

      {/* الملخص الإحصائي */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الجداول الكلية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{comparisons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">سجلات الخادم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalServerRecords.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">السجلات المحلية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalLocalRecords.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">نسبة التزامن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${syncPercentage === '100' ? 'text-green-600' : 'text-yellow-600'}`}>
              {syncPercentage}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">غير متزامن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${unsyncedCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {unsyncedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الفلاتر والبحث */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="ابحث عن جدول..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
          data-testid="input-search-table"
        />
        <div className="flex gap-2">
          {(['all', 'synced', 'unsynced'] as const).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
              data-testid={`button-filter-${status}`}
            >
              {status === 'all' ? 'الكل' : status === 'synced' ? 'متزامن' : 'غير متزامن'}
            </Button>
          ))}
        </div>
        <Button
          onClick={loadComparison}
          disabled={isLoading}
          data-testid="button-refresh-comparison"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'جاري...' : 'تحديث'}
        </Button>
      </div>

      {/* قائمة الجداول */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5" />
            تفاصيل الجداول ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" data-testid="sync-comparison-table">
            {filtered.map(comp => (
              <div
                key={comp.tableName}
                className={`border rounded-lg p-4 cursor-pointer transition ${
                  comp.isSynced
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
                data-testid={`table-row-${comp.tableName}`}
                onClick={() => setExpandedTable(expandedTable === comp.tableName ? null : comp.tableName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {expandedTable === comp.tableName ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <div>
                      <h3 className="font-semibold">{comp.tableName}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {comp.columns.length} عمود
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold">خادم: {comp.serverCount}</div>
                      <div className="text-sm">محلي: {comp.localCount}</div>
                    </div>
                    {comp.isSynced ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        <span className="text-xs font-bold text-red-600">-{comp.difference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {expandedTable === comp.tableName && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">الأعمدة ({comp.columns.length}):</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {comp.columns.map(col => (
                          <div
                            key={col}
                            className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"
                          >
                            {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ملخص النتائج */}
      {totalDifference > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ملخص الاختلافات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">إجمالي السجلات المختلفة:</span>
              <span className="float-right text-lg font-bold text-red-600">{totalDifference}</span>
            </div>
            <div>
              <span className="font-semibold">الجداول المتأثرة:</span>
              <span className="float-right text-lg font-bold">{unsyncedCount}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 pt-2">
              اضغط على أي جدول لعرض تفاصيل الأعمدة والبيانات الكاملة.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
