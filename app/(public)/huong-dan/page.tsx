import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ListChecks, Presentation, Route, Search, Stamp } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";

export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng",
  description: "Cách học theo bài SGK, dùng bản đồ diễn biến, làm trắc nghiệm, xem tiến độ; mục riêng cho giáo viên.",
};

const STUDENT_STEPS = [
  {
    icon: BookOpen,
    title: "1. Học theo bài",
    text: (
      <>
        Mở{" "}
        <Link href="/muc-luc" className="text-accent underline">
          Mục lục
        </Link>{" "}
        (menu “Học theo bài”), chọn bài em đang học trên lớp. Mỗi bài chia theo các mục như SGK; cột trái (trên điện thoại: thanh “Đang
        đọc” ở trên cùng) cho biết em đang ở mục nào. Đọc tới mục nào, web nhớ mục đó.
      </>
    ),
  },
  {
    icon: Route,
    title: "2. Xem diễn biến trên bản đồ",
    text: (
      <>
        Bài có dấu ✦ có <strong>chuyên đề tương tác</strong>. Trong đó, bấm <strong>Phát</strong> để bản đồ tự chạy qua từng bước, hoặc chọn một
        bước trong danh sách các bước. Nút <strong>Chú giải</strong> ở góc trên bản đồ giải thích các ký hiệu (trên máy tính có thể ghim cho luôn mở).
      </>
    ),
  },
  {
    icon: ListChecks,
    title: "3. Làm trắc nghiệm",
    text: (
      <>
        Cuối mỗi bài có phần <strong>Luyện tập</strong>. Mỗi lượt 10 câu, có ảnh tư liệu, chấm điểm và giải thích ngay. Bấm phím 1–4 để chọn
        nhanh đáp án.
      </>
    ),
  },
  {
    icon: Stamp,
    title: "4. Xem tiến độ",
    text: (
      <>
        Biểu tượng con dấu ở góc trên mở{" "}
        <Link href="/ho-chieu" className="text-accent underline">
          Hộ chiếu lịch sử
        </Link>
        : đạt từ 7/10 câu được đóng một con dấu. Trang chủ có nút <strong>Học tiếp</strong> đưa em về đúng chỗ đang học dở.
      </>
    ),
  },
  {
    icon: Search,
    title: "5. Tìm nhanh",
    text: (
      <>
        Bấm phím <kbd className="rounded border border-border px-1">/</kbd> (hoặc Ctrl + K) ở bất kỳ trang nào để tìm. Gõ “bài 7”, “1954” hay
        “dien bien” (không dấu) đều được.
      </>
    ),
  },
];

/** Hướng dẫn sử dụng (mục 6.11): một trang ngắn cho học sinh, kèm mục riêng cho giáo viên. */
export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Hướng dẫn sử dụng" }]} />
      <header className="mb-10 mt-5">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-[2.5rem]">Hướng dẫn sử dụng</h1>
        <p className="mt-2 text-lg text-muted-foreground">Năm bước để dùng web hiệu quả. Đọc mất khoảng 2 phút.</p>
      </header>

      <section aria-labelledby="hoc-sinh">
        <h2 id="hoc-sinh" className="mb-5 font-serif text-2xl font-bold text-foreground">
          Dành cho học sinh
        </h2>
        <ol className="flex flex-col gap-4">
          {STUDENT_STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 rounded-card border border-border bg-surface p-5">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-gold-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-1 leading-relaxed text-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="giao-vien" className="mt-12">
        <h2 id="giao-vien" className="mb-5 flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
          <Presentation className="h-6 w-6 text-gold-deep" aria-hidden="true" />
          Dành cho giáo viên
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
          <li>
            <strong>Trình chiếu trên lớp:</strong> trong chuyên đề tương tác, bấm “Trình chiếu trên lớp”. Dùng phím ← → (hoặc PageUp/PageDown của
            bút trình chiếu) để chuyển trang, phím F để bật/tắt toàn màn hình, nút “Thoát trình chiếu” để quay lại bài.
          </li>
          <li>
            <strong>In:</strong> trang Mục lục và trang Bài có nút “In” (menu và nút bấm tự ẩn khi in) để phát cho lớp.
          </li>
          <li>
            <strong>Giao bài:</strong> mỗi bài và mỗi mục có đường dẫn riêng (ví dụ <code>/bai/7-khang-chien-chong-phap#muc-3</code>) để gửi cho học
            sinh.
          </li>
        </ul>
        <Callout variant="warning" title="Lưu ý về tiến độ" className="mt-6">
          Tiến độ và con dấu chỉ lưu trên trình duyệt đang dùng (không cần tài khoản). Đổi máy, dùng chế độ ẩn danh hoặc xóa dữ liệu trình duyệt thì
          tiến độ không đi theo.
        </Callout>
      </section>
    </div>
  );
}
