// Tiến độ học tập và "Hộ chiếu lịch sử" (GĐ4.4): lưu trong localStorage của trình duyệt, không cần đăng nhập.
// Hàm thuần — unit test được; đọc/ghi trình duyệt ở lib/hooks/useProgress.ts.

import { z } from "zod";
import { quizPaths, quizSetIds } from "@/lib/quiz/sets";

/** Khóa localStorage. Đổi cấu trúc dữ liệu thì tăng `v` và viết hàm chuyển đổi trong parseProgress. */
export const PROGRESS_KEY = "ls12:tien-do";

/** Đạt từ 70% số điểm (7/10 câu) thì được đóng dấu. */
export const PASS_RATIO = 0.7;

export type QuizRecord = {
  /** Điểm cao nhất (số câu đúng; trò đoán năm: tổng điểm). */
  best: number;
  /** Điểm tối đa của lượt đạt điểm cao nhất. */
  total: number;
  attempts: number;
  /** Lần đầu đạt ngưỡng đóng dấu (ISO). */
  passedAt?: string;
  lastAt: string;
};

/** Tiến độ đọc một Bài SGK (/bai/[slug]): các mục đã đọc tới và mục đọc gần nhất. */
export type SgkLessonRecord = {
  /** id mục → lần đầu đọc tới (ISO). */
  sections: Record<string, string>;
  lastSection?: string;
  lastAt: string;
};

export type Progress = {
  v: 1;
  /** Chuyên đề tương tác (lib/lessons) đã đọc tới phần ôn tập cuối bài. */
  lessons: Record<string, { studiedAt: string }>;
  /** Kết quả trắc nghiệm theo bộ (khóa: quizSetIds trong lib/quiz/sets). */
  quizzes: Record<string, QuizRecord>;
  /**
   * Bài SGK đã đọc tới mục nào (khóa: slug trong lib/sgk/curriculum). Trường thêm sau, không bắt buộc trong dữ liệu
   * đã lưu → không cần tăng `v`, tiến độ và con dấu cũ giữ nguyên.
   */
  sgk: Record<string, SgkLessonRecord>;
};

export const emptyProgress: Progress = { v: 1, lessons: {}, quizzes: {}, sgk: {} };

const quizRecordSchema = z.object({
  best: z.number().int().min(0),
  total: z.number().int().positive(),
  attempts: z.number().int().positive(),
  passedAt: z.string().optional(),
  lastAt: z.string(),
});
const lessonRecordSchema = z.object({ studiedAt: z.string() });
const sgkRecordSchema = z.object({
  sections: z.record(z.string(), z.string()),
  lastSection: z.string().optional(),
  lastAt: z.string(),
});
const progressSchema = z.object({
  v: z.literal(1),
  lessons: z.record(z.string(), z.unknown()),
  quizzes: z.record(z.string(), z.unknown()),
  sgk: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Đọc dữ liệu đã lưu. Dữ liệu hỏng/không đúng phiên bản → tiến độ trống; từng mục hỏng thì bỏ riêng mục đó
 * (người dùng có thể sửa localStorage bằng tay, không để cả trang lỗi).
 */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyProgress;
  }
  const parsed = progressSchema.safeParse(json);
  if (!parsed.success) return emptyProgress;

  const lessons: Progress["lessons"] = {};
  for (const [slug, value] of Object.entries(parsed.data.lessons)) {
    const record = lessonRecordSchema.safeParse(value);
    if (record.success) lessons[slug] = record.data;
  }
  const quizzes: Progress["quizzes"] = {};
  for (const [id, value] of Object.entries(parsed.data.quizzes)) {
    const record = quizRecordSchema.safeParse(value);
    if (record.success && record.data.best <= record.data.total) quizzes[id] = record.data;
  }
  const sgk: Progress["sgk"] = {};
  for (const [slug, value] of Object.entries(parsed.data.sgk ?? {})) {
    const record = sgkRecordSchema.safeParse(value);
    if (record.success) sgk[slug] = record.data;
  }
  return { v: 1, lessons, quizzes, sgk };
}

export function isPassing(score: number, total: number): boolean {
  return total > 0 && score / total >= PASS_RATIO;
}

/** Ghi một lượt trắc nghiệm: giữ điểm cao nhất (so theo tỉ lệ), đếm số lượt, nhớ lần đầu đạt ngưỡng. */
export function recordQuiz(progress: Progress, setId: string, score: number, total: number, now: Date): Progress {
  if (total <= 0) return progress;
  const at = now.toISOString();
  const previous = progress.quizzes[setId];
  const better = !previous || score / total > previous.best / previous.total;
  const record: QuizRecord = {
    best: better ? score : previous.best,
    total: better ? total : previous.total,
    attempts: (previous?.attempts ?? 0) + 1,
    passedAt: previous?.passedAt ?? (isPassing(score, total) ? at : undefined),
    lastAt: at,
  };
  return { ...progress, quizzes: { ...progress.quizzes, [setId]: record } };
}

