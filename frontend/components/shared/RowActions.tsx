// Usage: <RowActions onEdit={() => edit(row)} onDelete={() => remove(row)} />
"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  disabled?: boolean;
}

export function RowActions({
  onEdit,
  onDelete,
  editLabel = "Tahrirlash",
  deleteLabel = "O'chirish",
  disabled = false,
}: RowActionsProps) {
  if (!onEdit && !onDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Amallar"
            disabled={disabled}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {onEdit ? (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            {editLabel}
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            {deleteLabel}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
