// Lời giải "sai ở đâu – bài nào – mục nào" (docs/ke-hoach-demo-luyen-thi.md, GĐ-D1, mục 4.4–4.5): nhãn vị trí kiến thức
// "Bài 7 › Mục 3. …" kèm liên kết tới đúng neo của trang Bài, và khối "Kiến thức cần ôn lại" gom các câu chưa đạt theo
// bài / mục. Tên bài, mục lấy từ khung SGK trong code (không lưu trong database). Hàm thuần, dùng được ở client.

import type { AttemptQuestion, AttemptRef } from "@/lib/exams/attempt";
import { examPaths } from "@/lib/exams/exam";
import { lessonCatalog } from "@/lib/lessons/catalog";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";

export type KnowledgeLocation = {
  /** "Bài 7 › Mục 3. Giai đoạn 1951–1954 và chiến dịch Điện Biên Phủ", hoặc vị trí dạng chữ (câu lớp 11). */
  label: string;
  /** Liên kết tới bài / mục trên web; null khi web chưa có trang (lớp 11). */
  href: string | null;
  lessonSlug: string | null;
  sectionId: string | null;
};

type RefLike = Pick<AttemptRef, "lessonSlug" | "sectionId" | "ref">;

/**
 * Vị trí kiến thức của một lựa chọn / ý / cả câu. Bài trống thì lấy bài của câu (`fallbackLesson`). Có bài trong khung
 * SGK → nhãn + liên kết (tới mục nếu có); không có mà có `ref` → nhãn chữ, không liên kết; không có gì → null.
 */
export function knowledgeLocation(ref: RefLike, fallbackLesson: string | null = null): KnowledgeLocation | null {
  const lessonSlug = ref.lessonSlug ?? fallbackLesson;
  const lesson = lessonSlug ? getSgkLesson(lessonSlug) : undefined;
  if (lesson) {
    const section = ref.sectionId ? lesson.sections.find((item) => item.id === ref.sectionId) : undefined;
    return {
      label: section ? `Bài ${lesson.number} › Mục ${section.numeral}. ${section.title}` : `Bài ${lesson.number}. ${lesson.shortTitle}`,
      href: section ? sgkPaths.section(lesson.slug, section.id) : sgkPaths.lesson(lesson.slug),
      lessonSlug: lesson.slug,
      sectionId: section?.id ?? null,
    };
  }
  if (ref.ref) return { label: ref.ref, href: null, lessonSlug: null, sectionId: null };
  return null;
}

/** Vị trí kiến thức chính của cả câu (bài + mục của câu; câu lớp 11: chủ đề). */
export function questionLocation(question: Pick<AttemptQuestion, "lessonSlug" | "sectionId" | "topicTag">): KnowledgeLocation | null {
  return (
    knowledgeLocation({ lessonSlug: question.lessonSlug, sectionId: question.sectionId, ref: null }) ??
    (question.topicTag ? { label: question.topicTag, href: null, lessonSlug: null, sectionId: null } : null)
  );
}

/**
 * Chuyên đề tương tác (bài học có bản đồ phim, mô hình…) học sâu cho mục của câu — liên kết "Liên quan" ở lời giải.
 * Không có mục thì lấy mọi chuyên đề của bài.
 */
export function relatedFeatures(lessonSlug: string | null, sectionId: string | null): { href: string; label: string }[] {
  const lesson = lessonSlug ? getSgkLesson(lessonSlug) : undefined;
  if (!lesson) return [];
  const sections = sectionId ? lesson.sections.filter((section) => section.id === sectionId) : lesson.sections;
  const slugs = [...new Set(sections.flatMap((section) => section.featureSlugs ?? []))];
  return slugs.flatMap((slug) => {
    const entry = lessonCatalog.find((item) => item.slug === slug);
    return entry ? [{ href: `/bai-hoc/${entry.slug}`, label: entry.title }] : [];
  });
}

export type ReviewHint = {
  key: string;
  location: KnowledgeLocation;
  /** Số câu chưa đạt điểm tối đa / số câu đã chấm trong nhóm. */
  wrong: number;
  total: number;
  /** "Luyện 10 câu bài này" — chỉ khi nhóm thuộc một bài lớp 12. */
  practiceHref: string | null;
};

export const REVIEW_HINT_LIMIT = 5;

const fullMilli = (question: Pick<AttemptQuestion, "kind">) => (question.kind === "mcq" ? 250 : 1000);

/**
 * "Kiến thức cần ôn lại": gom câu đã chấm theo (bài, mục) — câu lớp 11 theo chủ đề — rồi giữ các nhóm có câu chưa đạt
 * tối đa, nhiều câu sai trước (bằng nhau thì tỉ lệ sai cao trước), tối đa 5 dòng. Lượt luyện tập chỉ tính câu đã kiểm tra.
 */
export function reviewHints(questions: readonly AttemptQuestion[], practice: boolean, limit = REVIEW_HINT_LIMIT): ReviewHint[] {
  const groups = new Map<string, ReviewHint>();
  for (const question of questions) {
    if (practice && !question.checked) continue;
    if (question.earnedMilli === null) continue;
    const location = questionLocation(question);
    if (!location) continue;
    const key = location.lessonSlug ? `${location.lessonSlug}#${location.sectionId ?? ""}` : `chu-de:${location.label}`;
    const group = groups.get(key) ?? {
      key,
      location,
      wrong: 0,
      total: 0,
      practiceHref: location.lessonSlug ? examPaths.practiceLesson(location.lessonSlug) : null,
    };
    group.total += 1;
    if (question.earnedMilli < fullMilli(question)) group.wrong += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total || a.location.label.localeCompare(b.location.label, "vi"))
    .slice(0, limit);
}