/** Đánh dấu đã học bài (chỉ ghi lần đầu). */
export function markLessonStudied(progress: Progress, slug: string, now: Date): Progress {
  if (progress.lessons[slug]) return progress;
  return { ...progress, lessons: { ...progress.lessons, [slug]: { studiedAt: now.toISOString() } } };
}

/** Ghi đã đọc tới một mục của Bài SGK (mục đọc lần đầu thì nhớ thời điểm; luôn cập nhật "mục gần nhất"). */
export function recordSectionRead(progress: Progress, lessonSlug: string, sectionId: string, now: Date): Progress {
  const at = now.toISOString();
  const previous = progress.sgk[lessonSlug];
  if (previous?.lastSection === sectionId && previous.sections[sectionId]) return progress;
  const record: SgkLessonRecord = {
    sections: { ...previous?.sections, [sectionId]: previous?.sections[sectionId] ?? at },
    lastSection: sectionId,
    lastAt: at,
  };
  return { ...progress, sgk: { ...progress.sgk, [lessonSlug]: record } };
}

/** Tỉ lệ mục đã đọc của một bài (0–1), chỉ tính các mục còn có trong khung bài. */
export function lessonCompletion(progress: Progress, lessonSlug: string, sectionIds: readonly string[]): number {
  const record = progress.sgk[lessonSlug];
  if (!record || sectionIds.length === 0) return 0;
  return sectionIds.filter((id) => record.sections[id]).length / sectionIds.length;
}

/** Bài SGK đọc gần nhất (để hiện nút "Học tiếp"). */
export function latestSgkLesson(progress: Progress): { slug: string; record: SgkLessonRecord } | undefined {
  let latest: { slug: string; record: SgkLessonRecord } | undefined;
  for (const [slug, record] of Object.entries(progress.sgk)) {
    if (!latest || record.lastAt > latest.record.lastAt) latest = { slug, record };
  }
  return latest;
}

export type StampKind = "lesson" | "topic" | "special";

/** Một con dấu có thể nhận: đạt bộ trắc nghiệm `setId` từ 70% trở lên. */
export type StampDef = {
  setId: string;
  kind: StampKind;
  title: string;
  /** Dòng chữ nhỏ trên con dấu (năm, mốc thời gian). */
  motto: string;
  href: string;
  requirement: string;
};

export type Stamp = StampDef & { earnedAt?: string; record?: QuizRecord };

type StampCatalogInput = {
  /** Bài SGK có đủ câu trắc nghiệm (bộ /trac-nghiem/bai/[slug]). */
  sgkLessons?: readonly { slug: string; number: number; shortTitle: string }[];
  /** Chuyên đề tương tác có đủ câu trắc nghiệm. */
  lessons: readonly { slug: string; title: string; dateText: string }[];
  /** Chủ đề có đủ câu trắc nghiệm. */
  topics: readonly { slug: string; name: string }[];
  hasAllQuiz: boolean;
  hasYearGame: boolean;
};

/** Mốc năm trong tên chủ đề cho con dấu: "Cuộc kháng chiến chống thực dân Pháp (1945–1954)" → "1945–1954". */
export function yearsInName(name: string): string | undefined {
  const range = /(\d{4})\s*[–-]\s*(\d{4})/.exec(name);
  if (range) return `${range[1]}–${range[2]}`;
  return /\d{4}/.exec(name)?.[0];
}

const requirementText =`Đạt từ ${Math.round(PASS_RATIO * 10)}/10 câu`;

