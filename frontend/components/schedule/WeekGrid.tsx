// Usage: <WeekGrid lessons={lessons} isAdmin onLessonClick={...} />
"use client";

import type { Lesson } from "@/lib/types";
import { LessonCard } from "./LessonCard";

const weekdays = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
] as const;

interface WeekGridProps {
  lessons: Lesson[];
  isAdmin: boolean;
  onLessonClick?: (lesson: Lesson) => void;
}

function minutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + (mins || 0);
}

export function WeekGrid({
  lessons,
  isAdmin,
  onLessonClick,
}: WeekGridProps) {
  const today = new Date();
  const jsDay = today.getDay();
  const todayWeekday = jsDay === 0 ? 6 : jsDay - 1;
  const startHour = 8;
  const endHour = 20;
  const rowHeight = 52;
  const gridHeight = (endHour - startHour) * rowHeight;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[64px_repeat(6,minmax(140px,1fr))] border-b border-border">
          <div className="h-12" />
          {weekdays.map((day, index) => (
            <div
              key={day}
              className={`flex h-12 items-center justify-center border-l border-border text-sm font-semibold ${
                index === todayWeekday
                  ? "bg-primary/5 text-primary"
                  : "text-foreground"
              }`}
            >
              {day}
              {index === todayWeekday ? (
                <span className="ml-2 size-1.5 rounded-full bg-primary" />
              ) : null}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-[64px_repeat(6,minmax(140px,1fr))]"
          style={{ height: gridHeight }}
        >
          <div className="relative border-r border-border">
            {Array.from({ length: endHour - startHour + 1 }).map((_, index) => (
              <div
                key={index}
                className="absolute right-3 -translate-y-1/2 text-xs text-muted-foreground"
                style={{ top: index * rowHeight }}
              >
                {String(startHour + index).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {weekdays.map((day, weekday) => (
            <div
              key={day}
              className={`relative border-r border-border ${
                weekday === todayWeekday ? "bg-primary/[0.025]" : ""
              }`}
            >
              {Array.from({ length: endHour - startHour }).map((_, index) => (
                <div
                  key={index}
                  className="absolute inset-x-0 border-t border-border"
                  style={{ top: index * rowHeight }}
                />
              ))}
              {lessons
                .filter((lesson) => lesson.weekday === weekday)
                .map((lesson) => {
                  const top =
                    ((minutes(lesson.start_time) - startHour * 60) / 60) *
                    rowHeight;
                  const height = Math.max(
                    ((minutes(lesson.end_time) - minutes(lesson.start_time)) /
                      60) *
                      rowHeight -
                      4,
                    44
                  );
                  if (top < 0 || top > gridHeight) return null;
                  return (
                    <div
                      key={lesson.id}
                      className="absolute inset-x-2 z-10"
                      style={{
                        top: Math.max(top + 2, 2),
                        height: Math.min(height, gridHeight - top - 4),
                      }}
                    >
                      <LessonCard
                        lesson={lesson}
                        isAdmin={isAdmin}
                        onClick={onLessonClick}
                      />
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
