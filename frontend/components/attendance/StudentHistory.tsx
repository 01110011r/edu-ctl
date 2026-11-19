// Usage: <StudentHistory response={attendanceMe} loading={loading} />
"use client";

import type { StudentAttendanceMeResponse } from "@/lib/types";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

interface StudentHistoryProps {
  response: StudentAttendanceMeResponse | null;
  loading: boolean;
}

export function StudentHistory({ response, loading }: StudentHistoryProps) {
  if (loading) return <TableSkeleton columns={4} />;

  if (!response) {
    return (
      <EmptyState
        title="Davomat ma'lumotlari topilmadi"
        description="Davomat tarixi hozircha mavjud emas."
      />
    );
  }

  const columns: DataTableColumn<StudentAttendanceMeResponse["history"][number]>[] =
    [
      {
        key: "date",
        header: "Sana",
        render: (item) => (
          <span className="font-medium">
            {new Date(`${item.date}T00:00:00`).toLocaleDateString("uz-UZ")}
          </span>
        ),
      },
      {
        key: "group_name",
        header: "Guruh",
        render: (item) => item.group_name,
      },
      {
        key: "time",
        header: "Vaqt",
        render: (item) => `${item.start_time}–${item.end_time}`,
      },
      {
        key: "status",
        header: "Holat",
        render: (item) => <StatusBadge status={item.status} />,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Keldi", response.summary.present, "success"],
          ["Kechikdi", response.summary.late, "warning"],
          ["Kelmadi", response.summary.absent, "danger"],
          ["Foiz", `${response.summary.percent}%`, "neutral"],
        ].map(([label, value, variant]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                variant === "success"
                  ? "text-success"
                  : variant === "warning"
                    ? "text-warning"
                    : variant === "danger"
                      ? "text-danger"
                      : "text-foreground"
              }`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={response.history}
        loading={false}
        emptyState={
          <EmptyState
            title="Davomat tarixi bo'sh"
            description="Hali davomat yozuvlari mavjud emas."
          />
        }
      />
    </div>
  );
}