/** Danh sách con dấu theo các bộ trắc nghiệm đang mở: bài học → chủ đề → hai bộ đặc biệt. */
export function buildStampCatalog({ sgkLessons = [], lessons, topics, hasAllQuiz, hasYearGame }: StampCatalogInput): StampDef[] {
  const defs: StampDef[] = [
    ...sgkLessons.map(
      (lesson): StampDef => ({
        setId: `bai:${lesson.slug}`,
        kind: "lesson",
        title: `Bài ${lesson.number}. ${lesson.shortTitle}`,
        motto: `Bài ${lesson.number}`,
        href: `/trac-nghiem/bai/${lesson.slug}`,
        requirement: `${requirementText} trắc nghiệm của bài`,
      }),
    ),
    ...lessons.map(
      (lesson): StampDef => ({
        setId: quizSetIds.lesson(lesson.slug),
        kind: "lesson",
        title: lesson.title,
        // "13/3 – 7/5/1954" quá dài cho vòng giữa con dấu → chỉ giữ năm.
        motto: yearsInName(lesson.dateText) ?? lesson.dateText,
        href: quizPaths.lesson(lesson.slug),
        requirement: `${requirementText} trắc nghiệm chuyên đề`,
      }),
    ),
    ...topics.map(
      (topic): StampDef => ({
        setId: quizSetIds.topic(topic.slug),
        kind: "topic",
        title: topic.name,
        motto: yearsInName(topic.name) ?? "Chủ đề",
        href: quizPaths.topic(topic.slug),
        requirement: `${requirementText} trắc nghiệm chủ đề`,
      }),
    ),
  ];
  if (hasAllQuiz) {
    defs.push({
      setId: quizSetIds.all,
      kind: "special",
      title: "Trắc nghiệm tổng hợp",
      motto: "Tổng hợp",
      href: quizPaths.all,
      requirement: `${requirementText} trắc nghiệm tổng hợp`,
    });
  }
  if (hasYearGame) {
    defs.push({
      setId: quizSetIds.yearGame,
      kind: "special",
      title: "Nhìn ảnh đoán năm",
      motto: "Đoán năm",
      href: quizPaths.yearGame,
      requirement: `Đạt từ ${Math.round(PASS_RATIO * 100)}% số điểm trò đoán năm`,
    });
  }
  return defs;
}

export function evaluateStamps(defs: readonly StampDef[], progress: Progress): Stamp[] {
  return defs.map((def) => {
    const record = progress.quizzes[def.setId];
    return { ...def, record, earnedAt: record?.passedAt };
  });
}

/** Ngày kiểu Việt Nam (30/9/2026) cho con dấu, theo giờ Việt Nam. */
export function stampDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(iso),
  );
}

// ---------- Xuất / nhập mã tiến độ (mục 6.7): học sinh hay đổi máy (máy trường ↔ điện thoại) ----------

const CODE_PREFIX = "LS12-";

/** Mã tiến độ để chép sang máy khác: "LS12-" + base64url của JSON (dữ liệu chỉ gồm slug và ngày giờ, toàn ký tự ASCII). */
export function exportProgressCode(progress: Progress): string {
  const base64 = btoa(JSON.stringify(progress));
  return CODE_PREFIX + base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Đọc mã tiến độ; mã sai, hỏng hoặc không phải của web này → null. Từng mục hỏng bị bỏ như parseProgress. */
export function importProgressCode(code: string): Progress | null {
  const trimmed = code.trim().replace(/\s+/g, "");
  if (!trimmed.startsWith(CODE_PREFIX)) return null;
  const body = trimmed.slice(CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  let json: string;
  try {
    json = atob(body + "=".repeat((4 - (body.length % 4)) % 4));
  } catch {
    return null;
  }
  // parseProgress trả đúng đối tượng emptyProgress chỉ khi dữ liệu hỏng/sai phiên bản (dữ liệu hợp lệ luôn ra đối tượng mới).
  const parsed = parseProgress(json);
  return parsed === emptyProgress ? null : parsed;
}

const earlier = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : (a ?? b));
const later = (a: string, b: string) => (a > b ? a : b);

/**
 * Gộp tiến độ nhập từ máy khác vào tiến độ hiện có (không ghi đè): điểm cao nhất theo tỉ lệ, cộng số lượt, giữ lần đạt
 * dấu sớm nhất; mục đã đọc lấy hợp của hai bên.
 */
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const lessons: Progress["lessons"] = { ...current.lessons };
  for (const [slug, record] of Object.entries(incoming.lessons)) {
    lessons[slug] = { studiedAt: earlier(lessons[slug]?.studiedAt, record.studiedAt)! };
  }

  const quizzes: Progress["quizzes"] = { ...current.quizzes };
  for (const [id, record] of Object.entries(incoming.quizzes)) {
    const mine = quizzes[id];
    if (!mine) {
      quizzes[id] = record;
      continue;
    }
    const better = record.best / record.total > mine.best / mine.total ? record : mine;
    quizzes[id] = {
      best: better.best,
      total: better.total,
      attempts: mine.attempts + record.attempts,
      passedAt: earlier(mine.passedAt, record.passedAt),
      lastAt: later(mine.lastAt, record.lastAt),
    };
  }

  const sgk: Progress["sgk"] = { ...current.sgk };
  for (const [slug, record] of Object.entries(incoming.sgk)) {
    const mine = sgk[slug];
    if (!mine) {
      sgk[slug] = record;
      continue;
    }
    const sections = { ...record.sections };
    for (const [id, at] of Object.entries(mine.sections)) sections[id] = earlier(sections[id], at)!;
    const newest = record.lastAt > mine.lastAt ? record : mine;
    sgk[slug] = { sections, lastSection: newest.lastSection, lastAt: newest.lastAt };
  }

  return { v: 1, lessons, quizzes, sgk };
}
