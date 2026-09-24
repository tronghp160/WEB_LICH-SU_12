import Form from "next/form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Hero trang chủ: tên hệ thống, mô tả ngắn, ô tìm kiếm nhanh → /tra-cuu?q= (UC01). */
export function Hero() {
  return (
    <section className="hero-glow border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-deep">
          Lịch sử Việt Nam · Lớp 12
        </p>
        <h1 className="max-w-3xl text-balance font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Khám phá lịch sử qua{" "}
          <span className="whitespace-nowrap text-accent">dòng thời gian</span> và{" "}
          <span className="whitespace-nowrap text-accent">bản đồ</span> tương tác
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Xem sự kiện, nhân vật và địa điểm trong chương trình Lịch sử 12 theo thời gian và không
          gian — mọi nội dung đều có nguồn tham khảo.
        </p>

        <Form action="/tra-cuu" role="search" className="mt-8 max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 shadow-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold">
            {/* Icon ẩn ở màn hình hẹp: nút "Tìm kiếm" đã đủ gợi ý, nhường chỗ cho placeholder. */}
            <Search
              className="ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block"
              aria-hidden="true"
            />
            <label htmlFor="hero-search" className="sr-only">
              Tìm kiếm sự kiện, nhân vật, địa điểm
            </label>
            <input
              id="hero-search"
              name="q"
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="Tìm sự kiện, nhân vật"
              className="h-10 min-w-0 flex-1 text-ellipsis bg-transparent pl-3 text-base text-surface-foreground placeholder:text-muted-foreground focus:outline-none sm:pl-0"
            />
            <Button type="submit">Tìm kiếm</Button>
          </div>
        </Form>
      </div>
    </section>
  );
}
