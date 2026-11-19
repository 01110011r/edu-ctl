"use client";

import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import type { Teacher } from "@/lib/types";
import {
  useTeachers,
  type TeacherCreateInput,
  type TeacherUpdateInput,
} from "@/hooks/useTeachers";
import { TeacherForm } from "@/components/teachers/TeacherForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RowActions } from "@/components/shared/RowActions";
import { SearchInput } from "@/components/shared/SearchInput";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TeachersPage() {
  const {
    teachers,
    loading,
    error,
    search,
    setSearch,
    create,
    update,
    remove,
  } = useTeachers();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  function openCreate() {
    setSelectedTeacher(null);
    setEmailError("");
    setFormOpen(true);
  }

  function openEdit(teacher: Teacher) {
    setSelectedTeacher(teacher);
    setEmailError("");
    setFormOpen(true);
  }

  function openDelete(teacher: Teacher) {
    setTeacherToDelete(teacher);
    setDeleteOpen(true);
  }

  async function handleSubmit(
    values: TeacherCreateInput | TeacherUpdateInput
  ) {
    setFormLoading(true);
    setEmailError("");
    const requestError = selectedTeacher
      ? await update(selectedTeacher.id, values)
      : await create(values as TeacherCreateInput);
    setFormLoading(false);

    if (requestError) {
      const duplicateEmail =
        requestError.message.toLowerCase().includes("email") ||
        requestError instanceof ApiError && requestError.status === 409;
      if (duplicateEmail) {
        setEmailError(requestError.message);
      }
      toast.error(requestError.message);
      return;
    }

    setFormOpen(false);
    setSelectedTeacher(null);
    toast.success(
      selectedTeacher
        ? "Ustoz ma'lumotlari saqlandi"
        : "Ustoz muvaffaqiyatli qo'shildi"
    );
  }

  async function handleDelete() {
    if (!teacherToDelete) return;
    setDeleteLoading(true);
    const requestError = await remove(teacherToDelete.id);
    setDeleteLoading(false);

    if (requestError) {
      toast.error(requestError.message);
      return;
    }

    setDeleteOpen(false);
    setTeacherToDelete(null);
    toast.success("Ustoz muvaffaqiyatli o'chirildi");
  }

  const columns: DataTableColumn<Teacher>[] = [
    {
      key: "full_name",
      header: "F.I.Sh.",
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(teacher.full_name)}
          </span>
          <span className="font-medium text-foreground">
            {teacher.full_name}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (teacher) => (
        <span className="text-muted-foreground">{teacher.email}</span>
      ),
    },
    {
      key: "phone",
      header: "Telefon",
      render: (teacher) => (
        <span className="text-muted-foreground">{teacher.phone}</span>
      ),
    },
    {
      key: "subject",
      header: "Fan",
      render: (teacher) => (
        <span className="font-medium text-foreground">{teacher.subject}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ustozlar"
        description="O'quv markazi ustozlari ro'yxati"
        action={{
          label: "Ustoz qo'shish",
          icon: <Plus />,
          onClick: openCreate,
        }}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Ism, email, telefon yoki fan bo'yicha qidirish"
      />

      {error && !loading ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        rows={teachers}
        loading={loading}
        onRowClick={openEdit}
        rowActions={(teacher) => (
          <RowActions
            onEdit={() => openEdit(teacher)}
            onDelete={() => openDelete(teacher)}
          />
        )}
        emptyState={
          search.trim() ? (
            <EmptyState
              noSearchResults
              title="Qidiruv natijasi topilmadi"
              description="Boshqa kalit so'z bilan qayta urinib ko'ring."
            />
          ) : (
            <EmptyState
              icon={UserRound}
              title="Hali ustozlar yo'q"
              description="Birinchi ustozingizni qo'shib boshqarishni boshlang."
              action={{
                label: "Birinchi ustozni qo'shing",
                onClick: openCreate,
              }}
            />
          )
        }
      />

      <TeacherForm
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={selectedTeacher}
        loading={formLoading}
        emailError={emailError}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ustozni o'chirish"
        message={
          teacherToDelete
            ? `${teacherToDelete.full_name} ustozini o'chirmoqchimisiz?`
            : "Ustozni o'chirmoqchimisiz?"
        }
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
