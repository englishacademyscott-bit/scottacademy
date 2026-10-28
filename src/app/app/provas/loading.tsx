import { Skeleton } from "@/components/ui/primitives";

export default function ProvasLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full rounded-xl sm:w-80" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-full rounded-lg sm:w-72" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl border border-subtle bg-surface p-6 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-full space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-9 w-full rounded-lg" />
              ))}
            </div>
            <div className="mt-auto flex gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
