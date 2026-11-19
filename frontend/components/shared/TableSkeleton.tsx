// Usage: <TableSkeleton /> or <TableSkeleton columns={4} />
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({
  columns = 4,
  rows = 5,
}: TableSkeletonProps) {
  const columnCount = Math.max(columns, 1);

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount + 1}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columnCount + 1 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columnCount + 1}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columnCount + 1 }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className="h-4"
                style={{ width: columnIndex === 0 ? "70%" : "85%" }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="h-5 w-2/3" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: Math.max(columnCount - 1, 1) }).map(
                (_, columnIndex) => (
                  <div
                    key={columnIndex}
                    className="flex items-center justify-between gap-4"
                  >
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
