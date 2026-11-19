// Usage: <DayList lessons={dayLessons} isAdmin onLessonClick={...} />
"use client";

import type { Lesson } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { LessonCard } from "./LessonCard";

interface DayListProps {
  lessons: Lesson[];
  isAdmin: boolean;
  onLessonClick?: (lesson: Lesson) => void;
  onAdd?: () => void;
}

export function DayList({
  lessons,
  isAdmin,
  onLessonClick,
  onAdd,
}: DayListProps) {
  if (lessons.length === 0) {
    return (
      <EmptyState
        title="Bu kunda dars yo'q"
        description="Tanlangan kunda darslar rejalashtirilmagan."
        action={
          isAdmin && onAdd
            ? { label: "Dars qo'shish", onClick: onAdd }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          isAdmin={isAdmin}
          compact
          onClick={onLessonClick}
        />
      ))}
    </div>
  );
}
