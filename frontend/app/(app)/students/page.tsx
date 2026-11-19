"use client";

import { useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { ApiError, get } from "@/lib/api";
import type { Group, Student } from "@/lib/types";
import {
  useStudents,
  type StudentCreateInput,
  type StudentUpdateInput,
} from "@/hooks/useStudents";
import { StudentForm } from "@/components/students/StudentForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RowActions } from "@/components/shared/RowActions";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function StudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const {
    students,
    loading,
    error,
    search,
    setSearch,
    groupId,
    setGroupId,
    create,
    update,
    remove,
  } = useStudents();

  const [groups, setGroups] = useState<Group[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    void get<Group[]>("/groups")
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  function openCreate() {
    if (!isAdmin) return;
    setSelectedStudent(null);
    setEmailError("");
    setFormOpen(true);
  }

  function openEdit(student: Student) {
    if (!isAdmin) return;
    setSelectedStudent(student);
    setEmailError("");
    setFormOpen(true);
  }

  function openDelete(student: Student) {
    if (!isAdmin) return;
    setStudentToDelete(student);
    setDeleteOpen(true);
  }

  async function handleSubmit(
    values: StudentCreateInput | StudentUpdateInput
  ) {
    setFormLoading(true);
    setEmailError("");
    const requestError = selectedStudent
      ? await update(selectedStudent.id, values)
      : await create(values as StudentCreateInput);
    setFormLoading(false);

    if (requestError) {
      const duplicateEmail =
        requestError.message.toLowerCase().includes("email") ||
        (requestError instanceof ApiError && requestError.status === 409);
      if (duplicateEmail) setEmailError(requestError.message);
      toast.error(requestError.message);
      return;
    }

    setFormOpen(false);
    setSelectedStudent(null);
    toast.success(
      selectedStudent
        ? "O'quvchi ma'lumotlari saqlandi"
        : "O'quvchi muvaffaqiyatli qo'shildi"
    );
  }

  async function handleDelete() {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    const requestError = await remove(studentToDelete.id);
    setDeleteLoading(false);

    if (requestError) {
      toast.error(requestError.message);
      return;
    }

    setDeleteOpen(false);
    setStudentToDelete(null);
    toast.success("O'quvchi muvaffaqiyatli o'chirildi");
  }

  const columns: DataTableColumn<Student>[] = [
    {
      key: "full_name",
      header: "F.I.Sh.",
      render: (student) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(student.full_name)}
          </span>
          <span className="font-medium text-foreground">
            {student.full_name}
          </span>
        </div>
      ),
    },
    {
      key: "group_name",
      header: "Guruh",
      render: (student) =>
        student.group_name ? (
          <StatusBadge variant="neutral">{student.group_name}</StatusBadge>
        ) : (
          <span className="text-muted-foreground">Guruhsiz</span>
        ),
    },
    {
      key: "email",
      header: "Email",
      render: (student) => (
        <span className="text-muted-foreground">{student.email}</span>
      ),
    },
    {
      key: "phone",
      header: "Telefon",
      render: (student) => (
        <span className="text-muted-foreground">{student.phone}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="O'quvchilar"
        description="O'quv markazi o'quvchilari ro'yxati"
        action={
          isAdmin
            ? {
                label: "O'quvchi qo'shish",
                icon: <Plus />,
                onClick: openCreate,
              }
            : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Ism, email yoki telefon bo'yicha qidirish"
        />
        <Select
          value={groupId === null ? "all" : String(groupId)}
          onValueChange={(value) =>
            setGroupId(value === "all" ? null : Number(value))
          }
        >
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue>
              {groupId === null
                ? "Barcha guruhlar"
                : groups.find((group) => group.id === groupId)?.name ??
                  "Guruhni tanlang"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha guruhlar</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !loading ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        rows={students}
        loading={loading}
        onRowClick={isAdmin ? openEdit : undefined}
        rowActions={
          isAdmin
            ? (student) => (
                <RowActions
                  onEdit={() => openEdit(student)}
                  onDelete={() => openDelete(student)}
                />
              )
            : undefined
        }
        emptyState={
          search.trim() || groupId !== null ? (
            <EmptyState
              noSearchResults
              title="Qidiruv natijasi topilmadi"
              description="Boshqa kalit so'z yoki guruh bilan qayta urinib ko'ring."
            />
          ) : (
            <EmptyState
              icon={UserRound}
              title="Hali o'quvchilar yo'q"
              description="O'quvchilar ro'yxatini boshqarish uchun birinchi o'quvchini qo'shing."
              action={
                isAdmin
                  ? {
                      label: "Birinchi o'quvchini qo'shing",
                      onClick: openCreate,
                    }
                  : undefined
              }
            />
          )
        }
      />

      {isAdmin ? (
        <>
          <StudentForm
            open={formOpen}
            onOpenChange={setFormOpen}
            student={selectedStudent}
            loading={formLoading}
            emailError={emailError}
            onSubmit={handleSubmit}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="O'quvchini o'chirish"
            message={
              studentToDelete
                ? `${studentToDelete.full_name} o'quvchini o'chirmoqchimisiz?`
                : "O'quvchini o'chirmoqchimisiz?"
            }
            loading={deleteLoading}
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </div>
  );
}
