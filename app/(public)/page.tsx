import { LinkButton } from "@/components/ui/Button";

// Trang chủ tạm thời cho Phase 3 (khung giao diện). Nội dung thật (chủ đề,
// sự kiện nổi bật, ô tìm kiếm — UC01) sẽ được xây dựng ở Phase 4.
export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <p className="font-medium text-gold">Đồ án cơ sở ngành — Lịch sử Việt Nam 12</p>
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        Tìm hiểu Lịch sử Việt Nam qua bản đồ và dòng thời gian tương tác
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        Khung giao diện (Phase 3) đã sẵn sàng. Trang tổng quan với chủ đề, sự kiện nổi bật và ô
        tìm kiếm nhanh sẽ được xây dựng ở Phase 4.
      </p>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/dong-thoi-gian" variant="primary">
          Xem dòng thời gian
        </LinkButton>
        <LinkButton href="/ban-do" variant="secondary">
          Khám phá bản đồ
        </LinkButton>
      </div>
    </div>
  );
}
