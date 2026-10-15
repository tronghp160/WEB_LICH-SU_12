import type { Metadata } from "next";
import { ImportForm } from "@/components/admin/exam-bank/ImportForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { requireRole } from "@/lib/auth";
import { examBankPaths } from "@/lib/exams/items";

export const metadata: Metadata = { title: "Nhập câu hỏi từ JSON" };

const SAMPLE = `{
  "passages": [
    { "key": "tl-dbp-1", "title": "…", "body": "…đoạn trích…", "source_citation": "Tên văn kiện, nơi xuất bản, năm, trang", "lesson_slug": "7-khang-chien-chong-phap" }
  ],
  "items": [
    { "kind": "mcq", "stem": "…", "choices": ["đáp án đúng", "nhiễu 1", "nhiễu 2", "nhiễu 3"], "correct": 0,
      "explanation": "…", "grade": 12, "lesson_slug": "7-khang-chien-chong-phap", "level": "thong_hieu",
      "competency": "nhan_thuc_tu_duy", "event": "chien-dich-dien-bien-phu", "source_note": "SGK Lịch sử 12 (KNTT), Bài 7, mục 3" },
    { "kind": "true_false", "passage": "tl-dbp-1", "stem": "Đọc đoạn tư liệu sau đây:",
      "statements": [
        { "text": "a) …", "is_true": true, "explanation": "…" }, { "text": "b) …", "is_true": false, "explanation": "…" },
        { "text": "c) …", "is_true": false, "explanation": "…" }, { "text": "d) …", "is_true": true, "explanation": "…" }
      ],
      "explanation": "Nhận xét chung …", "grade": 12, "lesson_slug": "7-khang-chien-chong-phap", "level": "van_dung",
      "competency": "van_dung_kien_thuc", "source_note": "SGK Lịch sử 12 (KNTT), Bài 7" }
  ]
}`;

export default async function ImportPage() {
  await requireRole(["editor", "system_admin"]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Ngân hàng câu hỏi", href: examBankPaths.list }, { label: "Nhập từ JSON" }]} />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">Nhập câu hỏi từ tệp JSON</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Bấm “Kiểm tra” để xem lỗi từng câu (chưa ghi gì). Chỉ khi cả tệp không còn lỗi mới ghi được; mọi câu và tư liệu vào trạng thái nháp, chưa ai
          thấy cho tới khi được duyệt.
        </p>
      </div>
      <details className="rounded-card border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">Mẫu định dạng</summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre text-xs text-foreground">{SAMPLE}</pre>
        <p className="mt-2 text-muted-foreground">
          <code>level</code>: nhan_biet · thong_hieu · van_dung. <code>competency</code>: tim_hieu_lich_su · nhan_thuc_tu_duy · van_dung_kien_thuc.
          Đáp án đúng (<code>correct</code>, 0–3) đặt ở đâu cũng được. Câu lớp 11: <code>&quot;grade&quot;: 11</code> + <code>topic_tag</code>, không có{" "}
          <code>lesson_slug</code>.
        </p>
      </details>
      <section className="rounded-card border border-border bg-surface p-5">
        <ImportForm />
      </section>
    </div>
  );
}
