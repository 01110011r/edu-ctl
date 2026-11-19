"""
Seed script for Edu-Ctl (O'quv markazi Mini Management System).
Populates SQLite database with demo data:
- 1 Admin
- 5 Teachers
- 6 Groups
- 30 Students
- 18 Weekly Lessons (collision-free)
- 2 Weeks of historical attendance data

Run with:
    python seed.py
"""

import datetime as dt
from pathlib import Path
import random
import sys

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlmodel import Session, SQLModel, func, select

from app.auth import hash_password
from app.db import engine
from app.models import (
    Attendance,
    AttendanceStatus,
    Group,
    Lesson,
    Student,
    Teacher,
    User,
    UserRole,
)


def seed_database():
    print("=" * 60)
    print("Resetting and seeding database...")
    print("=" * 60)

    # 1. Drop and recreate all tables
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    print("✓ Dropped and recreated all database tables.")

    # Fixed seed for deterministic, reproducible results
    random.seed(42)

    # Pre-hash demo password once to optimize seed execution
    DEMO_PASSWORD = "demo1234"
    hashed_pwd = hash_password(DEMO_PASSWORD)

    with Session(engine) as session:
        # ---------------------------------------------------------
        # 1. ADMIN USER
        # ---------------------------------------------------------
        admin_user = User(
            email="admin@demo.uz",
            password_hash=hashed_pwd,
            role=UserRole.ADMIN.value,
            full_name="Admin Adminov",
        )
        session.add(admin_user)
        session.flush()

        # ---------------------------------------------------------
        # 2. TEACHERS (5)
        # ---------------------------------------------------------
        teachers_data = [
            ("teacher1@demo.uz", "Anvar Qodirov", "+998901234567", "Ingliz tili"),
            ("teacher2@demo.uz", "Dilnoza Rahimova", "+998912345678", "Matematika"),
            ("teacher3@demo.uz", "Bobur Aliyev", "+998933456789", "Dasturlash"),
            ("teacher4@demo.uz", "Malika Karimova", "+998944567890", "Rus tili"),
            ("teacher5@demo.uz", "Jasur Toshmatov", "+998955678901", "Fizika"),
        ]

        created_teachers = []
        for email, full_name, phone, subject in teachers_data:
            user = User(
                email=email,
                password_hash=hashed_pwd,
                role=UserRole.TEACHER.value,
                full_name=full_name,
            )
            session.add(user)
            session.flush()

            teacher = Teacher(
                user_id=user.id,
                phone=phone,
                subject=subject,
            )
            session.add(teacher)
            session.flush()
            created_teachers.append(teacher)

        # ---------------------------------------------------------
        # 3. GROUPS (6)
        # Teacher 1 has 2 groups; Teachers 2-5 have 1 group each
        # ---------------------------------------------------------
        groups_data = [
            ("IELTS 6.5 - Ertalab", "Ingliz tili", "Upper-Intermediate", created_teachers[0].id),
            ("General English - Kechki", "Ingliz tili", "Pre-Intermediate", created_teachers[0].id),
            ("Oliy Matematika", "Matematika", "Advanced", created_teachers[1].id),
            ("Python Boshlang'ich", "Dasturlash", "Beginner", created_teachers[2].id),
            ("Rus Tili So'zlashuv", "Rus tili", "Intermediate", created_teachers[3].id),
            ("Fizika Asoslari", "Fizika", "Boshlang'ich", created_teachers[4].id),
        ]

        created_groups = []
        for name, subject, level, teacher_id in groups_data:
            grp = Group(
                name=name,
                subject=subject,
                level=level,
                teacher_id=teacher_id,
            )
            session.add(grp)
            session.flush()
            created_groups.append(grp)

        # ---------------------------------------------------------
        # 4. STUDENTS (30) - 5 students per group
        # Student 1 is in Group 1 (taught by Teacher 1)
        # ---------------------------------------------------------
        uzbek_student_names = [
            "Rustam Ibragimov", "Shahzodbek Usmonov", "Kamola Saidova", "Madina Yusupova", "Sardorbek Mahmudov",
            "Nilufar Rustamova", "Bekzod Narzullayev", "Aziza Jalilova", "Farhod Soliyev", "Gulnoza Olimova",
            "Javohir Ergashev", "Mohira Tursunova", "Otabek Nazarov", "Rayhona Islomova", "Samandar Qobilov",
            "Sevara Hamdamova", "Ulug'bek Sharipov", "Umida Zokirova", "Xurshid Mirzayev", "Yulduz Fayzullayeva",
            "Zafar Boltayev", "Diyora Xolmatova", "Elyor Jo'rayev", "Feruza Normatova", "G'ayrat Sobirov",
            "Hilola Ahmedova", "Ilhom Rajabov", "Jamila Vohidova", "Nodirbek Karimov", "Zarina Davlatova",
        ]

        phone_prefixes = ["90", "91", "93", "94", "97", "99"]
        created_students = []

        for idx, full_name in enumerate(uzbek_student_names, start=1):
            email = f"student{idx}@demo.uz"
            prefix = phone_prefixes[(idx - 1) % len(phone_prefixes)]
            phone = f"+998{prefix}{1000000 + idx * 23456 % 8999999}"
            group_idx = (idx - 1) // 5  # 5 students per group across 6 groups
            assigned_group = created_groups[group_idx]
            joined_date = dt.date.today() - dt.timedelta(days=random.randint(30, 180))

            user = User(
                email=email,
                password_hash=hashed_pwd,
                role=UserRole.STUDENT.value,
                full_name=full_name,
            )
            session.add(user)
            session.flush()

            student = Student(
                user_id=user.id,
                phone=phone,
                group_id=assigned_group.id,
                joined_at=joined_date,
            )
            session.add(student)
            session.flush()
            created_students.append(student)

        # ---------------------------------------------------------
        # 5. WEEKLY LESSONS (18)
        # Non-overlapping schedule between 08:00 and 20:00 (Mon-Sat)
        # ---------------------------------------------------------
        # Mon=0, Wed=2, Fri=4
        # Tue=1, Thu=3, Sat=5
        lessons_data = [
            # Group 1 (Teacher 1 - Ingliz tili): Mon, Wed, Fri 09:00-10:30, Room 101
            (created_groups[0].id, 0, "09:00", "10:30", "101"),
            (created_groups[0].id, 2, "09:00", "10:30", "101"),
            (created_groups[0].id, 4, "09:00", "10:30", "101"),

            # Group 2 (Teacher 1 - Ingliz tili): Mon, Wed, Fri 11:00-12:30, Room 101
            (created_groups[1].id, 0, "11:00", "12:30", "101"),
            (created_groups[1].id, 2, "11:00", "12:30", "101"),
            (created_groups[1].id, 4, "11:00", "12:30", "101"),

            # Group 3 (Teacher 2 - Matematika): Mon, Wed, Fri 14:00-15:30, Room 102
            (created_groups[2].id, 0, "14:00", "15:30", "102"),
            (created_groups[2].id, 2, "14:00", "15:30", "102"),
            (created_groups[2].id, 4, "14:00", "15:30", "102"),

            # Group 4 (Teacher 3 - Dasturlash): Tue, Thu, Sat 10:00-11:30, Room Lab
            (created_groups[3].id, 1, "10:00", "11:30", "Lab"),
            (created_groups[3].id, 3, "10:00", "11:30", "Lab"),
            (created_groups[3].id, 5, "10:00", "11:30", "Lab"),

            # Group 5 (Teacher 4 - Rus tili): Tue, Thu, Sat 14:00-15:30, Room 102
            (created_groups[4].id, 1, "14:00", "15:30", "102"),
            (created_groups[4].id, 3, "14:00", "15:30", "102"),
            (created_groups[4].id, 5, "14:00", "15:30", "102"),

            # Group 6 (Teacher 5 - Fizika): Tue, Thu, Sat 16:00-17:30, Room 101
            (created_groups[5].id, 1, "16:00", "17:30", "101"),
            (created_groups[5].id, 3, "16:00", "17:30", "101"),
            (created_groups[5].id, 5, "16:00", "17:30", "101"),
        ]

        created_lessons = []
        for group_id, weekday, start_time, end_time, room in lessons_data:
            lesson = Lesson(
                group_id=group_id,
                weekday=weekday,
                start_time=start_time,
                end_time=end_time,
                room=room,
            )
            session.add(lesson)
            session.flush()
            created_lessons.append(lesson)

        # ---------------------------------------------------------
        # 6. ATTENDANCE HISTORY (Last 2 weeks)
        # Realistic distribution: ~80% present, ~8% late, ~12% absent
        # Does not record attendance for future dates or unfinished lessons
        # ---------------------------------------------------------
        today = dt.date.today()
        current_time_str = dt.datetime.now().strftime("%H:%M")
        start_date = today - dt.timedelta(days=14)

        # Pre-group students by group_id for fast lookup
        group_students = {}
        for s in created_students:
            group_students.setdefault(s.group_id, []).append(s)

        attendance_count = 0
        current_day = start_date
        while current_day <= today:
            day_weekday = current_day.weekday()
            # Find lessons scheduled on this weekday
            day_lessons = [l for l in created_lessons if l.weekday == day_weekday]

            for lesson in day_lessons:
                # If date is today, only record if lesson has already finished
                if current_day == today and lesson.end_time > current_time_str:
                    continue

                students_in_group = group_students.get(lesson.group_id, [])
                for student in students_in_group:
                    # Sample status with fixed weights
                    status = random.choices(
                        [
                            AttendanceStatus.PRESENT.value,
                            AttendanceStatus.LATE.value,
                            AttendanceStatus.ABSENT.value,
                        ],
                        weights=[80, 8, 12],
                        k=1,
                    )[0]

                    att = Attendance(
                        lesson_id=lesson.id,
                        student_id=student.id,
                        date=current_day,
                        status=status,
                    )
                    session.add(att)
                    attendance_count += 1

            current_day += dt.timedelta(days=1)

        # Commit all entities
        session.commit()

        # ---------------------------------------------------------
        # 7. SUMMARY OUTPUT
        # ---------------------------------------------------------
        users_count = session.exec(select(func.count(User.id))).one()
        teachers_count = session.exec(select(func.count(Teacher.id))).one()
        students_count = session.exec(select(func.count(Student.id))).one()
        groups_count = session.exec(select(func.count(Group.id))).one()
        lessons_count = session.exec(select(func.count(Lesson.id))).one()
        final_att_count = session.exec(select(func.count(Attendance.id))).one()

        print("\n" + "=" * 60)
        print("DATABASE SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("Table Record Counts:")
        print(f"  • Users:       {users_count}")
        print(f"  • Teachers:    {teachers_count}")
        print(f"  • Students:    {students_count}")
        print(f"  • Groups:      {groups_count}")
        print(f"  • Lessons:     {lessons_count}")
        print(f"  • Attendance:  {final_att_count}")
        print("-" * 60)
        print(f"Default Password for all accounts: {DEMO_PASSWORD}")
        print("Demo Logins:")
        print("  • Admin:     admin@demo.uz")
        print("  • Teachers:  teacher1@demo.uz ... teacher5@demo.uz")
        print("  • Students:  student1@demo.uz ... student30@demo.uz")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    seed_database()
