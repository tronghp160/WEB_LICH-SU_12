import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { HeroSlide } from "@/lib/queries/home";
import { responsiveImage } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";

/**
 * Hero trang chủ (UC01): ảnh tư liệu thật chạy trình chiếu phía sau (CSS, không cần JavaScript), khẩu hiệu
 * và ô tìm kiếm nhanh → /tra-cuu?q=. Không có ảnh (lỗi tải/chưa công bố) thì về nền chữ như cũ.
 * Người dùng bật "giảm chuyển động": chỉ hiện ảnh đầu tiên, đứng yên.
 */
export function Hero({ slides = [] }: { slides?: HeroSlide[] }) {
  const hasImages = slides.length > 0;
  // Trình chiếu CSS được viết cho đúng 4 ảnh (xem .hero-slide trong globals.css); ít hơn thì chỉ hiện ảnh đầu.
  const animated = slides.length === 4;

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-border",
        hasImages ? "bg-[#1b1714] text-white" : "hero-glow",
      )}
    >
      {hasImages && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {slides.map((slide, index) => (
            <div
              key={slide.slug}
              className={cn("absolute inset-0", animated ? "hero-slide" : index > 0 && "hidden")}
              style={animated ? { animationDelay: `${index * 7}s` } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh nền trang trí, đã có srcset nhiều cỡ */}
              <img
                {...responsiveImage(slide.image.url, 1600)}
                sizes="100vw"
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                className="hero-slide-img h-full w-full object-cover opacity-60"
                style={slide.image.focalPoint ? { objectPosition: slide.image.focalPoint } : undefined}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className={cn("mb-3 text-sm font-semibold uppercase tracking-widest", hasImages ? "text-[#f3d9a4]" : "text-gold-deep")}>
          Lịch sử Việt Nam · Lớp 12
        </p>
        <h1
          className={cn(
            "max-w-3xl text-balance font-serif text-4xl font-bold leading-tight sm:text-5xl",
            hasImages ? "text-white" : "text-foreground",
          )}
        >
          Mỗi bức ảnh là <span className={hasImages ? "text-[#f3d9a4]" : "text-accent"}>một câu chuyện có thật</span>
        </h1>
        <p className={cn("mt-4 max-w-2xl text-lg", hasImages ? "text-white/85" : "text-muted-foreground")}>
          Hãy nhìn tận mắt những khoảnh khắc làm nên Việt Nam, rồi đi theo dòng thời gian và bản đồ để hiểu vì sao
          chúng xảy ra. Mọi nội dung đều có nguồn tham khảo.
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

        {hasImages && (
          <div className="mt-10">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/70">Ảnh trong khung hình</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {slides.map((slide, index) => (
                <li key={slide.slug}>
                  <Link
                    href={`/su-kien/${slide.slug}`}
                    className={cn(
                      "underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                      animated ? "hero-caption" : "text-white/85",
                    )}
                    style={animated ? { animationDelay: `${index * 7}s` } : undefined}
                  >
                    {slide.title} <span className="text-white/60">({slide.dateText})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
