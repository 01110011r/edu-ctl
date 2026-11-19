// Usage: <PageHeader title="Ustozlar" action={{ label: "Ustoz qo'shish", icon: <Plus />, onClick }} />
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold leading-8 text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Button
          type="button"
          size="lg"
          onClick={action.onClick}
          disabled={action.disabled}
          className="w-full sm:w-auto"
        >
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
