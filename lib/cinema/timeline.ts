import { clamp, smoothstep } from "@/lib/cinema/math";
import type { Chapter, FactLabel, FilmScript, Subtitle } from "@/lib/cinema/types";

/** Thời gian hiển thị thẻ tên chương (giây). */
export const CHAPTER_CARD_SECONDS = 3.6;

export function subtitleAt(script: Pick<FilmScript, "subtitles">, t: number): Subtitle | null {
  return script.subtitles.find((s) => t >= s.t0 && t < s.t1) ?? null;
}

/** Chương đang chạy ở thời điểm t (chương cuối nếu đã qua hết). */
export function chapterAt(script: Pick<FilmScript, "chapters">, t: number): { index: number; chapter: Chapter } {
  let index = 0;
  script.chapters.forEach((chapter, i) => {
    if (t >= chapter.t) index = i;
  });
  return { index, chapter: script.chapters[index] };
}

/** Thẻ tên chương: hiện rồi mờ dần trong CHAPTER_CARD_SECONDS đầu của mỗi chương. `alpha` ∈ [0, 1]. */
export function chapterCardAt(script: Pick<FilmScript, "chapters">, t: number): { chapter: Chapter; alpha: number } | null {
  const { chapter } = chapterAt(script, t);
  const age = t - chapter.t;
  if (age < 0 || age > CHAPTER_CARD_SECONDS) return null;
  const alpha = smoothstep(0, 0.5, age) * (1 - smoothstep(CHAPTER_CARD_SECONDS - 0.9, CHAPTER_CARD_SECONDS, age));
  return { chapter, alpha };
}

/** Mức trời sáng: 0 = đêm, 1 = rạng sáng. */
export function dawnAt(script: Pick<FilmScript, "dawn">, t: number): number {
  return smoothstep(script.dawn[0], script.dawn[1], t);
}

export function labelsAt(script: Pick<FilmScript, "labels">, t: number): (FactLabel & { alpha: number })[] {
  return script.labels
    .filter((label) => t >= label.t0 && t <= label.t1)
    .map((label) => ({ ...label, alpha: smoothstep(label.t0, label.t0 + 0.8, t) * (1 - smoothstep(label.t1 - 0.8, label.t1, t)) }));
}

/** Định dạng mm:ss. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export const clampTime = (script: Pick<FilmScript, "duration">, t: number) => clamp(t, 0, script.duration);
