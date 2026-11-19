"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import type { Lesson } from "@/lib/types";
import { useLessons } from "@/hooks/useLessons";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { DayList } from "@/components/schedule/DayList";
import { LessonForm } from "@/components/schedule/LessonForm";
import { WeekGrid } from "@/components/schedule/WeekGrid";
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
] as const;

function getTodayWeekday() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 0 : jsDay - 1;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const {
    lessons,
    groups,
    loading,
    error,
    groupId,
    setGroupId,
    create,
    update,
    remove,
  } = useLessons();

  const [selectedDay, setSelectedDay] = useState(getTodayWeekday);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  function openCreate(weekday = selectedDay) {
    if (!isAdmin) return;
    setSelectedLesson({
      id: 0,
      group_id: 0,
      group_name: "",
      teacher_name: "",
      weekday,
      start_time: "09:00",
      end_time: "10:00",
      room: "",
    });
    setServerError("");
    setFormOpen(true);
  }

  function openEdit(lesson: Lesson) {
    if (!isAdmin) return;
    setSelectedLesson(lesson);
    setServerError("");
    setFormOpen(true);
  }

  function openDelete(lesson: Lesson) {
    setLessonToDelete(lesson);
    setDeleteOpen(true);
  }

  async function handleSubmit(values: {
    group_id: number;
    weekday: number;
    start_time: string;
    end_time: string;
    room: string;
  }) {
    setFormLoading(true);
    setServerError("");
    const requestError =
      selectedLesson && selectedLesson.id !== 0
        ? await update(selectedLesson.id, values)
        : await create(values);
    setFormLoading(false);

    if (requestError) {
      if (
        requestError instanceof ApiError &&
        requestError.status === 409
      ) {
        setServerError(requestError.message);
      } else if (requestError.message.toLowerCase().includes("conflict")) {
        setServerError(requestError.message);
      }
      toast.error(requestError.message);
      return;
    }

    setFormOpen(false);
    setSelectedLesson(null);
    toast.success(
      selectedLesson && selectedLesson.id !== 0
        ? "Dars ma'lumotlari saqlandi"
        : "Dars muvaffaqiyatli qo'shildi"
    );
  }

  async function handleDelete() {
    if (!lessonToDelete) return;
    setDeleteLoading(true);
    const requestError = await remove(lessonToDelete.id);
    setDeleteLoading(false);

    if (requestError) {
      toast.error(requestError.message);
      return;
    }

    setDeleteOpen(false);
    setLessonToDelete(null);
    setFormOpen(false);
    setSelectedLesson(null);
    toast.success("Dars muvaffaqiyatli o'chirildi");
  }

  const dayLessons = lessons
    .filter((lesson) => lesson.weekday === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dars jadvali"
        description="Haftalik darslar va o'qitish vaqtlari"
        action={
          isAdmin
            ? {
                label: "Dars qo'shish",
                icon: <Plus />,
                onClick: () => openCreate(),
              }
            : undefined
        }
      />

      {isAdmin || user?.role === "teacher" ? (
        <Select
          value={groupId === null ? "all" : String(groupId)}
          onValueChange={(value) =>
            setGroupId(value === "all" ? null : Number(value))
          }
        >
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue>
              {groupId === null
                ? "Barcha guruhlar"
                : groups.find((group) => group.id === groupId)?.name ??
                  "Guruhni tanlang"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha guruhlar</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {error && !loading ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      {loading ? (
        <TableSkeleton columns={6} />
      ) : lessons.length === 0 ? (
        <EmptyState
          title="Dars jadvali bo'sh"
          description="Hali haftalik darslar rejalashtirilmagan."
          action={
            isAdmin
              ? { label: "Dars qo'shish", onClick: () => openCreate() }
              : undefined
          }
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <WeekGrid
              lessons={lessons}
              isAdmin={isAdmin}
              onLessonClick={openEdit}
            />
          </div>

          <div className="lg:hidden">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              {weekdays.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(index)}
                  className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium ${
                    selectedDay === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <DayList
              lessons={dayLessons}
              isAdmin={isAdmin}
              onLessonClick={openEdit}
              onAdd={() => openCreate(selectedDay)}
            />
          </div>
        </>
      )}

      {isAdmin ? (
        <>
          <LessonForm
            open={formOpen}
            onOpenChange={setFormOpen}
            lesson={
              selectedLesson && selectedLesson.id !== 0
                ? selectedLesson
                : null
            }
            groups={groups}
            loading={formLoading}
            serverError={serverError}
            onSubmit={handleSubmit}
            onDelete={openDelete}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Darsni o'chirish"
            message={
              lessonToDelete
                ? `${lessonToDelete.group_name} guruhining darsini o'chirmoqchimisiz?`
                : "Darsni o'chirmoqchimisiz?"
            }
            loading={deleteLoading}
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </div>
  );
}
