from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, or_, select

from app.auth import hash_password, require_role
from app.db import get_session
from app.models import Group, Teacher, User, UserRole
from app.schemas import TeacherCreate, TeacherRead, TeacherUpdate

router = APIRouter()


@router.get("", response_model=List[TeacherRead])
def list_teachers(
    search: Optional[str] = Query(default=None, description="Search by name, email, phone, or subject"),
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> List[TeacherRead]:
    """List teachers with optional search by name, email, phone, or subject (Admin only)."""
    query = select(Teacher, User).join(User, Teacher.user_id == User.id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                col(User.full_name).ilike(term),
                col(User.email).ilike(term),
                col(Teacher.phone).ilike(term),
                col(Teacher.subject).ilike(term),
            )
        )

    query = query.order_by(col(Teacher.id).asc())
    results = session.exec(query).all()

    return [
        TeacherRead(
            id=t.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=t.phone,
            subject=t.subject,
        )
        for t, u in results
    ]


@router.get("/{id}", response_model=TeacherRead)
def get_teacher(
    id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> TeacherRead:
    """Get single teacher by ID (Admin only)."""
    query = select(Teacher, User).join(User, Teacher.user_id == User.id).where(Teacher.id == id)
    result = session.exec(query).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )

    t, u = result
    return TeacherRead(
        id=t.id,
        user_id=u.id,
        full_name=u.full_name,
        email=u.email,
        phone=t.phone,
        subject=t.subject,
    )


@router.post("", response_model=TeacherRead, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> TeacherRead:
    """Create a new teacher and corresponding user in one transaction (Admin only)."""
    normalized_email = payload.email.lower().strip()
    existing_user = session.exec(select(User).where(User.email == normalized_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        email=normalized_email,
        password_hash=hash_password(payload.password),
        role=UserRole.TEACHER.value,
        full_name=payload.full_name.strip(),
    )
    session.add(user)
    session.flush()

    teacher = Teacher(
        user_id=user.id,
        phone=payload.phone.strip(),
        subject=payload.subject.strip(),
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    return TeacherRead(
        id=teacher.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=teacher.phone,
        subject=teacher.subject,
    )


@router.put("/{id}", response_model=TeacherRead)
def update_teacher(
    id: int,
    payload: TeacherUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
) -> TeacherRead:
    """Update teacher and associated user profile (Admin only)."""
    teacher = session.get(Teacher, id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )

    user = session.get(User, teacher.user_id)
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
        teacher.phone = payload.phone.strip()

    if payload.subject is not None:
        teacher.subject = payload.subject.strip()

    session.add(user)
    session.add(teacher)
    session.commit()
    session.refresh(user)
    session.refresh(teacher)

    return TeacherRead(
        id=teacher.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=teacher.phone,
        subject=teacher.subject,
    )


@router.delete("/{id}")
def delete_teacher(
    id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Delete teacher and associated user. Fails if teacher still has assigned groups (Admin only)."""
    teacher = session.get(Teacher, id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )

    groups = session.exec(select(Group).where(Group.teacher_id == id)).all()
    if groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete teacher assigned to active groups. Reassign or delete groups first.",
        )

    user = session.get(User, teacher.user_id)
    session.delete(teacher)
    if user:
        session.delete(user)
    session.commit()

    return {"detail": "Teacher deleted successfully"}
