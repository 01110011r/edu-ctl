import datetime as dt
from typing import Optional
from pydantic import BaseModel, EmailStr


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
