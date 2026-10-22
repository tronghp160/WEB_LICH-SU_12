import { describe, expect, it } from "vitest";
import { parseAttemptView, type AttemptQuestion } from "@/lib/exams/attempt";
import { displayedCorrect, rotateChoices } from "@/lib/exams/compose";
import { examItemSchema, explainHints, itemErrorField, itemFromForm, planImport, trapLabels, TRAP_KINDS } from "@/lib/exams/items";
import { knowledgeLocation, questionLocation, relatedFeatures, reviewHints } from "@/lib/exams/review-hints";

// Lời giải "sai ở đâu – bài nào – mục nào" (docs/ke-hoach-demo-luyen-thi.md, GĐ-D1).

const notes = [
  { note: "Biên giới 1950 diễn ra trước kế hoạch Na-va.", section_id: "muc-2", trap: "thoi_gian" },
  { note: "Việt Bắc 1947 làm phá sản đánh nhanh thắng nhanh.", section_id: "muc-2", trap: "thoi_gian" },
  { note: "Hòa Bình 1951–1952 diễn ra trước kế hoạch Na-va.", section_id: "muc-3", trap: "thoi_gian" },
  { note: "Đúng. Điện Biên Phủ đập tan hoàn toàn kế hoạch Na-va.", section_id: "muc-3" },
];

const mcq = {
  kind: "mcq",
  stem: "Chiến dịch nào đập tan hoàn toàn kế hoạch Na-va?",
  choices: ["Biên giới 1950", "Việt Bắc 1947", "Hòa Bình 1951–1952", "Điện Biên Phủ 1954"],
  correct_index: 3,
  choice_notes: notes,
  explanation: "Phân biệt bước đầu và hoàn toàn.",
  remember: "Điện Biên Phủ đập tan hoàn toàn kế hoạch Na-va.",
  grade: 12,
  lesson_slug: "7-khang-chien-chong-phap",
  section_id: "muc-3",
  level: "thong_hieu",
  competency: "nhan_thuc_tu_duy",
  source_note: "SGK Lịch sử 12 (KNTT), Bài 7, mục 3",
};

const statements = [
  { text: "a) Hiệp định kí sau Điện Biên Phủ", is_true: true, explanation: "ĐBP kết thúc 7-5-1954.", section_id: "muc-3" },
  { text: "b) Vĩ tuyến 17 là biên giới quốc gia", is_true: false, explanation: "Chỉ là giới tuyến quân sự tạm thời.", trap: "khai_niem" },
  { text: "c) Cam kết tôn trọng quyền dân tộc cơ bản", is_true: true, explanation: "Tư liệu nêu rõ." },
  { text: "d) Cách mạng hoàn thành trên cả nước", is_true: false, explanation: "Chỉ miền Bắc được giải phóng.", lesson_slug: "8-khang-chien-chong-my-cuu-nuoc", section_id: "muc-1", trap: "tuyet_doi" },
];
const tf = { ...mcq, kind: "true_false", choices: undefined, correct_index: undefined, choice_notes: undefined, statements };

const fields = (input: unknown) => examItemSchema.safeParse(input).error?.issues.map((issue) => itemErrorField(issue.path)) ?? [];

