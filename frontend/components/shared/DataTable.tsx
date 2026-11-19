// Usage: <DataTable columns={[...]} rows={rows} loading={loading} emptyState={<EmptyState ... />} />
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./TableSkeleton";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyState: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyState,
  onRowClick,
  rowActions,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
              {rowActions ? <TableHead className="w-12 text-right">Amallar</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
                {rowActions ? (
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {rowActions(row)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row, rowIndex) => {
          const firstColumn = columns[0];
          const visibleColumns = columns.slice(1).filter(
            (column) => !column.hideOnMobile
          );

          return (
            <div
              key={rowIndex}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={`relative rounded-xl border border-border bg-card p-4 shadow-sm ${
                onRowClick ? "cursor-pointer" : ""
              }`}
            >
              {rowActions ? (
                <div
                  className="absolute right-3 top-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  {rowActions(row)}
                </div>
              ) : null}
              {firstColumn ? (
                <div className="pr-12 text-base font-semibold leading-6 text-foreground">
                  {firstColumn.render(row)}
                </div>
              ) : null}
              {visibleColumns.length ? (
                <dl className="mt-3 space-y-2">
                  {visibleColumns.map((column) => (
                    <div
                      key={column.key}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <dt className="shrink-0 text-muted-foreground">
                        {column.header}
                      </dt>
                      <dd className="text-right font-medium text-foreground">
                        {column.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
