import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, col, func, select

from app.auth import get_current_user
from app.db import get_session
from app.models import Attendance, Group, Lesson, Student, Teacher, User, UserRole
from app.schemas import (
    AdminDashboardCounts,
    AdminDashboardResponse,
    AttendanceSummary,
    DashboardResponse,
    LessonRead,
    StudentDashboardGroup,
    StudentDashboardResponse,
    StudentDashboardTeacher,
    StudentUpcomingLesson,
    TeacherDashboardCounts,
    TeacherDashboardResponse,
    TeacherLessonToday,
)

router = APIRouter()


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Role-specific dashboard overview:
    - Admin: system counters and all lessons today.
    - Teacher: group/student counts and today's lessons with attendance_marked status.
    - Student: group/teacher info, next 3 upcoming lessons, and attendance summary.
    """
    today = dt.date.today()
    today_weekday = today.weekday()
    current_time_str = dt.datetime.now().strftime("%H:%M")

    # --- 1. ADMIN DASHBOARD ---
    if current_user.role == UserRole.ADMIN.value:
        teachers_count = session.exec(select(func.count(Teacher.id))).one()
        students_count = session.exec(select(func.count(Student.id))).one()
        groups_count = session.exec(select(func.count(Group.id))).one()
        lessons_this_week = session.exec(select(func.count(Lesson.id))).one()

        today_query = (
            select(
                Lesson,
                Group.name.label("group_name"),
                User.full_name.label("teacher_name"),
            )
            .join(Group, Lesson.group_id == Group.id)
            .join(Teacher, Group.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(Lesson.weekday == today_weekday)
            .order_by(col(Lesson.start_time).asc())
        )
        today_results = session.exec(today_query).all()

        today_lessons = [
            LessonRead(
                id=lesson.id,
                group_id=lesson.group_id,
                group_name=group_name,
                teacher_name=teacher_name,
                weekday=lesson.weekday,
                start_time=lesson.start_time,
                end_time=lesson.end_time,
                room=lesson.room,
            )
            for lesson, group_name, teacher_name in today_results
        ]

        return AdminDashboardResponse(
            role="admin",
            counts=AdminDashboardCounts(
                teachers=teachers_count,
                students=students_count,
                groups=groups_count,
                lessons_this_week=lessons_this_week,
            ),
            today_lessons=today_lessons,
        )

    # --- 2. TEACHER DASHBOARD ---
    elif current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found",
            )

        teacher_groups = session.exec(
            select(Group).where(Group.teacher_id == teacher.id)
        ).all()
        teacher_group_ids = [g.id for g in teacher_groups]

        groups_count = len(teacher_group_ids)
        students_count = 0
        if teacher_group_ids:
            students_count = session.exec(
                select(func.count(func.distinct(Student.id))).where(
                    col(Student.group_id).in_(teacher_group_ids)
                )
            ).one()

        today_lessons: List[TeacherLessonToday] = []
        if teacher_group_ids:
            lessons_query = (
                select(
                    Lesson,
                    Group.name.label("group_name"),
                    User.full_name.label("teacher_name"),
                )
                .join(Group, Lesson.group_id == Group.id)
                .join(Teacher, Group.teacher_id == Teacher.id)
                .join(User, Teacher.user_id == User.id)
                .where(
                    col(Lesson.group_id).in_(teacher_group_ids),
                    Lesson.weekday == today_weekday,
                )
                .order_by(col(Lesson.start_time).asc())
            )
            lesson_results = session.exec(lessons_query).all()

            for lesson, group_name, teacher_name in lesson_results:
                marked_count = session.exec(
                    select(func.count(Attendance.id)).where(
                        Attendance.lesson_id == lesson.id,
                        Attendance.date == today,
                    )
                ).one()
                today_lessons.append(
                    TeacherLessonToday(
                        id=lesson.id,
                        group_id=lesson.group_id,
                        group_name=group_name,
                        teacher_name=teacher_name,
                        weekday=lesson.weekday,
                        start_time=lesson.start_time,
                        end_time=lesson.end_time,
                        room=lesson.room,
                        attendance_marked=(marked_count > 0),
                    )
                )

        return TeacherDashboardResponse(
            role="teacher",
            counts=TeacherDashboardCounts(
                groups=groups_count,
                students=students_count,
            ),
            today_lessons=today_lessons,
        )

    # --- 3. STUDENT DASHBOARD ---
    elif current_user.role == UserRole.STUDENT.value:
        student = session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student profile not found",
            )

        student_group: Optional[StudentDashboardGroup] = None
        student_teacher: Optional[StudentDashboardTeacher] = None
        next_lessons: List[StudentUpcomingLesson] = []

        if student.group_id:
            group = session.get(Group, student.group_id)
            if group:
                student_group = StudentDashboardGroup(
                    id=group.id,
                    name=group.name,
                    subject=group.subject,
                    level=group.level,
                )
                teacher = session.get(Teacher, group.teacher_id)
                if teacher:
                    teacher_user = session.get(User, teacher.user_id)
                    student_teacher = StudentDashboardTeacher(
                        id=teacher.id,
                        full_name=teacher_user.full_name,
                        email=teacher_user.email,
                        phone=teacher.phone,
                        subject=teacher.subject,
                    )

                # Fetch all weekly lessons for the group
                weekly_lessons_query = (
                    select(
                        Lesson,
                        Group.name.label("group_name"),
                        User.full_name.label("teacher_name"),
                    )
                    .join(Group, Lesson.group_id == Group.id)
                    .join(Teacher, Group.teacher_id == Teacher.id)
                    .join(User, Teacher.user_id == User.id)
                    .where(Lesson.group_id == student.group_id)
                )
                weekly_results = session.exec(weekly_lessons_query).all()

                # Calculate upcoming lesson occurrences from today onwards
                candidates = []
                for lesson, group_name, teacher_name in weekly_results:
                    days_ahead = (lesson.weekday - today_weekday) % 7
                    # If scheduled for today but already finished, push to next week
                    if days_ahead == 0 and lesson.end_time < current_time_str:
                        days_ahead = 7
                    lesson_date = today + dt.timedelta(days=days_ahead)
                    candidates.append((days_ahead, lesson.start_time, lesson, group_name, teacher_name, lesson_date))

                # Sort by earliest upcoming date and time, taking the next 3
                candidates.sort(key=lambda x: (x[0], x[1]))
                for _, _, lesson, group_name, teacher_name, lesson_date in candidates[:3]:
                    next_lessons.append(
                        StudentUpcomingLesson(
                            id=lesson.id,
                            group_id=lesson.group_id,
                            group_name=group_name,
                            teacher_name=teacher_name,
                            weekday=lesson.weekday,
                            start_time=lesson.start_time,
                            end_time=lesson.end_time,
                            room=lesson.room,
                            date=lesson_date,
                        )
                    )

        # Calculate student's personal attendance summary
        student_attendances = session.exec(
            select(Attendance).where(Attendance.student_id == student.id)
        ).all()
        present = sum(1 for a in student_attendances if a.status == "present")
        late = sum(1 for a in student_attendances if a.status == "late")
        absent = sum(1 for a in student_attendances if a.status == "absent")
        total = present + late + absent
        percent = round((present / total) * 100, 1) if total > 0 else 0.0

        return StudentDashboardResponse(
            role="student",
            group=student_group,
            teacher=student_teacher,
            next_lessons=next_lessons,
            attendance_summary=AttendanceSummary(
                present=present,
                late=late,
                absent=absent,
                percent=percent,
            ),
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: unknown role",
    )
