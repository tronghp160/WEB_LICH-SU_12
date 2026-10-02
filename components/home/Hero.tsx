import Form from "next/form";
import { Search } from "lucide-react";
import { HeroPrimaryAction } from "@/components/home/HeroPrimaryAction";
import { Button } from "@/components/ui/Button";
import type { HeroSlide } from "@/lib/queries/home";
import { SGK_SERIES } from "@/lib/sgk/curriculum";
import { responsiveImage } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";

/**
 * Hero trang chủ (mục 6.1): tiêu đề NÓI CHỨC NĂNG của web, một nút chính (Bắt đầu học / Học tiếp), lối vào mục lục và ô
 * tìm kiếm. Chữ nằm trên nền phẳng; ảnh tư liệu thật trình chiếu trong khung bên phải (CSS, không cần JavaScript).
 * Không có ảnh (lỗi tải / chưa công bố) thì khung ảnh ẩn, chữ vẫn đủ.
 */
export function Hero({ slides = [] }: { slides?: HeroSlide[] }) {
  // Trình chiếu CSS được viết cho đúng 4 ảnh (xem .hero-slide trong globals.css); ít hơn thì chỉ hiện ảnh đầu.
  const animated = slides.length === 4;

  return (
    <section aria-labelledby="hero-title" className="hero-glow border-b border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-deep">{SGK_SERIES}</p>
          <h1 id="hero-title" className="text-balance font-serif text-[2rem] font-bold leading-tight text-foreground sm:text-5xl">
            Học Lịch sử 12 <span className="text-accent">theo từng bài sách giáo khoa</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            17 bài theo đúng mục lục SGK, kèm bản đồ diễn biến, ảnh tư liệu thật và trắc nghiệm có giải thích. Tiến độ tự lưu để em học
            tiếp lần sau.
          </p>

          <HeroPrimaryAction />

          <Form action="/tra-cuu" role="search" className="mt-8 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 shadow-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold">
              <Search className="ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
              <label htmlFor="hero-search" className="sr-only">
                Tìm kiếm sự kiện, nhân vật, địa điểm
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                maxLength={100}
                autoComplete="off"
                placeholder="Tìm sự kiện, nhân vật, địa điểm"
                className="h-10 min-w-0 flex-1 text-ellipsis bg-transparent pl-3 text-base text-surface-foreground placeholder:text-muted-foreground focus:outline-none sm:pl-0"
              />
              <Button type="submit" variant="secondary">
                Tìm
              </Button>
            </div>
          </Form>
        </div>

        {slides.length > 0 && (
          <figure className="relative hidden aspect-[4/3] overflow-hidden rounded-card border border-border bg-[#1b1714] shadow-card sm:block" aria-label="Ảnh tư liệu">
            {slides.map((slide, index) => (
              <div
                key={slide.slug}
                className={cn("absolute inset-0", animated ? "hero-slide" : index > 0 && "hidden")}
                style={animated ? { animationDelay: `${index * 7}s` } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tư liệu đã có srcset nhiều cỡ */}
                <img
                  {...responsiveImage(slide.image.url, 1200)}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  alt={slide.image.alt}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  className="h-full w-full object-cover"
                  style={slide.image.focalPoint ? { objectPosition: slide.image.focalPoint } : undefined}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10 text-sm text-white">
                  <span className="font-semibold">{slide.title}</span> <span className="text-white/80">({slide.dateText})</span>
                </figcaption>
              </div>
            ))}
          </figure>
        )}
      </div>
    </section>
  );
}
