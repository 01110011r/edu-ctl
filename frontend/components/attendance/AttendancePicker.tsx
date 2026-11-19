// Usage: <AttendancePicker lessons={lessons} selectedLessonId=... date=... />
"use client";

import type { Lesson } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const weekdays = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];

interface AttendancePickerProps {
  lessons: Lesson[];
  selectedLessonId: number | null;
  date: string;
  onLessonChange: (lessonId: number) => void;
  onDateChange: (date: string) => void;
  warning?: string;
}

export function AttendancePicker({
  lessons,
  selectedLessonId,
  date,
  onLessonChange,
  onDateChange,
  warning,
}: AttendancePickerProps) {
  const selected = lessons.find((lesson) => lesson.id === selectedLessonId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Dars</Label>
          <Select
            value={selectedLessonId === null ? "" : String(selectedLessonId)}
            onValueChange={(value) =>
              value ? onLessonChange(Number(value)) : undefined
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {selected
                  ? `${selected.group_name} — ${weekdays[selected.weekday]} — ${selected.start_time}`
                  : "Darsni tanlang"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lessons.map((lesson) => (
                <SelectItem key={lesson.id} value={String(lesson.id)}>
                  {lesson.group_name} — {weekdays[lesson.weekday]} —{" "}
                  {lesson.start_time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="attendance-date">Sana</Label>
          <Input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-10"
          />
        </div>
      </div>
      {warning ? (
        <p role="alert" className="mt-3 text-sm text-warning">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
