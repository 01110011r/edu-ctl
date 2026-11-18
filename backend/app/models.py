import datetime as dt
from enum import Enum
from typing import List, Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    password_hash: str = Field(nullable=False)
    role: str = Field(default=UserRole.STUDENT.value, index=True, nullable=False)
    full_name: str = Field(nullable=False)

    teacher: Optional["Teacher"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False},
    )
    student: Optional["Student"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False},
    )


class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True, nullable=False)
    phone: str = Field(nullable=False)
    subject: str = Field(nullable=False)

    user: Optional[User] = Relationship(back_populates="teacher")
    groups: List["Group"] = Relationship(back_populates="teacher")


class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True, nullable=False)
    phone: str = Field(nullable=False)
    group_id: Optional[int] = Field(
        default=None, foreign_key="group.id", nullable=True, index=True
    )
    joined_at: dt.date = Field(default_factory=dt.date.today, nullable=False)

    user: Optional[User] = Relationship(back_populates="student")
    group: Optional["Group"] = Relationship(back_populates="students")
    attendances: List["Attendance"] = Relationship(back_populates="student")


class Group(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    teacher_id: int = Field(foreign_key="teacher.id", index=True, nullable=False)
    subject: str = Field(nullable=False)
    level: Optional[str] = Field(default=None, nullable=True)

    teacher: Optional[Teacher] = Relationship(back_populates="groups")
    students: List[Student] = Relationship(back_populates="group")
    lessons: List["Lesson"] = Relationship(back_populates="group")


class Lesson(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="group.id", index=True, nullable=False)
    weekday: int = Field(ge=0, le=6, nullable=False)  # 0=Mon..6=Sun
    start_time: str = Field(nullable=False)  # "HH:MM"
    end_time: str = Field(nullable=False)    # "HH:MM"
    room: str = Field(nullable=False)

    group: Optional[Group] = Relationship(back_populates="lessons")
    attendances: List["Attendance"] = Relationship(back_populates="lesson")


class Attendance(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "lesson_id", "student_id", "date", name="uq_attendance_lesson_student_date"
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    lesson_id: int = Field(foreign_key="lesson.id", index=True, nullable=False)
    student_id: int = Field(foreign_key="student.id", index=True, nullable=False)
    date: dt.date = Field(nullable=False)
    status: str = Field(default=AttendanceStatus.PRESENT.value, nullable=False)

    lesson: Optional[Lesson] = Relationship(back_populates="attendances")
    student: Optional[Student] = Relationship(back_populates="attendances")