describe("schema: lời giải từng lựa chọn, mục SGK, kiểu bẫy", () => {
  it("câu hợp lệ giữ choice_notes / ref của ý, bỏ khóa null; Đúng/Sai không có choice_notes", () => {
    const item = examItemSchema.parse({ ...mcq, choice_notes: notes.map((note) => ({ ...note, ref: "", lesson_slug: null })) });
    expect(item.choice_notes).toHaveLength(4);
    expect(item.choice_notes![0]).toEqual({ note: notes[0].note, section_id: "muc-2", trap: "thoi_gian" });
    const parsed = examItemSchema.parse(tf);
    expect(parsed.choice_notes).toBeNull();
    expect(parsed.statements![3]).toMatchObject({ lesson_slug: "8-khang-chien-chong-my-cuu-nuoc", section_id: "muc-1", trap: "tuyet_doi" });
    expect(parsed.statements![2]).not.toHaveProperty("trap");
  });

  it("lỗi đúng ô: thiếu lời giải, mục không có trong bài, bẫy ở đáp án đúng / ý đúng, mục không kèm bài, Đúng/Sai có choice_notes", () => {
    expect(fields({ ...mcq, choice_notes: notes.slice(0, 3) })).toContain("choice_notes");
    expect(fields({ ...mcq, section_id: "muc-9" })).toContain("section_id");
    expect(fields({ ...mcq, lesson_slug: null, section_id: "muc-1" })).toContain("section_id");
    expect(fields({ ...mcq, choice_notes: [notes[0], notes[1], notes[2], { ...notes[3], trap: "chu_the" }] })).toContain("choice_3_trap");
    expect(fields({ ...mcq, choice_notes: [{ ...notes[0], section_id: "muc-7" }, ...notes.slice(1)] })).toContain("choice_0_section");
    expect(fields({ ...mcq, choice_notes: [{ ...notes[0], note: "ngắn" }, ...notes.slice(1)] })).toContain("choice_0_note");
    expect(fields({ ...tf, statements: [{ ...statements[0], trap: "so_lieu" }, ...statements.slice(1)] })).toContain("statement_0_trap");
    expect(fields({ ...tf, statements: [statements[0], statements[1], statements[2], { ...statements[3], section_id: "muc-9" }] })).toContain("statement_3_section");
    expect(fields({ ...tf, choice_notes: notes })).toContain("choice_notes");
    expect(fields({ ...mcq, choice_notes: [{ ...notes[0], trap: "bay-la" }, ...notes.slice(1)] })).toContain("choice_0_trap");
  });

  it("nhắc bổ sung (không chặn): thiếu mục, thiếu lời giải từng lựa chọn, ý sai chưa có bẫy", () => {
    expect(explainHints(examItemSchema.parse(mcq))).toEqual([]);
    expect(explainHints(examItemSchema.parse({ ...mcq, section_id: null, choice_notes: null }))).toHaveLength(2);
    expect(explainHints(examItemSchema.parse({ ...tf, statements: [statements[0], { ...statements[1], trap: null }, statements[2], statements[3]] }))).toEqual(["Có ý Sai chưa ghi kiểu bẫy."]);
    expect(TRAP_KINDS.every((trap) => trapLabels[trap].length > 0)).toBe(true);
  });

  it("FormData → câu hỏi: đọc lời giải từng lựa chọn + vị trí; để trống cả 4 → không có choice_notes", () => {
    const values: Record<string, string> = {
      kind: "mcq",
      stem: mcq.stem,
      ...Object.fromEntries(mcq.choices.map((choice, index) => [`choice_${index}`, choice])),
      correct_index: "3",
      explanation: mcq.explanation,
      level: "thong_hieu",
      competency: "nhan_thuc_tu_duy",
      source_note: mcq.source_note,
      lesson_slug: mcq.lesson_slug,
      section_id: "muc-3",
      remember: mcq.remember,
    };
    expect(examItemSchema.parse(itemFromForm(values)).choice_notes).toBeNull();
    const withNotes = { ...values, ...Object.fromEntries(notes.flatMap((note, index) => [[`choice_${index}_note`, note.note], [`choice_${index}_section`, note.section_id], [`choice_${index}_trap`, note.trap ?? ""]])) };
    const item = examItemSchema.parse(itemFromForm(withNotes));
    expect(item.choice_notes![1]).toEqual({ note: notes[1].note, section_id: "muc-2", trap: "thoi_gian" });
    expect(item).toMatchObject({ section_id: "muc-3", remember: mcq.remember });
  });
});

