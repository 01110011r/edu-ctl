"use client";

import { useCallback, useEffect, useState } from "react";
import { del, get, post, put } from "@/lib/api";
import type { Teacher } from "@/lib/types";

export interface TeacherCreateInput {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  subject: string;
}

export type TeacherUpdateInput = Omit<TeacherCreateInput, "password"> & {
  password?: string;
};

export function useTeachers(initialSearch = "") {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);

  const refetch = useCallback(async (searchValue = search) => {
    setLoading(true);
    setError(null);
    try {
      const query = searchValue.trim()
        ? `?search=${encodeURIComponent(searchValue.trim())}`
        : "";
      const data = await get<Teacher[]>(`/teachers${query}`);
      setTeachers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ustozlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void refetch(search);
  }, [search, refetch]);

  async function create(input: TeacherCreateInput): Promise<Error | null> {
    try {
      await post<Teacher>("/teachers", input);
      await refetch(search);
      return null;
    } catch (err) {
      return err instanceof Error ? err : new Error("Ustoz qo'shib bo'lmadi");
    }
  }

  async function update(
    id: number,
    input: TeacherUpdateInput
  ): Promise<Error | null> {
    try {
      await put<Teacher>(`/teachers/${id}`, input);
      await refetch(search);
      return null;
    } catch (err) {
      return err instanceof Error ? err : new Error("Ustozni saqlab bo'lmadi");
    }
  }

  async function remove(id: number): Promise<Error | null> {
    try {
      await del<{ detail: string }>(`/teachers/${id}`);
      await refetch(search);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("Ustozni o'chirib bo'lmadi");
    }
  }

  return {
    teachers,
    loading,
    error,
    search,
    setSearch,
    refetch,
    create,
    update,
    remove,
  };
}
