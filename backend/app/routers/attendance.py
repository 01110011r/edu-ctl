import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, select

from app.auth import get_current_user, require_role
from app.db import get_session
from app.models import Attendance, Group, Lesson, Student, Teacher, User, UserRole
from app.schemas import (
    AttendanceBulkUpdate,
    AttendanceItem,
    AttendanceSummary,
    StudentAttendanceHistoryItem,
    StudentAttendanceMeResponse,
)

router = APIRouter()


@router.get("", response_model=List[AttendanceItem])
def get_attendance(
    lesson_id: int = Query(..., description="ID of the lesson"),
    date: dt.date = Query(..., description="Date of the attendance session (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[AttendanceItem]:
    """
    Get attendance sheet for a lesson on a given date.
    Returns every student in the group with their status (null if unmarked).
    Teacher: only own groups. Admin: read-only access to all.
    """
    lesson = session.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    group = session.get(Group, lesson.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated group not found",
        )

    # Permission check: Admin or the teacher assigned to the group
    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher or group.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view attendance for your own groups",
            )
    elif current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient permissions",
        )

    # Get all students enrolled in this group
    students_query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.group_id == group.id)
        .order_by(col(User.full_name).asc())
    )
    enrolled_students = session.exec(students_query).all()

    # Get existing attendance records for this lesson and date
    attendances = session.exec(
        select(Attendance).where(
            Attendance.lesson_id == lesson_id,
            Attendance.date == date,
        )
    ).all()
    attendance_map = {att.student_id: att.status for att in attendances}

    return [
        AttendanceItem(
            student_id=student.id,
            student_name=user.full_name,
            phone=student.phone,
            status=attendance_map.get(student.id),
        )
        for student, user in enrolled_students
    ]


@router.put("/bulk")
def bulk_update_attendance(
    payload: AttendanceBulkUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.TEACHER.value)),
):
    """
    Record or update attendance in bulk for a lesson and date (Teacher only).
    Upserts (lesson_id, student_id, date) in a single transaction.
    """
    teacher = session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Teacher profile not found",
        )

    lesson = session.get(Lesson, payload.lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    group = session.get(Group, lesson.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated group not found",
        )

    # Reject if lesson is not in teacher's group
    if group.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Lesson does not belong to your group",
        )

    # Reject if date's weekday does not match lesson's weekday
    if payload.date.weekday() != lesson.weekday:
        weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        date_weekday_name = weekday_names[payload.date.weekday()]
        lesson_weekday_name = weekday_names[lesson.weekday]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date weekday ({date_weekday_name}) does not match lesson weekday ({lesson_weekday_name})",
        )

    # Validate that every student in records belongs to the group
    enrolled_ids = set(
        session.exec(select(Student.id).where(Student.group_id == group.id)).all()
    )
    for record in payload.records:
        if record.student_id not in enrolled_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student with ID {record.student_id} is not enrolled in group '{group.name}'",
            )

    # Upsert attendance records
    for record in payload.records:
        existing = session.exec(
            select(Attendance).where(
                Attendance.lesson_id == payload.lesson_id,
                Attendance.student_id == record.student_id,
                Attendance.date == payload.date,
            )
        ).first()

        if existing:
            existing.status = record.status
            session.add(existing)
        else:
            new_attendance = Attendance(
                lesson_id=payload.lesson_id,
                student_id=record.student_id,
                date=payload.date,
                status=record.status,
            )
            session.add(new_attendance)

    session.commit()
    return {"detail": "Attendance saved successfully", "count": len(payload.records)}


@router.get("/me", response_model=StudentAttendanceMeResponse)
def get_my_attendance(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.STUDENT.value)),
) -> StudentAttendanceMeResponse:
    """
    Get current student's personal attendance history (newest first) with summary counters (Student only).
    """
    student = session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    query = (
        select(
            Attendance,
            Group.name.label("group_name"),
            Lesson.start_time,
            Lesson.end_time,
        )
        .join(Lesson, Attendance.lesson_id == Lesson.id)
        .join(Group, Lesson.group_id == Group.id)
        .where(Attendance.student_id == student.id)
        .order_by(col(Attendance.date).desc(), col(Lesson.start_time).desc())
    )
    results = session.exec(query).all()

    history_items = [
        StudentAttendanceHistoryItem(
            id=att.id,
            date=att.date,
            status=att.status,
            group_name=group_name,
            start_time=start_time,
            end_time=end_time,
        )
        for att, group_name, start_time, end_time in results
    ]

    present_count = sum(1 for h in history_items if h.status == "present")
    late_count = sum(1 for h in history_items if h.status == "late")
    absent_count = sum(1 for h in history_items if h.status == "absent")
    total = present_count + late_count + absent_count
    percent = round((present_count / total) * 100, 1) if total > 0 else 0.0

    return StudentAttendanceMeResponse(
        history=history_items,
        summary=AttendanceSummary(
            present=present_count,
            late=late_count,
            absent=absent_count,
            percent=percent,
        ),
    )