describe("nhập JSON: content_key, event_slug, nhắc lời giải", () => {
  const context = { existingFingerprints: new Set<string>(), eventSlugs: new Set(["chien-dich-dien-bien-phu"]), existingContentKeys: new Set(["b7-m3-tn-99"]) };
  const row = (extra: object) => ({ ...mcq, correct_index: undefined, correct: 3, ...extra });

  it("content_key trùng trong tệp / đã có trong ngân hàng bị báo; event_slug dùng như event", () => {
    const plan = planImport(
      JSON.stringify({
        items: [
          row({ content_key: "b7-m3-tn-01", event_slug: "chien-dich-dien-bien-phu" }),
          row({ content_key: "b7-m3-tn-01", stem: "Câu khác hẳn về Hiệp định Pa-ri năm 1973?" }),
          row({ content_key: "b7-m3-tn-99", stem: "Một câu thứ ba về Tổng tuyển cử 1946?" }),
        ],
      }),
      context,
    );
    expect(plan.rows[0].errors).toEqual([]);
    expect(plan.items[0]).toMatchObject({ content_key: "b7-m3-tn-01", event_slug: "chien-dich-dien-bien-phu" });
    expect(plan.rows[1].errors.join()).toContain("trùng với câu 1");
    expect(plan.rows[2].errors.join()).toContain("đã có trong ngân hàng");
  });

  it("câu thiếu lời giải từng lựa chọn: hợp lệ nhưng có nhắc (hints), không lẫn vào cảnh báo", () => {
    const plan = planImport(JSON.stringify({ items: [row({ choice_notes: undefined, section_id: undefined })] }), context);
    expect(plan.rows[0].errors).toEqual([]);
    expect(plan.rows[0].warnings).toEqual([]);
    expect(plan.rows[0].hints).toHaveLength(2);
    const bad = planImport(JSON.stringify({ items: [row({ choice_notes: notes.slice(0, 2) })] }), context);
    expect(bad.rows[0].errors.join()).toContain("4 lựa chọn");
  });
});

describe("lời giải theo thứ tự học sinh thấy (giống exam_attempt_view)", () => {
  it("xoay choice_notes cùng công thức với choices: ở mọi độ xoay, lời giải của đáp án đúng nằm đúng vị trí", () => {
    for (const shift of [0, 1, 2, 3]) {
      const shownChoices = rotateChoices(mcq.choices, shift);
      const shownNotes = rotateChoices(notes, shift);
      const correct = displayedCorrect(mcq.correct_index, shift);
      expect(shownChoices[correct]).toBe("Điện Biên Phủ 1954");
      expect(shownNotes[correct].trap).toBeUndefined();
      shownChoices.forEach((choice, slot) => expect(shownNotes[slot]).toBe(notes[mcq.choices.indexOf(choice)]));
    }
  });

  it("đọc view: choice_notes / statement_refs → camelCase; kiểu bẫy lạ thành null; trước khi nộp không có", () => {
    const question = {
      n: 1, item_id: "i1", section: 1, kind: "mcq", stem: "Câu?", choices: ["A", "B", "C", "D"], correct_index: 1,
      choice_notes: [{ note: "n0", trap: "thoi_gian" }, { note: "n1", section_id: "muc-3" }, { note: "n2", trap: "la-hoac" }, { note: "n3", ref: "SGK 11" }],
      lesson_slug: "7-khang-chien-chong-phap", section_id: "muc-3", remember: "Ghi nhớ.", earned_milli: 0,
    };
    const tfQuestion = {
      n: 2, item_id: "i2", section: 2, kind: "true_false", stem: "Tư liệu", statements: ["a", "b", "c", "d"], truths: [true, false, true, false],
      statement_refs: [{ section_id: "muc-3" }, { trap: "khai_niem" }, {}, { lesson_slug: "8-khang-chien-chong-my-cuu-nuoc", trap: "tuyet_doi" }], earned_milli: 250,
    };
    const view = parseAttemptView({ attempt: { id: "a", status: "submitted", started_at: "x", server_now: "y" }, questions: [question, tfQuestion], answers: {} })!;
    expect(view.questions[0]).toMatchObject({ sectionId: "muc-3", remember: "Ghi nhớ." });
    expect(view.questions[0].choiceNotes!.map((note) => note.trap)).toEqual(["thoi_gian", null, null, null]);
    expect(view.questions[0].choiceNotes![3]).toEqual({ note: "n3", lessonSlug: null, sectionId: null, ref: "SGK 11", trap: null });
    expect(view.questions[1].statementRefs![3]).toEqual({ lessonSlug: "8-khang-chien-chong-my-cuu-nuoc", sectionId: null, ref: null, trap: "tuyet_doi" });
    const open = parseAttemptView({ attempt: { id: "a", status: "in_progress", started_at: "x", server_now: "y" }, questions: [{ ...question, choice_notes: undefined, remember: undefined, section_id: undefined }], answers: {} })!;
    expect(open.questions[0]).toMatchObject({ choiceNotes: null, remember: null, sectionId: null });
  });
});

