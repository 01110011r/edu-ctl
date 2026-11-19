"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { get } from "@/lib/api";
import type { Group, Student } from "@/lib/types";
import type {
  StudentCreateInput,
  StudentUpdateInput,
} from "@/hooks/useStudents";

interface StudentFormValues {
  full_name: string;
  email: string;
  phone: string;
  group_id: string;
  password: string;
}

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  loading: boolean;
  emailError: string;
  onSubmit: (
    values: StudentCreateInput | StudentUpdateInput
  ) => void | Promise<void>;
}

type FieldErrors = Partial<Record<keyof StudentFormValues, string>>;

export function StudentForm({
  open,
  onOpenChange,
  student,
  loading,
  emailError,
  onSubmit,
}: StudentFormProps) {
  const [values, setValues] = useState<StudentFormValues>({
    full_name: "",
    email: "",
    phone: "",
    group_id: "none",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!open) return;
    setValues({
      full_name: student?.full_name ?? "",
      email: student?.email ?? "",
      phone: student?.phone ?? "",
      group_id:
        student?.group_id !== null && student?.group_id !== undefined
          ? String(student.group_id)
          : "none",
      password: "",
    });
    setErrors({});

    void get<Group[]>("/groups")
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [open, student]);

  function updateField(field: keyof StudentFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit() {
    const nextErrors: FieldErrors = {};
    if (!values.full_name.trim()) {
      nextErrors.full_name = "F.I.Sh. majburiy";
    }
    if (!values.email.trim()) {
      nextErrors.email = "Email majburiy";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Email formati noto'g'ri";
    }
    if (!values.phone.trim()) {
      nextErrors.phone = "Telefon majburiy";
    }
    if (!student && !values.password) {
      nextErrors.password = "Parol majburiy";
    } else if (values.password && values.password.length < 6) {
      nextErrors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const groupId =
      values.group_id === "none" ? null : Number(values.group_id);

    if (student) {
      await onSubmit({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        group_id: groupId,
        ...(values.password ? { password: values.password } : {}),
      });
      return;
    }

    await onSubmit({
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      password: values.password,
      phone: values.phone.trim(),
      group_id: groupId,
    });
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={student ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
      description={
        student
          ? "O'quvchi ma'lumotlarini yangilang"
          : "Yangi o'quvchi va unga kirish hisobini yarating"
      }
      submitLabel={student ? "Saqlash" : "Qo'shish"}
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4">
        {(
          [
            ["full_name", "F.I.Sh.", "text"],
            ["email", "Email", "email"],
            ["phone", "Telefon", "tel"],
          ] as const
        ).map(([field, label, type]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`student-${field}`}>{label}</Label>
            <Input
              id={`student-${field}`}
              type={type}
              value={values[field]}
              onChange={(event) => updateField(field, event.target.value)}
              disabled={loading}
              aria-invalid={
                Boolean(errors[field] || (field === "email" && emailError))
              }
            />
            {errors[field] ? (
              <p className="text-xs leading-4 text-danger">{errors[field]}</p>
            ) : null}
            {field === "email" && emailError ? (
              <p className="text-xs leading-4 text-danger">{emailError}</p>
            ) : null}
          </div>
        ))}

        <div className="space-y-2">
          <Label>Guruh</Label>
          <Select
            value={values.group_id}
            onValueChange={(value) => updateField("group_id", value ?? "none")}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {values.group_id === "none"
                  ? "Guruhsiz"
                  : groups.find((group) => String(group.id) === values.group_id)
                      ?.name ?? "Guruhni tanlang"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Guruhsiz</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-password">
            {student ? "Yangi parol (ixtiyoriy)" : "Parol"}
          </Label>
          <Input
            id="student-password"
            type="password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            disabled={loading}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="text-xs leading-4 text-danger">{errors.password}</p>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
