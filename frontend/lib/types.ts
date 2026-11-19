export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: number;
  email: string;
  password_hash?: string;
  role: UserRole;
  full_name: string;
}

export interface Teacher {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
}

export interface Student {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  group_id: number | null;
  group_name?: string | null;
  joined_at: string;
}

export interface Group {
  id: number;
  name: string;
  teacher_id: number;
  subject: string;
  level?: string;
}

export interface Lesson {
  id: number;
  group_id: number;
  group_name: string;
  teacher_name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface Attendance {
  id: number;
  lesson_id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceItem {
  student_id: number;
  student_name: string;
  phone: string;
  status: AttendanceStatus | null;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  percent: number;
}

export interface StudentAttendanceHistoryItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  group_name: string;
  start_time: string;
  end_time: string;
}

export interface StudentAttendanceMeResponse {
  history: StudentAttendanceHistoryItem[];
  summary: AttendanceSummary;
}