describe("vị trí kiến thức và 'Kiến thức cần ôn lại'", () => {
  it("nhãn Bài N › Mục M + liên kết neo; bài trống lấy bài của câu; lớp 11 chỉ có chữ", () => {
    expect(knowledgeLocation({ lessonSlug: null, sectionId: "muc-3", ref: null }, "7-khang-chien-chong-phap")).toEqual({
      label: "Bài 7 › Mục 3. Giai đoạn 1951–1954 và chiến dịch Điện Biên Phủ",
      href: "/bai/7-khang-chien-chong-phap#muc-3",
      lessonSlug: "7-khang-chien-chong-phap",
      sectionId: "muc-3",
    });
    expect(knowledgeLocation({ lessonSlug: "8-khang-chien-chong-my-cuu-nuoc", sectionId: null, ref: null })?.href).toBe("/bai/8-khang-chien-chong-my-cuu-nuoc");
    expect(knowledgeLocation({ lessonSlug: null, sectionId: null, ref: "SGK Lịch sử 11, Bài 5, mục 2" })).toMatchObject({ href: null, label: "SGK Lịch sử 11, Bài 5, mục 2" });
    expect(knowledgeLocation({ lessonSlug: null, sectionId: null, ref: null })).toBeNull();
    expect(questionLocation({ lessonSlug: null, sectionId: null, topicTag: "Lớp 11 – Khởi nghĩa Lam Sơn" })).toMatchObject({ label: "Lớp 11 – Khởi nghĩa Lam Sơn", href: null });
    expect(relatedFeatures("7-khang-chien-chong-phap", "muc-3")).toEqual([{ href: "/bai-hoc/chien-dich-dien-bien-phu", label: "Chiến dịch Điện Biên Phủ" }]);
    expect(relatedFeatures("7-khang-chien-chong-phap", "muc-1")).toEqual([]);
  });

  const q = (n: number, lessonSlug: string | null, sectionId: string | null, earned: number, extra: Partial<AttemptQuestion> = {}): AttemptQuestion => ({
    n, itemId: `i${n}`, section: 1, kind: "mcq", stem: "?", choices: null, statements: null, passage: null, correctIndex: 0, truths: null, statementExplanations: null,
    statementRefs: null, choiceNotes: null, explanation: null, remember: null, lessonSlug, sectionId, topicTag: null, eventSlug: null, eventTitle: null,
    earnedMilli: earned, checked: false, ...extra,
  });

  it("gom câu chưa đạt theo (bài, mục), nhiều câu sai trước, tối đa 5; luyện tập chỉ tính câu đã kiểm tra", () => {
    const questions = [
      q(1, "7-khang-chien-chong-phap", "muc-3", 0),
      q(2, "7-khang-chien-chong-phap", "muc-3", 0),
      q(3, "7-khang-chien-chong-phap", "muc-3", 250),
      q(4, "6-cach-mang-thang-tam-nam-1945", "muc-1", 0),
      q(5, "8-khang-chien-chong-my-cuu-nuoc", null, 250),
      q(6, null, null, 0, { topicTag: "Lớp 11 – Cải cách Lê Thánh Tông" }),
      q(7, "8-khang-chien-chong-my-cuu-nuoc", "muc-2", 500, { kind: "true_false" }),
    ];
    const hints = reviewHints(questions, false);
    expect(hints.map((hint) => [hint.location.label.split(".")[0], hint.wrong, hint.total])).toEqual([
      ["Bài 7 › Mục 3", 2, 3],
      ["Bài 6 › Mục 1", 1, 1],
      ["Bài 8 › Mục 2", 1, 1],
      ["Lớp 11 – Cải cách Lê Thánh Tông", 1, 1],
    ]);
    expect(hints[0]).toMatchObject({ practiceHref: "/luyen-thi/luyen-tap?bai=7-khang-chien-chong-phap" });
    expect(hints[3].practiceHref).toBeNull();
    expect(reviewHints(questions, false, 2)).toHaveLength(2);
    expect(reviewHints(questions.map((question) => ({ ...question, checked: question.n === 4 })), true).map((hint) => hint.key)).toEqual(["6-cach-mang-thang-tam-nam-1945#muc-1"]);
  });
});
