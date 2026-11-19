// Usage: <LessonCard lesson={lesson} isAdmin onClick={...} />
"use client";

import type { Lesson } from "@/lib/types";
import { cn } from "cn";

interface LessonCardProps {
  lesson: Lesson;
  isAdmin?: boolean;
  onClick?: (lesson: Lesson) => void;
  compact?: boolean;
}

const palette = [
  "border-indigo-200 bg-indigo-50 text-indigo-950",
  "border-emerald-200 bg-emerald-50 text-emerald-950",
  "border-amber-200 bg-amber-50 text-amber-950",
  "border-sky-200 bg-sky-50 text-sky-950",
  "border-rose-200 bg-rose-50 text-rose-950",
];

export function LessonCard({
  lesson,
  isAdmin = false,
  onClick,
  compact = false,
}: LessonCardProps) {
  const color = palette[Math.abs(lesson.group_id) % palette.length];

  return (
    <button
      type="button"
      disabled={!isAdmin}
      onClick={() => onClick?.(lesson)}
      className={cn(
        "w-full rounded-lg border p-3 text-left shadow-sm",
        color,
        isAdmin && "cursor-pointer transition-shadow hover:shadow-md",
        !isAdmin && "cursor-default",
        compact ? "min-h-24" : "h-[68px] overflow-hidden"
      )}
    >
      <p className="truncate text-sm font-semibold">{lesson.group_name}</p>
      <p className="mt-1 text-xs opacity-75">
        {lesson.start_time}–{lesson.end_time}
      </p>
      {!compact ? (
        <>
          <p className="mt-1 truncate text-xs opacity-75">{lesson.room}</p>
          <p className="mt-1 truncate text-xs opacity-75">
            {lesson.teacher_name}
          </p>
        </>
      ) : (
        <div className="mt-2 space-y-1 text-xs opacity-75">
          <p>{lesson.room}</p>
          <p className="truncate">{lesson.teacher_name}</p>
        </div>
      )}
    </button>
  );
}
