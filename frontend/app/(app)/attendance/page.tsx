"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { AttendanceStatus } from "@/lib/types";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendancePicker } from "@/components/attendance/AttendancePicker";
import { AttendanceSheet } from "@/components/attendance/AttendanceSheet";
import { StudentHistory } from "@/components/attendance/StudentHistory";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateWeekday(date: string) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return (parsed.getDay() + 6) % 7;
}

const weekdays = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
] as const;

export default function AttendancePage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  const {
    lessons,
    attendance,
    studentAttendance,
    loadingLessons,
    loadingSheet,
    loadingStudent,
    error,
    fetchAttendance,
    fetchStudentAttendance,
    saveAttendance,
  } = useAttendance();

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [date, setDate] = useState(localToday);
  const [statuses, setStatuses] = useState<
    Record<number, AttendanceStatus | null>
  >({});
  const [originalStatuses, setOriginalStatuses] = useState<
    Record<number, AttendanceStatus | null>
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isStudent) {
      void fetchStudentAttendance();
    }
  }, [isStudent, fetchStudentAttendance]);

  useEffect(() => {
    if (isStudent || loadingLessons || lessons.length === 0) return;
    if (selectedLessonId !== null) return;

    const today = dateWeekday(localToday());
    const defaultLesson =
      lessons.find((lesson) => lesson.weekday === today) ?? lessons[0];
    setSelectedLessonId(defaultLesson.id);
  }, [isStudent, lessons, loadingLessons, selectedLessonId]);

  useEffect(() => {
    if (
      isStudent ||
      selectedLessonId === null ||
      !date
    ) return;
    void fetchAttendance(selectedLessonId, date);
  }, [isStudent, selectedLessonId, date, fetchAttendance]);

  useEffect(() => {
    const nextStatuses: Record<number, AttendanceStatus | null> = {};
    attendance.forEach((item) => {
      nextStatuses[item.student_id] = item.status;
    });
    setStatuses(nextStatuses);
    setOriginalStatuses(nextStatuses);
  }, [attendance]);

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const weekdayWarning = useMemo(() => {
    if (!selectedLesson || !date) return "";
    const selectedWeekday = dateWeekday(date);
    if (selectedWeekday !== selectedLesson.weekday) {
      return `Tanlangan sana ${weekdays[selectedWeekday ?? 0]} kuniga to'g'ri keladi, bu dars ${weekdays[selectedLesson.weekday]} kuniga jadvallangan. Saqlash o'chirilgan.`;
    }
    return "";
  }, [selectedLesson, date]);

  const changedRecords = useMemo(
    () =>
      attendance
        .filter(
          (item) =>
            statuses[item.student_id] !== originalStatuses[item.student_id]
        )
        .map((item) => ({
          student_id: item.student_id,
          status: statuses[item.student_id],
        }))
        .filter(
          (
            record
          ): record is {
            student_id: number;
            status: AttendanceStatus;
          } => record.status !== null && record.status !== undefined
        ),
    [attendance, statuses, originalStatuses]
  );

  function setStatus(studentId: number, status: AttendanceStatus) {
    setStatuses((current) => ({ ...current, [studentId]: status }));
  }

  function markAllPresent() {
    setStatuses((current) => {
      const next = { ...current };
      attendance.forEach((item) => {
        next[item.student_id] = "present";
      });
      return next;
    });
  }

  async function handleSave() {
    if (!selectedLessonId || weekdayWarning) return;

    const unmarked = attendance.filter(
      (item) => statuses[item.student_id] === null
    );
    if (unmarked.length > 0) {
      toast.error(
        "Saqlashdan oldin barcha o'quvchilarni belgilang"
      );
      return;
    }
    if (changedRecords.length === 0) return;

    setSaving(true);
    const requestError = await saveAttendance(
      selectedLessonId,
      date,
      changedRecords
    );
    setSaving(false);

    if (requestError) {
      toast.error(requestError.message);
      return;
    }
    toast.success("Davomat muvaffaqiyatli saqlandi");
  }

  const counts = useMemo(
    () => ({
      present: attendance.filter(
        (item) => statuses[item.student_id] === "present"
      ).length,
      late: attendance.filter(
        (item) => statuses[item.student_id] === "late"
      ).length,
      absent: attendance.filter(
        (item) => statuses[item.student_id] === "absent"
      ).length,
    }),
    [attendance, statuses]
  );

  if (isStudent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Davomat"
          description="Shaxsiy davomat tarixi"
        />
        {error && !loadingStudent ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}
        <StudentHistory
          response={studentAttendance}
          loading={loadingStudent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="Davomat"
        description={
          isAdmin
            ? "Davomat yozuvlarini ko'rish"
            : "Darslar bo'yicha davomat belgilash"
        }
      />

      {error && !loadingLessons && !loadingSheet ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      {loadingLessons ? (
        <TableSkeleton columns={2} />
      ) : lessons.length === 0 ? (
        <EmptyState
          title="Darslar topilmadi"
          description={
            isTeacher
              ? "Sizga biriktirilgan darslar mavjud emas."
              : "Davomat uchun darslar mavjud emas."
          }
        />
      ) : (
        <>
          <AttendancePicker
            lessons={lessons}
            selectedLessonId={selectedLessonId}
            date={date}
            onLessonChange={setSelectedLessonId}
            onDateChange={setDate}
            warning={weekdayWarning}
          />

          {loadingSheet ? (
            <TableSkeleton columns={3} />
          ) : attendance.length === 0 ? (
            <EmptyState
              title="O'quvchilar yo'q"
              description="Tanlangan guruhda hozircha o'quvchilar mavjud emas."
            />
          ) : (
            <>
              {isTeacher ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={markAllPresent}
                    disabled={Boolean(weekdayWarning)}
                  >
                    <CheckCheck />
                    Hammasini keldi deb belgilash
                  </Button>
                </div>
              ) : null}

              <AttendanceSheet
                items={attendance}
                editable={isTeacher}
                statuses={statuses}
                onChange={setStatus}
              />
            </>
          )}
        </>
      )}

      {isTeacher && selectedLessonId !== null && attendance.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex gap-3 text-xs sm:text-sm">
              <span className="text-success">Keldi: {counts.present}</span>
              <span className="text-warning">Kechikdi: {counts.late}</span>
              <span className="text-danger">Kelmadi: {counts.absent}</span>
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                Boolean(weekdayWarning) ||
                changedRecords.length === 0
              }
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
