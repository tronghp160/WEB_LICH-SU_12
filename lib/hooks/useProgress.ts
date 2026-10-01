"use client";

import { useSyncExternalStore } from "react";
import { markLessonStudied, parseProgress, PROGRESS_KEY, recordQuiz, type Progress } from "@/lib/progress/progress";

// Đọc/ghi tiến độ học tập trong localStorage (GĐ4.4). localStorage có thể bị chặn (chế độ riêng tư, trình duyệt
// của trường tắt lưu trữ) → mọi thao tác bọc try/catch; hỏng thì trang vẫn chạy, chỉ không nhớ được tiến độ.

const CHANGE_EVENT = "ls12:tien-do-doi";

let cached: { raw: string | null; value: Progress } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROGRESS_KEY);
  } catch {
    return null;
  }
}

/** Ảnh chụp ổn định cho useSyncExternalStore: chỉ tạo object mới khi chuỗi đã lưu thay đổi. */
function getSnapshot(): Progress {
  const raw = readRaw();
  if (!cached || cached.raw !== raw) cached = { raw, value: parseProgress(raw) };
  return cached.value;
}

function subscribe(onChange: () => void) {
  // "storage": thay đổi từ tab khác; CHANGE_EVENT: thay đổi trong chính tab này.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function update(change: (progress: Progress) => Progress) {
  const current = getSnapshot();
  const next = change(current);
  if (next === current) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Tiến độ đã lưu; `null` khi render ở server và lần hydrate đầu (chưa đọc được trình duyệt). */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function saveQuizResult(setId: string, score: number, total: number) {
  update((progress) => recordQuiz(progress, setId, score, total, new Date()));
}

export function saveLessonStudied(slug: string) {
  update((progress) => markLessonStudied(progress, slug, new Date()));
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
