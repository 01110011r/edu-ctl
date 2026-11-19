// Usage: <AttendanceSheet items={items} editable={true} statuses={...} onChange={...} />
"use client";

import type { AttendanceItem, AttendanceStatus } from "@/lib/types";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface AttendanceSheetProps {
  items: AttendanceItem[];
  editable: boolean;
  statuses?: Record<number, AttendanceStatus | null>;
  onChange?: (studentId: number, status: AttendanceStatus) => void;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AttendanceSheet({
  items,
  editable,
  statuses,
  onChange,
}: AttendanceSheetProps) {
  const options: Array<{
    value: AttendanceStatus;
    label: string;
    active: string;
  }> = [
    {
      value: "present",
      label: "Keldi",
      active: "border-success bg-success text-white",
    },
    {
      value: "late",
      label: "Kechikdi",
      active: "border-warning bg-warning text-white",
    },
    {
      value: "absent",
      label: "Kelmadi",
      active: "border-danger bg-danger text-white",
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = statuses?.[item.student_id] ?? item.status;
        return (
          <div
            key={item.student_id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials(item.student_name)}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {item.student_name}
                </p>
                {status === null ? (
                  <span className="mt-1 inline-flex text-xs text-muted-foreground">
                    Belgilanmagan
                  </span>
                ) : null}
              </div>
            </div>

            {editable ? (
              <div
                role="group"
                aria-label={`${item.student_name} uchun davomat`}
                className="grid grid-cols-3 gap-1"
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onChange?.(item.student_id, option.value)
                    }
                    className={`min-h-11 rounded-lg border px-2 text-xs font-medium sm:min-h-9 sm:px-3 ${
                      status === option.value
                        ? option.active
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : status ? (
              <StatusBadge status={status} />
            ) : (
              <StatusBadge variant="neutral">Belgilanmagan</StatusBadge>
            )}
          </div>
        );
      })}
    </div>
  );
}
