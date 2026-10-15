// Ma trận đề tự sinh (docs/ke-hoach-luyen-thi.md, mục 4.4). ĐÂY LÀ MA TRẬN DO WEB TỰ ĐẶT để luyện tập, KHÔNG phải ma
// trận chính thức của Bộ GD&ĐT; tỉ lệ mức độ và phân bố chủ đề là giá trị gợi ý, cần giáo viên Lịch sử xem lại (mục 9 —
// quyết định 7). Phân bố theo bài tỉ lệ với SỐ TIẾT trong lib/sgk/curriculum.ts.

import { LEVEL_MIX_SUGGESTED, suggestedMinutes, THPT_2025 } from "@/lib/exams/format";
import type { ExamItemLevel } from "@/lib/exams/items";
import { SGK_12 } from "@/lib/sgk/curriculum";

export type BlueprintSection = { section: 1 | 2; kind: "mcq" | "true_false"; count: number; minWithPassage?: number };

export type Blueprint = {
  /** Lưu ở exam_attempts.blueprint: thpt_2025 | quick_15 | tf_only | chu-de-N. */
  id: string;
  label: string;
  description: string;
  durationMin: number;
  sections: BlueprintSection[];
  levelMix: Record<ExamItemLevel, number>;
  /** Chỉ chọn câu của các bài này (đề theo chủ đề); null = mọi bài. */
  lessons: string[] | null;
};

const total = (sections: BlueprintSection[]) => sections.reduce((sum, part) => sum + part.count, 0);

export const BLUEPRINTS: Blueprint[] = [
  {
    id: "thpt_2025",
    label: "Đề đầy đủ như đề thi thật",
    description: `24 câu trắc nghiệm + 4 câu Đúng/Sai, ${THPT_2025.durationMin} phút. Câu rải khắp các bài theo số tiết.`,
    durationMin: THPT_2025.durationMin,
    sections: [
      { section: 1, kind: "mcq", count: 24 },
      { section: 2, kind: "true_false", count: 4, minWithPassage: 2 },
    ],
    levelMix: { ...LEVEL_MIX_SUGGESTED },
    lessons: null,
  },
  {
    id: "quick_15",
    label: "Đề 15 phút",
    description: "10 câu trắc nghiệm + 1 câu Đúng/Sai — làm nhanh mỗi ngày.",
    durationMin: suggestedMinutes(10, 1) - 3,
    sections: [
      { section: 1, kind: "mcq", count: 10 },
      { section: 2, kind: "true_false", count: 1 },
    ],
    levelMix: { ...LEVEL_MIX_SUGGESTED },
    lessons: null,
  },
  {
    id: "tf_only",
    label: "Chỉ câu Đúng/Sai",
    description: "8 câu Đúng/Sai — luyện riêng phần phân hóa mạnh nhất của đề thi.",
    durationMin: suggestedMinutes(0, 8),
    sections: [{ section: 2, kind: "true_false", count: 8, minWithPassage: 3 }],
    levelMix: { nhan_biet: 0.2, thong_hieu: 0.4, van_dung: 0.4 },
    lessons: null,
  },
  ...SGK_12.map(
    (topic): Blueprint => ({
      id: topic.slug,
      label: `Chủ đề ${topic.number}: ${topic.shortTitle}`,
      description: "16 câu trắc nghiệm + 2 câu Đúng/Sai, chỉ trong chủ đề này.",
      durationMin: suggestedMinutes(16, 2),
      sections: [
        { section: 1, kind: "mcq", count: 16 },
        { section: 2, kind: "true_false", count: 2 },
      ],
      levelMix: { ...LEVEL_MIX_SUGGESTED },
      lessons: topic.lessons.map((lesson) => lesson.slug),
    }),
  ),
];

export function getBlueprint(id: string): Blueprint | null {
  return BLUEPRINTS.find((blueprint) => blueprint.id === id) ?? null;
}

export const blueprintSize = (blueprint: Blueprint) => total(blueprint.sections);

/** Trọng số mỗi bài = số tiết (chỉ các bài trong ma trận). */
export function lessonWeights(blueprint: Blueprint): Map<string, number> {
  const weights = new Map<string, number>();
  for (const topic of SGK_12) for (const lesson of topic.lessons) if (!blueprint.lessons || blueprint.lessons.includes(lesson.slug)) weights.set(lesson.slug, lesson.periods);
  return weights;
}

/** Thứ tự bài trong khung SGK — để xếp câu trong đề theo tiến trình bài học. */
export const lessonOrder = new Map(SGK_12.flatMap((topic) => topic.lessons).map((lesson, index) => [lesson.slug, index]));
