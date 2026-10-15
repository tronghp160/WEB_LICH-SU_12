import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findNearDuplicates, importHasErrors, itemFingerprint, planImport } from "@/lib/exams/items";
import { sgkLessons } from "@/lib/sgk/curriculum";

// Kiểm tra ngân hàng câu hỏi soạn bằng JSON (docs/ke-hoach-luyen-thi.md, GĐ6 — `npm run kiem-tra-ngan-hang`). Dùng đúng hàm
// kiểm tra của trang quản trị "Nhập từ JSON" (planImport: schema, độ dài, trùng trong tệp, TODO), cộng thêm: trùng giữa các
// tệp, câu gần giống, cảnh báo soạn câu (đáp án dài hơn hẳn, Đúng/Sai toàn đúng / toàn sai), phân bố đáp án. Sự kiện (event)
// chỉ kiểm được trên database — nút "Kiểm tra" ở trang nhập làm việc đó.

const dir = path.resolve(__dirname, "../../supabase/content/ngan-hang");
const files = (() => {
  try {
    return readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return [];
  }
})();

type Raw = { items: { kind: string; stem: string; lesson_slug?: string; correct?: number; event?: string }[] };
const raws = files.map((name) => ({ name, text: readFileSync(path.join(dir, name), "utf8") }));
const events = new Set(raws.flatMap(({ text }) => (JSON.parse(text) as Raw).items.flatMap((item) => (item.event ? [item.event] : []))));
const plans = raws.map(({ name, text }) => ({ name, plan: planImport(text, { existingFingerprints: new Set(), eventSlugs: events }) }));
const items = plans.flatMap(({ name, plan }) => plan.items.map((item, index) => ({ name, index: index + 1, item })));

describe.skipIf(files.length === 0)("ngân hàng câu hỏi (supabase/content/ngan-hang)", () => {
  it.each(plans.map(({ name, plan }) => [name, plan] as const))("%s: không có lỗi", (_name, plan) => {
    const errors = [
      ...plan.fileErrors,
      ...plan.passages.flatMap((passage) => passage.errors.map((error) => `tư liệu ${passage.key}: ${error}`)),
      ...plan.rows.flatMap((row) => row.errors.map((error) => `câu ${row.index} (${row.stem.slice(0, 40)}…): ${error}`)),
    ];
    expect(errors).toEqual([]);
    expect(importHasErrors(plan)).toBe(false);
  });

  it("không có cảnh báo soạn câu (đáp án dài hơn hẳn, Đúng/Sai toàn đúng / toàn sai…)", () => {
    const warnings = plans.flatMap(({ name, plan }) => plan.rows.flatMap((row) => row.warnings.map((warning) => `${name} câu ${row.index}: ${warning}`)));
    expect(warnings).toEqual([]);
  });

  it("không trùng câu giữa các tệp, không có câu gần giống nhau", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { name, index, item } of items) {
      const key = itemFingerprint(item);
      if (seen.has(key)) duplicates.push(`${name} câu ${index} trùng ${seen.get(key)}`);
      seen.set(key, `${name} câu ${index}`);
    }
    expect(duplicates).toEqual([]);
    const stems = items.map(({ name, index, item }) => ({ id: `${name}#${index}`, stem: item.stem }));
    const near = stems.flatMap((entry) => findNearDuplicates(entry.stem, stems, entry.id).map((other) => `${entry.id} ≈ ${other.id}`));
    expect(near).toEqual([]);
  });

  it("câu Đúng/Sai có cả ý đúng lẫn ý sai; câu trắc nghiệm rải đáp án (không chữ nào quá 40%)", () => {
    for (const { name, index, item } of items) {
      if (item.kind !== "true_false") continue;
      const truths = (item.statements ?? []).filter((statement) => statement.is_true).length;
      expect(truths, `${name} câu ${index}`).toBeGreaterThan(0);
      expect(truths, `${name} câu ${index}`).toBeLessThan(4);
    }
    const letters = [0, 0, 0, 0];
    for (const { item } of items) if (item.kind === "mcq" && item.correct_index !== null) letters[item.correct_index] += 1;
    const total = letters.reduce((sum, count) => sum + count, 0);
    for (const count of letters) expect(count / total).toBeLessThanOrEqual(0.4);
  });

  it("mỗi câu gắn bài SGK, có nguồn ghi tới bài", () => {
    const lessons = new Set(sgkLessons.map((lesson) => lesson.slug));
    for (const { name, index, item } of items) {
      expect(item.lesson_slug && lessons.has(item.lesson_slug), `${name} câu ${index}`).toBe(true);
      expect(item.source_note, `${name} câu ${index}`).toMatch(/Bài \d+/);
    }
  });
});
