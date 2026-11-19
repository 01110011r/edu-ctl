import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, or_, select

from app.auth import hash_password, require_role
from app.db import get_session
from app.models import Attendance, Group, Student, Teacher, User, UserRole
from app.schemas import StudentCreate, StudentRead, StudentUpdate

router = APIRouter()


@router.get("", response_model=List[StudentRead])
def list_students(
    search: Optional[str] = Query(default=None, description="Search by name, email, or phone"),
    group_id: Optional[int] = Query(default=None, description="Filter by group ID"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN.value, UserRole.TEACHER.value)),
) -> List[StudentRead]:
    """List students with optional search and group filter. Teachers can only see students of their own groups."""
    query = (
        select(Student, User, Group)
        .join(User, Student.user_id == User.id)
        .outerjoin(Group, Student.group_id == Group.id)
    )

    # Role-based restriction: Teachers can only view students in their own groups
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
            query = query.where(Student.group_id == group_id)
        else:
            query = query.where(col(Student.group_id).in_(teacher_group_ids))
    else:
        # Admin can view all or filter by group_id
        if group_id is not None:
            query = query.where(Student.group_id == group_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                col(User.full_name).ilike(term),
                col(User.email).ilike(term),
                col(Student.phone).ilike(term),
            )
        )

    query = query.order_by(col(Student.id).asc())
    results = session.exec(query).all()

    return [
        StudentRead(
            id=s.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=s.phone,
            group_id=s.group_id,
            group_name=g.name if g else None,
            joined_at=s.joined_at,
        )
        for s, u, g in results
    ]


@router.get("/{id}", response_model=StudentRead)
def get_student(
    id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN.value, UserRole.TEACHER.value)),
) -> StudentRead:
    """Get single student by ID. Teachers can only view students belonging to their own groups."""
    query = (
        select(Student, User, Group)
        .join(User, Student.user_id == User.id)
        .outerjoin(Group, Student.group_id == Group.id)
        .where(Student.id == id)
    )
    result = session.exec(query).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    s, u, g = result

    if current_user.role == UserRole.TEACHER.value:
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Teacher profile not found",
            )
        teacher_group_ids = session.exec(
            select(Group.id).where(Group.teacher_id == teacher.id)
        ).all()
        if s.group_id not in teacher_group_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Student does not belong to your groups",
            )

    return StudentRead(
        id=s.id,
        user_id=u.id,
        full_name=u.full_name,
        email=u.email,
        phone=s.phone,
        group_id=s.group_id,
        group_name=g.name if g else None,
        joined_at=s.joined_at,
    )


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> StudentRead:
    """Create a new student and corresponding user in one transaction (Admin only)."""
    normalized_email = payload.email.lower().strip()
    existing_user = session.exec(select(User).where(User.email == normalized_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    group_name = None
    if payload.group_id is not None:
        group = session.get(Group, payload.group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found",
            )
        group_name = group.name

    user = User(
        email=normalized_email,
        password_hash=hash_password(payload.password),
        role=UserRole.STUDENT.value,
        full_name=payload.full_name.strip(),
    )
    session.add(user)
    session.flush()

    student = Student(
        user_id=user.id,
        phone=payload.phone.strip(),
        group_id=payload.group_id,
        joined_at=payload.joined_at or dt.date.today(),
    )
    session.add(student)
    session.commit()
    session.refresh(student)

    return StudentRead(
        id=student.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=student.phone,
        group_id=student.group_id,
        group_name=group_name,
        joined_at=student.joined_at,
    )


@router.put("/{id}", response_model=StudentRead)
def update_student(
    id: int,
    payload: StudentUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> StudentRead:
    """Update student and associated user profile (Admin only)."""
    student = session.get(Student, id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    user = session.get(User, student.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found",
        )

    if payload.email is not None:
        normalized_email = payload.email.lower().strip()
        if normalized_email != user.email:
            existing_user = session.exec(
                select(User).where(User.email == normalized_email)
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email is already taken",
                )
            user.email = normalized_email

    if payload.full_name is not None and payload.full_name.strip():
        user.full_name = payload.full_name.strip()

    if payload.password is not None and payload.password.strip():
        user.password_hash = hash_password(payload.password)

    if payload.phone is not None:
        student.phone = payload.phone.strip()

    if payload.joined_at is not None:
        student.joined_at = payload.joined_at

    if "group_id" in payload.model_fields_set:
        if payload.group_id is not None:
            group = session.get(Group, payload.group_id)
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Group not found",
                )
        student.group_id = payload.group_id

    session.add(user)
    session.add(student)
    session.commit()
    session.refresh(user)
    session.refresh(student)

    group_name = None
    if student.group_id:
        group = session.get(Group, student.group_id)
        if group:
            group_name = group.name

    return StudentRead(
        id=student.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=student.phone,
        group_id=student.group_id,
        group_name=group_name,
        joined_at=student.joined_at,
    )


@router.delete("/{id}")
def delete_student(
    id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Delete student, attendances, and associated user (Admin only)."""
    student = session.get(Student, id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # Clean up student's attendance records first
    attendances = session.exec(
        select(Attendance).where(Attendance.student_id == id)
    ).all()
    for att in attendances:
        session.delete(att)

    user = session.get(User, student.user_id)
    session.delete(student)
    if user:
        session.delete(user)
    session.commit()

    return {"detail": "Student deleted successfully"}
