from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, func, or_, select

from app.auth import get_current_user, require_role
from app.db import get_session
from app.models import Attendance, Group, Lesson, Student, Teacher, User, UserRole
from app.schemas import GroupCreate, GroupDetail, GroupRead, GroupUpdate, StudentRead, TeacherRead

router = APIRouter()


@router.get("", response_model=List[GroupRead])
def list_groups(
    search: Optional[str] = Query(default=None, description="Search by name or subject"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[GroupRead]:
    """List groups with role-based filtering: Admin sees all, teacher sees own groups, student sees only their own group."""
    query = (
        select(
            Group,
            User.full_name.label("teacher_name"),
            func.count(Student.id).label("student_count"),
        )
        .join(Teacher, Group.teacher_id == Teacher.id)
        .join(User, Teacher.user_id == User.id)
        .outerjoin(Student, Student.group_id == Group.id)
    )

    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher:
            return []
        query = query.where(Group.teacher_id == teacher.id)

    elif current_user.role == UserRole.STUDENT.value:
        student = session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if not student or student.group_id is None:
            return []
        query = query.where(Group.id == student.group_id)

    elif current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient permissions",
        )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                col(Group.name).ilike(term),
                col(Group.subject).ilike(term),
            )
        )

    query = query.group_by(Group.id, User.full_name).order_by(col(Group.id).asc())
    results = session.exec(query).all()

    return [
        GroupRead(
            id=g.id,
            name=g.name,
            subject=g.subject,
            level=g.level,
            teacher_id=g.teacher_id,
            teacher_name=teacher_name,
            student_count=student_count,
        )
        for g, teacher_name, student_count in results
    ]


@router.get("/{id}", response_model=GroupDetail)
def get_group(
    id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GroupDetail:
    """Get group details including assigned teacher and student roster with role guard."""
    group = session.get(Group, id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    # Role visibility check
    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher or group.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view your own groups",
            )
    elif current_user.role == UserRole.STUDENT.value:
        student = session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if not student or student.group_id != group.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view your own group",
            )
    elif current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient permissions",
        )

    # Fetch teacher profile
    teacher_record = session.get(Teacher, group.teacher_id)
    if not teacher_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned teacher not found",
        )
    teacher_user = session.get(User, teacher_record.user_id)
    teacher_read = TeacherRead(
        id=teacher_record.id,
        user_id=teacher_user.id,
        full_name=teacher_user.full_name,
        email=teacher_user.email,
        phone=teacher_record.phone,
        subject=teacher_record.subject,
    )

    # Fetch enrolled students
    students_query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.group_id == id)
        .order_by(col(Student.id).asc())
    )
    student_records = session.exec(students_query).all()
    students_read = [
        StudentRead(
            id=s.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=s.phone,
            group_id=s.group_id,
            group_name=group.name,
            joined_at=s.joined_at,
        )
        for s, u in student_records
    ]

    return GroupDetail(
        id=group.id,
        name=group.name,
        subject=group.subject,
        level=group.level,
        teacher_id=group.teacher_id,
        teacher_name=teacher_user.full_name,
        student_count=len(students_read),
        teacher=teacher_read,
        students=students_read,
    )


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> GroupRead:
    """Create a new group (Admin only)."""
    teacher = session.get(Teacher, payload.teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned teacher not found",
        )
    teacher_user = session.get(User, teacher.user_id)

    group = Group(
        name=payload.name.strip(),
        subject=payload.subject.strip(),
        level=payload.level.strip() if payload.level else None,
        teacher_id=payload.teacher_id,
    )
    session.add(group)
    session.commit()
    session.refresh(group)

    return GroupRead(
        id=group.id,
        name=group.name,
        subject=group.subject,
        level=group.level,
        teacher_id=group.teacher_id,
        teacher_name=teacher_user.full_name,
        student_count=0,
    )


@router.put("/{id}", response_model=GroupRead)
def update_group(
    id: int,
    payload: GroupUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> GroupRead:
    """Update group details (Admin only)."""
    group = session.get(Group, id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if payload.teacher_id is not None:
        teacher = session.get(Teacher, payload.teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned teacher not found",
            )
        group.teacher_id = payload.teacher_id

    if payload.name is not None and payload.name.strip():
        group.name = payload.name.strip()

    if payload.subject is not None and payload.subject.strip():
        group.subject = payload.subject.strip()

    if "level" in payload.model_fields_set:
        group.level = payload.level.strip() if payload.level else None

    session.add(group)
    session.commit()
    session.refresh(group)

    teacher = session.get(Teacher, group.teacher_id)
    teacher_user = session.get(User, teacher.user_id)
    student_count = session.exec(
        select(func.count(Student.id)).where(Student.group_id == group.id)
    ).one()

    return GroupRead(
        id=group.id,
        name=group.name,
        subject=group.subject,
        level=group.level,
        teacher_id=group.teacher_id,
        teacher_name=teacher_user.full_name,
        student_count=student_count,
    )


@router.delete("/{id}")
def delete_group(
    id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Delete a group and all its lessons. Rejects with 400 if group has enrolled students (Admin only)."""
    group = session.get(Group, id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    # Reject if group has enrolled students
    students = session.exec(select(Student).where(Student.group_id == id)).all()
    if students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete group with enrolled students. Reassign or remove students first.",
        )

    # Deleting a group also deletes its lessons and their attendance records
    lessons = session.exec(select(Lesson).where(Lesson.group_id == id)).all()
    for lesson in lessons:
        attendances = session.exec(
            select(Attendance).where(Attendance.lesson_id == lesson.id)
        ).all()
        for att in attendances:
            session.delete(att)
        session.delete(lesson)

    session.delete(group)
    session.commit()

    return {"detail": "Group and its lessons deleted successfully"}
