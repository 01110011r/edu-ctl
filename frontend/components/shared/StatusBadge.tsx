// Usage: <StatusBadge status="present" /> or <StatusBadge variant="success">Faol</StatusBadge>
import type { ReactNode } from "react";
import { cn } from "cn";
import type { AttendanceStatus } from "@/lib/types";

type StatusVariant =
  | "present"
  | "late"
  | "absent"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

interface StatusBadgeProps {
  status?: AttendanceStatus;
  variant?: StatusVariant;
  children?: ReactNode;
  className?: string;
}

const labels: Record<StatusVariant, string> = {
  present: "Keldi",
  late: "Kechikdi",
  absent: "Kelmagan",
  success: "Muvaffaqiyatli",
  warning: "Ogohlantirish",
  danger: "Xatolik",
  neutral: "Neytral",
};

const styles: Record<StatusVariant, string> = {
  present: "border-transparent bg-success/10 text-success",
  late: "border-transparent bg-warning/10 text-warning",
  absent: "border-transparent bg-danger/10 text-danger",
  success: "border-transparent bg-success/10 text-success",
  warning: "border-transparent bg-warning/10 text-warning",
  danger: "border-transparent bg-danger/10 text-danger",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  variant,
  children,
  className,
}: StatusBadgeProps) {
  const resolved = variant ?? status ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium",
        styles[resolved],
        className
      )}
    >
      {children ?? labels[resolved]}
    </span>
  );
}
