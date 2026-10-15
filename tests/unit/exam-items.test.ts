import { describe, expect, it } from "vitest";
import { balancedShift, displayedCorrect, letterCounts, moveItem, rebalanceShifts, rotateChoices, sectionForKind } from "@/lib/exams/compose";
import {
  examItemSchema,
  findNearDuplicates,
  importHasErrors,
  itemErrorField,
  itemFingerprint,
  itemFromForm,
  itemWarnings,
  parseKindSegment,
  planImport,
  stemSimilarity,
} from "@/lib/exams/items";

const statements = [
  { text: "a) Ý thứ nhất đúng", is_true: true, explanation: "Vì SGK ghi rõ." },
  { text: "b) Ý thứ hai sai", is_true: false, explanation: "Đánh tráo thời gian." },
  { text: "c) Ý thứ ba sai", is_true: false, explanation: "Nhầm chủ thể." },
  { text: "d) Ý thứ tư đúng", is_true: true, explanation: "Đúng theo tư liệu." },
];

const validMcq = {
  kind: "mcq",
  stem: "Chiến dịch Điện Biên Phủ kết thúc ngày nào?",
  choices: ["7/5/1954", "13/3/1954", "21/7/1954", "19/12/1946"],
  correct_index: 0,
  explanation: "Ngày 7/5/1954 tập đoàn cứ điểm bị tiêu diệt.",
  grade: 12,
  lesson_slug: "7-khang-chien-chong-phap",
  level: "nhan_biet",
  competency: "tim_hieu_lich_su",
  source_note: "SGK Lịch sử 12 (KNTT), Bài 7",
};

const validTf = { ...validMcq, kind: "true_false", stem: "Đọc đoạn tư liệu sau đây:", choices: undefined, correct_index: undefined, statements, level: "van_dung" };

describe("schema câu hỏi", () => {
  it("trắc nghiệm hợp lệ: ô trống thành null, bỏ phần của dạng kia", () => {
    const item = examItemSchema.parse({ ...validMcq, statements, passage_id: "", topic_tag: " ", event_id: "" });
    expect(item).toMatchObject({ kind: "mcq", correct_index: 0, statements: null, passage_id: null, topic_tag: null, event_id: null });
  });

  it("Đúng/Sai hợp lệ: choices / correct_index thành null", () => {
    const item = examItemSchema.parse({ ...validTf, choices: ["a", "b", "c", "d"], correct_index: 1 });
    expect(item).toMatchObject({ kind: "true_false", choices: null, correct_index: null });
    expect(item.statements).toHaveLength(4);
  });

  it("lỗi theo từng ô: lựa chọn trùng, chưa chọn đáp án, thiếu ý, ý chưa chọn Đúng/Sai, bài SGK lạ, lớp 11 gắn bài lớp 12", () => {
    const duplicate = examItemSchema.safeParse({ ...validMcq, choices: ["7/5/1954", "13/3/1954", "21/7/1954", "7/5/1954 "], correct_index: null });
    expect(duplicate.error!.issues.map((issue) => itemErrorField(issue.path))).toEqual(expect.arrayContaining(["choice_3", "correct_index"]));
    const missing = examItemSchema.safeParse({ ...validTf, statements: statements.slice(0, 3) });
    expect(missing.error!.issues.map((issue) => itemErrorField(issue.path))).toContain("statements");
    const undecided = examItemSchema.safeParse({ ...validTf, statements: [{ ...statements[0], is_true: undefined }, ...statements.slice(1)] });
    expect(undecided.error!.issues.map((issue) => itemErrorField(issue.path))).toContain("statement_0_true");
    expect(examItemSchema.safeParse({ ...validMcq, lesson_slug: "bai-khong-co" }).error!.issues[0].path).toEqual(["lesson_slug"]);
    expect(examItemSchema.safeParse({ ...validMcq, grade: 11 }).error!.issues[0].message).toContain("lớp 11");
    expect(examItemSchema.parse({ ...validMcq, grade: 11, lesson_slug: null, topic_tag: "Khởi nghĩa Lam Sơn" }).grade).toBe(11);
  });

  it("FormData → câu hỏi: radio Đúng/Sai, lớp mặc định 12", () => {
    const values: Record<string, string> = {
      kind: "true_false",
      stem: "Đọc đoạn tư liệu sau đây:",
      explanation: "Nhận xét chung đủ dài",
      level: "van_dung",
      competency: "van_dung_kien_thuc",
      source_note: "SGK Lịch sử 12",
      grade: "",
    };
    statements.forEach((statement, index) => {
      values[`statement_${index}`] = statement.text;
      values[`statement_${index}_true`] = String(statement.is_true);
      values[`statement_${index}_explanation`] = statement.explanation;
    });
    const item = examItemSchema.parse(itemFromForm(values));
    expect(item.grade).toBe(12);
    expect(item.statements!.map((statement) => statement.is_true)).toEqual([true, false, false, true]);
    expect(parseKindSegment("dung-sai")).toBe("true_false");
    expect(parseKindSegment("khac")).toBeNull();
  });
});

