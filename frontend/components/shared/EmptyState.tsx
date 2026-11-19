// Usage: <EmptyState icon={Users} title="Ma'lumot yo'q" description="..." action={{label: "Qo'shish", onClick}} />
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  noSearchResults?: boolean;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  noSearchResults = false,
  children,
}: EmptyStateProps) {
  const Icon = icon ?? (noSearchResults ? SearchX : undefined);

  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      {Icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold leading-6 text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
      {action ? (
        <Button type="button" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
