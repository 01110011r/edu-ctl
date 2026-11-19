import datetime as dt
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# --- Teacher Schemas ---
class TeacherCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str
    subject: str


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    subject: Optional[str] = None


class TeacherRead(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    subject: str

    model_config = {"from_attributes": True}


# --- Student Schemas ---
class StudentCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str
    group_id: Optional[int] = None
    joined_at: Optional[dt.date] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    group_id: Optional[int] = None
    joined_at: Optional[dt.date] = None


class StudentRead(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    joined_at: dt.date

    model_config = {"from_attributes": True}


# --- Group Schemas ---
class GroupCreate(BaseModel):
    name: str
    subject: str
    level: Optional[str] = None
    teacher_id: int


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    level: Optional[str] = None
    teacher_id: Optional[int] = None


class GroupRead(BaseModel):
    id: int
    name: str
    subject: str
    level: Optional[str] = None
    teacher_id: int
    teacher_name: str
    student_count: int

    model_config = {"from_attributes": True}


class GroupDetail(BaseModel):
    id: int
    name: str
    subject: str
    level: Optional[str] = None
    teacher_id: int
    teacher_name: str
    student_count: int
    teacher: TeacherRead
    students: List[StudentRead]

    model_config = {"from_attributes": True}


# --- Lesson Schemas ---
class LessonCreate(BaseModel):
    group_id: int
    weekday: int
    start_time: str
    end_time: str
    room: str

    @field_validator("weekday")
    @classmethod
    def validate_weekday(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("weekday must be between 0 (Monday) and 6 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_times(self) -> "LessonCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class LessonUpdate(BaseModel):
    group_id: Optional[int] = None
    weekday: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None

    @field_validator("weekday")
    @classmethod
    def validate_weekday(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 6):
            raise ValueError("weekday must be between 0 (Monday) and 6 (Sunday)")
        return v

    @model_validator(mode="after")
    def validate_times(self) -> "LessonUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be after start_time")
        return self


class LessonRead(BaseModel):
    id: int
    group_id: int
    group_name: str
    teacher_name: str
    weekday: int
    start_time: str
    end_time: str
    room: str

    model_config = {"from_attributes": True}