describe("dấu vân tay (giống hàm SQL public.exam_item_fingerprint)", () => {
  it("khớp chuỗi do Postgres sinh ra (chạy thử migration trên PGlite)", () => {
    expect(
      itemFingerprint({
        kind: "mcq",
        stem: "Tổ chức Liên hợp quốc chính thức được thành lập vào ngày nào?",
        choices: ["24/10/1945", "26/6/1945", "2/9/1945", "10/12/1948"],
      }),
    ).toBe("tochuclienhopquocchinhthucduocthanhlapvaongaynao|10121948|24101945|2661945|291945");
    expect(
      itemFingerprint({
        kind: "mcq",
        stem: "Hiệp hội các quốc gia Đông Nam Á (ASEAN) được thành lập ngày 8/8/1967 tại đâu?",
        choices: ["Băng Cốc (Thái Lan)", "Gia-các-ta (In-đô-nê-xi-a)", "Cua-la Lăm-pơ (Ma-lai-xi-a)", "Ma-ni-la (Phi-líp-pin)"],
      }),
    ).toBe("hiephoicacquocgiadongnamaaseanduocthanhlapngay881967taidau|bangcocthailan|cualalampomalaixia|giacactaindonexia|manilaphilippin");
  });

  it("không đổi khi đảo lựa chọn, đổi hoa thường, dấu câu, dạng Unicode tổ hợp", () => {
    const base = itemFingerprint({ kind: "mcq", stem: "Điện Biên Phủ?", choices: ["A1", "B", "C", "D"] });
    expect(itemFingerprint({ kind: "mcq", stem: "điện biên phủ", choices: ["D", "C", "B", "a1"] })).toBe(base);
    expect(itemFingerprint({ kind: "mcq", stem: "Điện Biên Phủ?".normalize("NFD"), choices: ["A1", "B", "C", "D"] })).toBe(base);
    expect(itemFingerprint({ kind: "true_false", stem: "Đọc tư liệu", statements })).not.toBe(itemFingerprint({ kind: "true_false", stem: "Đọc tư liệu", statements: statements.slice().reverse().map((s, i) => (i === 0 ? { ...s, text: "khác" } : s)) }));
  });

  it("câu gần trùng: đổi vài chữ vẫn bắt được, câu khác hẳn thì không", () => {
    const stem = "Chiến dịch Điện Biên Phủ kết thúc thắng lợi vào ngày tháng năm nào?";
    expect(stemSimilarity(stem, "Chiến dịch Điện Biên Phủ kết thúc thắng lợi vào ngày, tháng, năm nào ?")).toBe(1);
    expect(stemSimilarity(stem, "Chiến dịch Điện Biên Phủ đã kết thúc thắng lợi vào ngày tháng năm nào?")).toBeGreaterThan(0.85);
    const candidates = [
      { id: "1", stem: "Chiến dịch Điện Biên Phủ đã kết thúc thắng lợi vào ngày tháng năm nào?" },
      { id: "2", stem: "Liên hợp quốc thành lập năm nào?" },
    ];
    expect(findNearDuplicates(stem, candidates).map((item) => item.id)).toEqual(["1"]);
    expect(findNearDuplicates(stem, candidates, "1")).toEqual([]);
  });
});

describe("cảnh báo cho người soạn", () => {
  it("Đúng/Sai cả 4 ý cùng đúng / cùng sai; trắc nghiệm có 'Tất cả các ý trên' hoặc đáp án dài hẳn", () => {
    expect(itemWarnings({ kind: "true_false", choices: null, correct_index: null, statements: statements.map((s) => ({ ...s, is_true: true })) })[0]).toContain("Cả 4 ý đều Đúng");
    expect(itemWarnings({ kind: "true_false", choices: null, correct_index: null, statements })).toEqual([]);
    expect(itemWarnings({ kind: "mcq", choices: ["A", "B", "C", "Tất cả các ý trên"], correct_index: 3, statements: null })[0]).toContain("Tất cả");
    const long = "Đánh bại hoàn toàn kế hoạch Na-va, giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp";
    expect(itemWarnings({ kind: "mcq", choices: [long, "Mở đầu kháng chiến", "Kết thúc chiến tranh", "Giải phóng Hà Nội"], correct_index: 0, statements: null })).toHaveLength(1);
  });
});

