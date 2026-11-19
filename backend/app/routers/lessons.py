from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, select

from app.auth import get_current_user, require_role
from app.db import get_session
from app.models import Attendance, Group, Lesson, Student, Teacher, User, UserRole
from app.schemas import LessonCreate, LessonRead, LessonUpdate

router = APIRouter()


def check_lesson_conflict(
    session: Session,
    group_id: int,
    weekday: int,
    start_time: str,
    end_time: str,
    room: str,
    exclude_lesson_id: Optional[int] = None,
) -> None:
    """Validate that the lesson does not conflict with existing lessons in the same room or for the same teacher."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    teacher_id = group.teacher_id

    query = (
        select(Lesson, Group)
        .join(Group, Lesson.group_id == Group.id)
        .where(Lesson.weekday == weekday)
    )
    if exclude_lesson_id is not None:
        query = query.where(Lesson.id != exclude_lesson_id)

    existing_lessons = session.exec(query).all()
    normalized_room = room.lower().strip()

    for existing_lesson, existing_group in existing_lessons:
        # Check for time interval overlap: (new_start < existing_end) and (existing_start < new_end)
        if start_time < existing_lesson.end_time and existing_lesson.start_time < end_time:
            # Room conflict
            if existing_lesson.room.lower().strip() == normalized_room:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Room conflict: Room '{room}' already has a lesson from {existing_lesson.start_time} to {existing_lesson.end_time} on this weekday",
                )
            # Teacher conflict
            if existing_group.teacher_id == teacher_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Teacher conflict: Teacher is already scheduled for another group from {existing_lesson.start_time} to {existing_lesson.end_time} on this weekday",
                )


@router.get("", response_model=List[LessonRead])
def list_lessons(
    group_id: Optional[int] = Query(default=None, description="Filter lessons by group ID"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[LessonRead]:
    """List lessons with role-based filtering: Admin all, teacher own groups, student own group."""
    query = (
        select(
            Lesson,
            Group.name.label("group_name"),
            User.full_name.label("teacher_name"),
        )
        .join(Group, Lesson.group_id == Group.id)
        .join(Teacher, Group.teacher_id == Teacher.id)
        .join(User, Teacher.user_id == User.id)
    )

    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher:
            return []
        teacher_group_ids = session.exec(
            select(Group.id).where(Group.teacher_id == teacher.id)
        ).all()
        if not teacher_group_ids:
            return []
        if group_id is not None:
            if group_id not in teacher_group_ids:
                return []
            query = query.where(Lesson.group_id == group_id)
        else:
            query = query.where(col(Lesson.group_id).in_(teacher_group_ids))

    elif current_user.role == UserRole.STUDENT.value:
        student = session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if not student or student.group_id is None:
            return []
        if group_id is not None and group_id != student.group_id:
            return []
        query = query.where(Lesson.group_id == student.group_id)

    elif current_user.role == UserRole.ADMIN.value:
        if group_id is not None:
            query = query.where(Lesson.group_id == group_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient permissions",
        )

    query = query.order_by(col(Lesson.weekday).asc(), col(Lesson.start_time).asc())
    results = session.exec(query).all()

    return [
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
        for lesson, group_name, teacher_name in results
    ]


@router.get("/{id}", response_model=LessonRead)
def get_lesson(
    id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LessonRead:
    """Get single lesson by ID with role-based access check."""
    query = (
        select(
            Lesson,
            Group.name.label("group_name"),
            User.full_name.label("teacher_name"),
        )
        .join(Group, Lesson.group_id == Group.id)
        .join(Teacher, Group.teacher_id == Teacher.id)
        .join(User, Teacher.user_id == User.id)
        .where(Lesson.id == id)
    )
    result = session.exec(query).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    lesson, group_name, teacher_name = result
    group = session.get(Group, lesson.group_id)

    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher or group.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view lessons for your own groups",
            )
    elif current_user.role == UserRole.STUDENT.value:
        student = session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if not student or student.group_id != group.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view lessons for your own group",
            )
    elif current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient permissions",
        )

    return LessonRead(
        id=lesson.id,
        group_id=lesson.group_id,
        group_name=group_name,
        teacher_name=teacher_name,
        weekday=lesson.weekday,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        room=lesson.room,
    )


@router.post("", response_model=LessonRead, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> LessonRead:
    """Create a new lesson with overlap validation (Admin only)."""
    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    # Check for schedule conflicts on room or teacher
    check_lesson_conflict(
        session=session,
        group_id=payload.group_id,
        weekday=payload.weekday,
        start_time=payload.start_time.strip(),
        end_time=payload.end_time.strip(),
        room=payload.room.strip(),
    )

    lesson = Lesson(
        group_id=payload.group_id,
        weekday=payload.weekday,
        start_time=payload.start_time.strip(),
        end_time=payload.end_time.strip(),
        room=payload.room.strip(),
    )
    session.add(lesson)
    session.commit()
    session.refresh(lesson)

    group = session.get(Group, lesson.group_id)
    teacher = session.get(Teacher, group.teacher_id)
    teacher_user = session.get(User, teacher.user_id)

    return LessonRead(
        id=lesson.id,
        group_id=lesson.group_id,
        group_name=group.name,
        teacher_name=teacher_user.full_name,
        weekday=lesson.weekday,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        room=lesson.room,
    )


@router.put("/{id}", response_model=LessonRead)
def update_lesson(
    id: int,
    payload: LessonUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> LessonRead:
    """Update lesson details with overlap and time validation (Admin only)."""
    lesson = session.get(Lesson, id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    effective_group_id = payload.group_id if payload.group_id is not None else lesson.group_id
    effective_weekday = payload.weekday if payload.weekday is not None else lesson.weekday
    effective_start = payload.start_time.strip() if payload.start_time is not None else lesson.start_time
    effective_end = payload.end_time.strip() if payload.end_time is not None else lesson.end_time
    effective_room = payload.room.strip() if payload.room is not None else lesson.room

    if effective_end <= effective_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    check_lesson_conflict(
        session=session,
        group_id=effective_group_id,
        weekday=effective_weekday,
        start_time=effective_start,
        end_time=effective_end,
        room=effective_room,
        exclude_lesson_id=id,
    )

    lesson.group_id = effective_group_id
    lesson.weekday = effective_weekday
    lesson.start_time = effective_start
    lesson.end_time = effective_end
    lesson.room = effective_room

    session.add(lesson)
    session.commit()
    session.refresh(lesson)

    group = session.get(Group, lesson.group_id)
    teacher = session.get(Teacher, group.teacher_id)
    teacher_user = session.get(User, teacher.user_id)

    return LessonRead(
        id=lesson.id,
        group_id=lesson.group_id,
        group_name=group.name,
        teacher_name=teacher_user.full_name,
        weekday=lesson.weekday,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        room=lesson.room,
    )


@router.delete("/{id}")
def delete_lesson(
    id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Delete a lesson and its attendance records (Admin only)."""
    lesson = session.get(Lesson, id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    attendances = session.exec(
        select(Attendance).where(Attendance.lesson_id == id)
    ).all()
    for att in attendances:
        session.delete(att)

    session.delete(lesson)
    session.commit()

    return {"detail": "Lesson deleted successfully"}
