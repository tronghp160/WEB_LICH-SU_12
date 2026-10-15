import type { Metadata } from "next";
import Link from "next/link";
import { SkillExampleCard } from "@/components/exams/SkillExampleCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { examPaths } from "@/lib/exams/exam";
import { TRUE_FALSE_POINTS, THPT_2025_LABEL } from "@/lib/exams/format";
import { TRUE_FALSE_EXAMPLES, TRUE_FALSE_TRAPS } from "@/lib/exams/skills";

export const metadata: Metadata = {
  title: "Cách làm câu Đúng/Sai môn Lịch sử",
  description: "Cách tính điểm câu Đúng/Sai, 5 bẫy thường gặp (từ tuyệt đối, đánh tráo thời gian, chủ thể, nguyên nhân – kết quả, suy diễn quá tư liệu) và 5 ví dụ có lời giải.",
};

const formatPoint = (value: number) => value.toLocaleString("vi-VN");

// Chuyên đề kỹ năng Đúng/Sai (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8). Miễn phí. Nội dung do web biên soạn.
export default function TrueFalseSkillPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Luyện thi THPT", href: examPaths.hub }, { label: "Kỹ năng làm bài", href: "/luyen-thi/ky-nang" }, { label: "Câu Đúng/Sai" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Cách làm câu Đúng/Sai</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Đề thi tốt nghiệp môn Lịch sử gồm {THPT_2025_LABEL}. Mỗi câu Đúng/Sai có 4 ý a), b), c), d); em xét từng ý là đúng hay sai.
        </p>
      </header>

      <section aria-labelledby="tinh-diem" className="flex flex-col gap-3">
        <h2 id="tinh-diem" className="font-serif text-2xl font-semibold text-foreground">
          Điểm được tính thế nào?
        </h2>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm" data-testid="bang-diem-dung-sai">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Số ý làm đúng trong một câu
                </th>
                {[1, 2, 3, 4].map((count) => (
                  <th key={count} scope="col" className="px-3 py-2 text-right font-medium">
                    {count} ý
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                  Điểm
                </th>
                {[1, 2, 3, 4].map((count) => (
                  <td key={count} className="px-3 py-2 text-right tabular-nums text-foreground">
                    {formatPoint(TRUE_FALSE_POINTS[count])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-foreground">
          Đúng 3 ý chỉ được {formatPoint(TRUE_FALSE_POINTS[3])} điểm, đúng cả 4 ý được trọn {formatPoint(TRUE_FALSE_POINTS[4])} điểm — ý thứ tư đáng giá bằng ba ý
          đầu cộng lại. Vì vậy hãy soát lại từng ý, đừng bỏ trống (ý bỏ trống tính như sai).
        </p>
      </section>

      <section aria-labelledby="cach-lam" className="mt-8 flex flex-col gap-3">
        <h2 id="cach-lam" className="font-serif text-2xl font-semibold text-foreground">
          Cách làm
        </h2>
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-foreground">
          <li>Đọc đề dẫn / tư liệu trước, gạch chân mốc thời gian, nhân vật, địa điểm, tên văn kiện.</li>
          <li>
            Xét từng ý <strong>độc lập</strong> — một câu có thể có 0, 1, 2, 3 hoặc 4 ý đúng.
          </li>
          <li>Với mỗi ý, tìm “chỗ có thể sai”: mốc năm, chủ thể, quan hệ nhân quả, từ chỉ mức độ.</li>
          <li>Ý hỏi “theo tư liệu” thì chỉ dựa vào tư liệu; ý hỏi kiến thức thì đối chiếu với bài học.</li>
        </ol>
      </section>

      <section aria-labelledby="bay" className="mt-8 flex flex-col gap-3">
        <h2 id="bay" className="font-serif text-2xl font-semibold text-foreground">
          5 bẫy thường gặp
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {TRUE_FALSE_TRAPS.map((trap) => (
            <li key={trap.title} className="rounded-card border border-border bg-surface p-4">
              <span className="font-semibold text-foreground">{trap.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{trap.sign}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="vi-du" className="mt-8 flex flex-col gap-3">
        <h2 id="vi-du" className="font-serif text-2xl font-semibold text-foreground">
          Ví dụ có lời giải
        </h2>
        <p className="text-sm text-muted-foreground">Tự làm trước rồi mới mở lời giải. Ví dụ do web biên soạn để luyện tập, không phải đề thi chính thức.</p>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {TRUE_FALSE_EXAMPLES.map((example, index) => (
            <SkillExampleCard key={example.id} example={example} number={index + 1} />
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <LinkButton href={examPaths.practice}>Luyện câu Đúng/Sai theo bài</LinkButton>
        <Link href={examPaths.skillSources} className="text-accent underline">
          Kỹ năng đọc tư liệu →
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Cấu trúc và cách tính điểm chính thức: xem văn bản hướng dẫn của Bộ Giáo dục và Đào tạo tại{" "}
        <a href="https://moet.gov.vn" className="text-accent underline" rel="noopener noreferrer" target="_blank">
          moet.gov.vn
        </a>
        .
      </p>
    </div>
  );
}
