"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormModal } from "@/components/shared/FormModal";
import type { Group, Lesson } from "@/lib/types";
import type { LessonInput } from "@/hooks/useLessons";

const weekdays = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

interface LessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  groups: Group[];
  loading: boolean;
  serverError: string;
  onSubmit: (values: LessonInput) => void | Promise<void>;
  onDelete?: (lesson: Lesson) => void;
}

export function LessonForm({
  open,
  onOpenChange,
  lesson,
  groups,
  loading,
  serverError,
  onSubmit,
  onDelete,
}: LessonFormProps) {
  const [groupId, setGroupId] = useState("");
  const [weekday, setWeekday] = useState("0");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setGroupId(lesson ? String(lesson.group_id) : "");
    setWeekday(String(lesson?.weekday ?? 0));
    setStartTime(lesson?.start_time ?? "09:00");
    setEndTime(lesson?.end_time ?? "10:00");
    setRoom(lesson?.room ?? "");
    setErrors({});
  }, [open, lesson]);

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!groupId) nextErrors.group = "Guruhni tanlang";
    if (!startTime) nextErrors.start = "Boshlanish vaqtini kiriting";
    if (!endTime) nextErrors.end = "Tugash vaqtini kiriting";
    if (startTime && endTime && endTime <= startTime) {
      nextErrors.end = "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak";
    }
    if (!room.trim()) nextErrors.room = "Xona majburiy";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      group_id: Number(groupId),
      weekday: Number(weekday),
      start_time: startTime,
      end_time: endTime,
      room: room.trim(),
    });
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={lesson ? "Darsni tahrirlash" : "Yangi dars"}
      description="Dars vaqti va xonasini belgilang"
      submitLabel={lesson ? "Saqlash" : "Qo'shish"}
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Guruh</Label>
          <Select value={groupId} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {groups.find((group) => String(group.id) === groupId)?.name ??
                  "Guruhni tanlang"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.group ? (
            <p className="text-xs text-danger">{errors.group}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Kun</Label>
          <Select value={weekday} onValueChange={(value) => setWeekday(value ?? "0")}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue>{weekdays[Number(weekday)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {weekdays.map((day, index) => (
                <SelectItem key={day} value={String(index)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="lesson-start">Boshlanish</Label>
            <Input
              id="lesson-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={loading}
            />
            {errors.start ? (
              <p className="text-xs text-danger">{errors.start}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-end">Tugash</Label>
            <Input
              id="lesson-end"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={loading}
              aria-invalid={Boolean(errors.end || serverError)}
            />
            {errors.end ? (
              <p className="text-xs text-danger">{errors.end}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson-room">Xona</Label>
          <Input
            id="lesson-room"
            value={room}
            onChange={(event) => setRoom(event.target.value)}
            disabled={loading}
            aria-invalid={Boolean(errors.room || serverError)}
          />
          {errors.room ? (
            <p className="text-xs text-danger">{errors.room}</p>
          ) : null}
        </div>

        {serverError ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {serverError}
          </p>
        ) : null}

        {lesson && onDelete ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(lesson)}
            disabled={loading}
          >
            <Trash2 />
            Darsni o'chirish
          </Button>
        ) : null}
      </div>
    </FormModal>
  );
}
