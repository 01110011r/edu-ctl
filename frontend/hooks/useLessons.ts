"use client";

import { useCallback, useEffect, useState } from "react";
import { del, get, post, put } from "@/lib/api";
import type { Group, Lesson } from "@/lib/types";

export interface LessonInput {
  group_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string;
}

export function useLessons(initialGroupId: number | null = null) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<number | null>(initialGroupId);

  const refetch = useCallback(async (groupValue = groupId) => {
    setLoading(true);
    setError(null);
    try {
      const query =
        groupValue !== null
          ? `?group_id=${encodeURIComponent(String(groupValue))}`
          : "";
      const [lessonData, groupData] = await Promise.all([
        get<Lesson[]>(`/lessons${query}`),
        get<Group[]>("/groups"),
      ]);
      setLessons(lessonData);
      setGroups(groupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dars jadvali yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void refetch(groupId);
  }, [groupId, refetch]);

  async function create(input: LessonInput): Promise<Error | null> {
    try {
      await post<Lesson>("/lessons", input);
      await refetch(groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("Dars qo'shib bo'lmadi");
    }
  }

  async function update(id: number, input: LessonInput): Promise<Error | null> {
    try {
      await put<Lesson>(`/lessons/${id}`, input);
      await refetch(groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("Darsni saqlab bo'lmadi");
    }
  }

  async function remove(id: number): Promise<Error | null> {
    try {
      await del<{ detail: string }>(`/lessons/${id}`);
      await refetch(groupId);
      return null;
    } catch (err) {
      return err instanceof Error
        ? err
        : new Error("Darsni o'chirib bo'lmadi");
    }
  }

  return {
    lessons,
    groups,
    loading,
    error,
    groupId,
    setGroupId,
    refetch,
    create,
    update,
    remove,
  };
}
