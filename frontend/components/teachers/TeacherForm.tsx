"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Teacher } from "@/lib/types";
import type { TeacherCreateInput, TeacherUpdateInput } from "@/hooks/useTeachers";

interface TeacherFormValues {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  password: string;
}

interface TeacherFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
  loading: boolean;
  emailError: string;
  onSubmit: (
    values: TeacherCreateInput | TeacherUpdateInput
  ) => void | Promise<void>;
}

type FieldErrors = Partial<Record<keyof TeacherFormValues, string>>;

export function TeacherForm({
  open,
  onOpenChange,
  teacher,
  loading,
  emailError,
  onSubmit,
}: TeacherFormProps) {
  const [values, setValues] = useState<TeacherFormValues>({
    full_name: "",
    email: "",
    phone: "",
    subject: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setValues({
      full_name: teacher?.full_name ?? "",
      email: teacher?.email ?? "",
      phone: teacher?.phone ?? "",
      subject: teacher?.subject ?? "",
      password: "",
    });
    setErrors({});
  }, [open, teacher]);

  function updateField(field: keyof TeacherFormValues, value: string) {
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
    if (!values.subject.trim()) {
      nextErrors.subject = "Fan majburiy";
    }
    if (!teacher && !values.password) {
      nextErrors.password = "Parol majburiy";
    } else if (values.password && values.password.length < 6) {
      nextErrors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (teacher) {
      await onSubmit({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        subject: values.subject.trim(),
        ...(values.password ? { password: values.password } : {}),
      });
      return;
    }

    await onSubmit({
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      password: values.password,
      phone: values.phone.trim(),
      subject: values.subject.trim(),
    });
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={teacher ? "Ustozni tahrirlash" : "Yangi ustoz"}
      description={
        teacher
          ? "Ustoz ma'lumotlarini yangilang"
          : "Yangi ustoz va unga kirish hisobini yarating"
      }
      submitLabel={teacher ? "Saqlash" : "Qo'shish"}
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4">
        {(
          [
            ["full_name", "F.I.Sh.", "text"],
            ["email", "Email", "email"],
            ["phone", "Telefon", "tel"],
            ["subject", "Fan", "text"],
          ] as const
        ).map(([field, label, type]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`teacher-${field}`}>{label}</Label>
            <Input
              id={`teacher-${field}`}
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
          <Label htmlFor="teacher-password">
            {teacher ? "Yangi parol (ixtiyoriy)" : "Parol"}
          </Label>
          <Input
            id="teacher-password"
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
