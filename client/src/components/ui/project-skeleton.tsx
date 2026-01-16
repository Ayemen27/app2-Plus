import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </Card>
  );
}

export function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-gradient-to-l from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchToolbarSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2 bg-gradient-to-l from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl">
      <Skeleton className="h-9 flex-1 rounded-lg" />
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex items-center gap-1 ps-2 border-r border-gray-200 dark:border-gray-700 pe-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-2 p-2 animate-in fade-in duration-300">
      <StatsStripSkeleton />
      <SearchToolbarSkeleton />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
        {[...Array(8)].map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
