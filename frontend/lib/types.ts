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
  phone: string;
  group_id: number | null;
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
