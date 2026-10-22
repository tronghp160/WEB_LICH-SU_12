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
    { "content_key": "b7-m3-tn-05", "kind": "mcq", "stem": "…", "choices": ["đáp án đúng", "nhiễu 1", "nhiễu 2", "nhiễu 3"], "correct": 0,
      "choice_notes": [
        { "note": "Vì sao đúng …", "section_id": "muc-3" },
        { "note": "Nhiễu 1 là gì, vì sao không khớp câu hỏi …", "section_id": "muc-2", "trap": "thoi_gian" },
        { "note": "…", "lesson_slug": "8-khang-chien-chong-my-cuu-nuoc", "section_id": "muc-1", "trap": "chu_the" },
        { "note": "…", "ref": "SGK Lịch sử 11 (KNTT), Bài 5, mục 2", "trap": "ban_chat" }
      ],
      "explanation": "…", "remember": "Một câu chốt kiến thức …", "grade": 12, "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3",
      "level": "thong_hieu", "competency": "nhan_thuc_tu_duy", "event": "chien-dich-dien-bien-phu", "source_note": "SGK Lịch sử 12 (KNTT), Bài 7, mục 3" },
    { "content_key": "b7-m3-ds-01", "kind": "true_false", "passage": "tl-dbp-1", "stem": "Đọc đoạn tư liệu sau đây:",
      "statements": [
        { "text": "a) …", "is_true": true, "explanation": "…", "section_id": "muc-3" },
        { "text": "b) …", "is_true": false, "explanation": "Đề viết “…” — thực tế …", "section_id": "muc-3", "trap": "khai_niem" },
        { "text": "c) …", "is_true": false, "explanation": "…", "trap": "tuyet_doi" }, { "text": "d) …", "is_true": true, "explanation": "…" }
      ],
      "explanation": "Nhận xét chung …", "grade": 12, "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3", "level": "van_dung",
      "competency": "van_dung_kien_thuc", "source_note": "SGK Lịch sử 12 (KNTT), Bài 7, mục 3" }
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
        <p className="mt-2 text-muted-foreground">
          Lời giải “sai ở đâu – bài nào – mục nào” (tùy chọn, nên có): <code>section_id</code> (<code>muc-N</code> của bài), <code>choice_notes</code> — đúng 4 lời
          giải theo thứ tự lựa chọn trong tệp, mỗi lời giải có thể ghi <code>lesson_slug</code> (bỏ trống = bài của câu), <code>section_id</code>, <code>ref</code>{" "}
          (vị trí dạng chữ, ví dụ câu lớp 11), <code>trap</code>; mỗi ý Đúng/Sai cũng nhận các khóa đó. <code>trap</code> (chỉ ở lựa chọn / ý SAI): thoi_gian ·
          chu_the · dia_diem · so_lieu · nhan_qua · tuyet_doi · khai_niem · ban_chat. <code>remember</code>: một câu ghi nhớ 10–300 ký tự.{" "}
          <code>content_key</code>: khóa ổn định, không trùng (vd. <code>b7-m3-tn-05</code>). <code>event_slug</code> dùng thay <code>event</code> được.
        </p>
      </details>
      <section className="rounded-card border border-border bg-surface p-5">
        <ImportForm />
      </section>
    </div>
  );
}
