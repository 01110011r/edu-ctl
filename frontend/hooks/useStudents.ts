"use client";

import { useCallback, useEffect, useState } from "react";
import { del, get, post, put } from "@/lib/api";
import type { Student } from "@/lib/types";

export interface StudentCreateInput {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  group_id: number | null;
}

export type StudentUpdateInput = Omit<StudentCreateInput, "password"> & {
  password?: string;
};

export function useStudents(initialSearch = "", initialGroupId: number | null = null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [groupId, setGroupId] = useState<number | null>(initialGroupId);

  const refetch = useCallback(async (
    searchValue = search,
    groupValue = groupId
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) params.set("search", searchValue.trim());
      if (groupValue !== null) params.set("group_id", String(groupValue));
      const query = params.size ? `?${params.toString()}` : "";
      const data = await get<Student[]>(`/students${query}`);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'quvchilar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [search, groupId]);

  useEffect(() => {
    void refetch(search, groupId);
  }, [search, groupId, refetch]);

  async function create(input: StudentCreateInput): Promise<Error | null> {
    try {
      await post<Student>("/students", input);
      await refetch(search, groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("O'quvchini qo'shib bo'lmadi");
    }
  }

  async function update(
    id: number,
    input: StudentUpdateInput
  ): Promise<Error | null> {
    try {
      await put<Student>(`/students/${id}`, input);
      await refetch(search, groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("O'quvchini saqlab bo'lmadi");
    }
  }

  async function remove(id: number): Promise<Error | null> {
    try {
      await del<{ detail: string }>(`/students/${id}`);
      await refetch(search, groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("O'quvchini o'chirib bo'lmadi");
    }
  }

  return {
    students,
    loading,
    error,
    search,
    setSearch,
    groupId,
    setGroupId,
    refetch,
    create,
    update,
    remove,
  };
}