describe("nhập JSON (chạy thử)", () => {
  const context = { existingFingerprints: new Set<string>(), eventSlugs: new Set(["chien-dich-dien-bien-phu"]) };
  const file = (items: unknown[], passages: unknown[] = []) => JSON.stringify({ passages, items });
  const passage = { key: "tl-1", title: "Thư Bộ Chính trị", body: "Đoạn trích văn kiện đủ dài để qua kiểm tra độ dài tối thiểu.", source_citation: "Văn kiện Đảng, tập 15, tr. 10" };

  it("tệp hợp lệ: câu sẵn sàng ghi, 'correct' đổi thành correct_index, giữ key tư liệu và slug sự kiện", () => {
    const plan = planImport(file([{ ...validMcq, correct: 2, correct_index: undefined, event: "chien-dich-dien-bien-phu" }, { ...validTf, passage: "tl-1" }], [passage]), context);
    expect(importHasErrors(plan)).toBe(false);
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({ correct_index: 2, event_slug: "chien-dich-dien-bien-phu", passage_key: null });
    expect(plan.items[1]).toMatchObject({ kind: "true_false", passage_key: "tl-1" });
  });

  it("lỗi từng dòng: JSON sai, tư liệu / sự kiện không có, trùng trong tệp, trùng ngân hàng, TODO", () => {
    expect(planImport("{không phải json", context).fileErrors).toEqual(["Tệp không phải JSON hợp lệ."]);
    expect(planImport(file([]), context).fileErrors[0]).toContain("chưa có câu hỏi");
    const existing = itemFingerprint({ kind: "mcq", stem: "Câu đã có trong ngân hàng rồi?", choices: ["1", "2", "3", "4"] });
    const plan = planImport(
      file([
        { ...validTf, passage: "khong-co" },
        { ...validMcq, correct: 0, event: "su-kien-la" },
        { ...validMcq, correct: 0 },
        { ...validMcq, stem: "Câu đã có trong ngân hàng rồi?", choices: ["1", "2", "3", "4"], correct: 0 },
        { ...validMcq, stem: "TODO viết lại câu này", correct: 0 },
      ]),
      { ...context, existingFingerprints: new Set([existing]) },
    );
    expect(plan.rows.map((row) => row.errors.join(" "))).toEqual([
      'Không có đoạn tư liệu key "khong-co" trong tệp.',
      'Không có sự kiện "su-kien-la".',
      "Trùng với câu 2 trong tệp.",
      "Trùng với một câu đã có trong ngân hàng.",
      "Còn ghi chú TODO / FIXME.",
    ]);
    expect(importHasErrors(plan)).toBe(true);
  });

  it("tư liệu lỗi hoặc trùng key → báo ở phần tư liệu", () => {
    const plan = planImport(file([{ ...validMcq, correct: 0 }], [passage, { ...passage, body: "ngắn" }]), context);
    expect(plan.passages[1].errors).toEqual(expect.arrayContaining(['key "tl-1" bị trùng trong tệp.']));
    expect(plan.passages[1].errors.some((error) => error.includes("quá ngắn"))).toBe(true);
  });
});

describe("ghép đề: phần, xoay lựa chọn, rải đáp án (giống get_exam_set)", () => {
  it("trắc nghiệm → Phần I, Đúng/Sai → Phần II", () => {
    expect(sectionForKind("mcq")).toBe(1);
    expect(sectionForKind("true_false")).toBe(2);
  });

  it("xoay: lựa chọn gốc i hiện ở vị trí (i + shift) mod 4; đáp án đúng đi theo", () => {
    const choices = ["đúng", "x", "y", "z"];
    for (let shift = 0; shift < 4; shift++) {
      const shown = rotateChoices(choices, shift);
      expect(shown[displayedCorrect(0, shift)]).toBe("đúng");
    }
    expect(rotateChoices(choices, 1)).toEqual(["z", "đúng", "x", "y"]);
  });

  it("thêm câu: đáp án rơi vào chữ đang ít nhất; rải lại cả đề → đều A/B/C/D", () => {
    expect(balancedShift([2, 0, 1, 1], 0)).toBe(1);
    expect(balancedShift([1, 1, 1, 1], 3)).toBe(1);
    const items = Array.from({ length: 12 }, (_, index) => ({ itemId: String(index), kind: "mcq" as const, correctIndex: 0, shift: 0 }));
    expect(letterCounts(items)).toEqual([12, 0, 0, 0]);
    expect(letterCounts(rebalanceShifts(items))).toEqual([3, 3, 3, 3]);
    const withTf = rebalanceShifts([...items.slice(0, 2), { itemId: "tf", kind: "true_false" as const, correctIndex: null, shift: 2 }]);
    expect(withTf[2].shift).toBe(0);
  });

  it("đổi chỗ câu kề nhau; ra ngoài biên thì giữ nguyên", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});
