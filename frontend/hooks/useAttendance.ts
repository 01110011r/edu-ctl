"use client";

import { useCallback, useEffect, useState } from "react";
import { get, put } from "@/lib/api";
import type {
  AttendanceItem,
  Lesson,
  StudentAttendanceMeResponse,
  AttendanceStatus,
} from "@/lib/types";

export function useAttendance() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [studentAttendance, setStudentAttendance] =
    useState<StudentAttendanceMeResponse | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setLoadingLessons(true);
    setError(null);
    try {
      setLessons(await get<Lesson[]>("/lessons"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Darslar yuklanmadi");
    } finally {
      setLoadingLessons(false);
    }
  }, []);

  const fetchAttendance = useCallback(
    async (lessonId: number, date: string) => {
      setLoadingSheet(true);
      setError(null);
      try {
        setAttendance(
          await get<AttendanceItem[]>(
            `/attendance?lesson_id=${lessonId}&date=${encodeURIComponent(date)}`
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Davomat yuklanmadi");
      } finally {
        setLoadingSheet(false);
      }
    },
    []
  );

  const fetchStudentAttendance = useCallback(async () => {
    setLoadingStudent(true);
    setError(null);
    try {
      setStudentAttendance(
        await get<StudentAttendanceMeResponse>("/attendance/me")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Davomat yuklanmadi");
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  useEffect(() => {
    void fetchLessons();
  }, [fetchLessons]);

  async function saveAttendance(
    lessonId: number,
    date: string,
    records: Array<{ student_id: number; status: AttendanceStatus }>
  ): Promise<Error | null> {
    try {
      await put<{ detail: string; count: number }>("/attendance/bulk", {
        lesson_id: lessonId,
        date,
        records,
      });
      await fetchAttendance(lessonId, date);
      return null;
    } catch (err) {
      return err instanceof Error ? err : new Error("Davomat saqlanmadi");
    }
  }

  return {
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
  };
}
