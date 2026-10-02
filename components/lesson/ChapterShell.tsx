"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { SectionNav } from "@/components/sgk/SectionNav";
import { cn } from "@/lib/utils/cn";

export type Chapter = { id: string; title: string; content: ReactNode };

const chapterAnchor = (id: string) => `chuong-${id}`;

/** Chương chứa phần tử có id = `hash` (neo "#dien-bien" nằm trong chương "dien-bien"). */
function chapterOfHash(hash: string): string | undefined {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return undefined;
  const element = document.getElementById(id);
  return element?.closest<HTMLElement>("[data-chapter]")?.dataset.chapter;
}

/**
 * Khung chương của chuyên đề tương tác (mục 6.5):
 * - Máy tính (≥ lg): mọi chương cuộn liền, mục lục chương dính bên trái, tô sáng chương đang đọc.
 * - Điện thoại: mỗi lần MỘT chương (tránh trang cuộn dài ~13.000px), thanh "Chương 2/7 ▾" dính trên cùng và nút
 *   "Chương trước / Chương tiếp" cuối mỗi chương. Chương khác chỉ ẩn bằng CSS (vẫn có trong trang để in, tìm và để
 *   máy tính hiện đủ), nên neo "#…" tới phần tử trong chương ẩn sẽ tự mở chương đó.
 */
export function ChapterShell({ chapters, slug, title }: { chapters: Chapter[]; slug: string; title: string }) {
  const [active, setActive] = useState(chapters[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const index = Math.max(0, chapters.findIndex((chapter) => chapter.id === active));

  // Neo trong trang: mở đúng chương TRƯỚC khi trình duyệt/Next cuộn tới (phần tử trong chương ẩn không cuộn tới được).
  useEffect(() => {
    const fromHash = chapterOfHash(window.location.hash);
    const frame = fromHash
      ? requestAnimationFrame(() => {
          flushSync(() => setActive(fromHash));
          document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
        })
      : 0;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link || link.pathname !== window.location.pathname) return;
      const chapter = chapterOfHash(link.hash);
      if (chapter) flushSync(() => setActive(chapter));
    };
    const onHashChange = () => {
      const chapter = chapterOfHash(window.location.hash);
      if (chapter) setActive(chapter);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  function goTo(id: string) {
    setActive(id);
    setMenuOpen(false);
    // Đợi chương mới hiện rồi cuộn tới đầu chương (dưới header và thanh chương).
    requestAnimationFrame(() => document.getElementById(chapterAnchor(id))?.scrollIntoView({ block: "start" }));
  }

  const navItems = chapters.map((chapter, i) => ({ id: chapterAnchor(chapter.id), label: chapter.title, numeral: String(i + 1) }));

  return (
    <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <SectionNav lessonSlug={slug} items={navItems} title={title} variant="desktop" />
      </aside>

      <div className="min-w-0">
        {/* Điện thoại: chọn chương. */}
        <nav aria-label={`Các chương của ${title}`} className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden print:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="chapter-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-12 w-full items-center gap-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <span className="shrink-0 text-muted-foreground">
              Chương {index + 1}/{chapters.length}:
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{chapters[index]?.title}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", menuOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {menuOpen && (
            <ol id="chapter-menu" className="flex flex-col gap-0.5 pb-3">
              {chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    onClick={() => goTo(chapter.id)}
                    aria-current={chapter.id === active ? "step" : undefined}
                    className={cn(
                      "flex w-full gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                      chapter.id === active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="w-4 shrink-0 font-serif font-bold text-accent">{i + 1}</span>
                    {chapter.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </nav>

        <div className="flex flex-col gap-16 pt-8 lg:pt-0">
          {chapters.map((chapter, i) => {
            const previous = chapters[i - 1];
            const next = chapters[i + 1];
            return (
              <div
                key={chapter.id}
                id={chapterAnchor(chapter.id)}
                data-chapter={chapter.id}
                className={cn("scroll-mt-32 lg:scroll-mt-24", chapter.id === active ? "" : "hidden lg:block print:block")}
              >
                <div className="flex flex-col gap-16">{chapter.content}</div>
                <div className="mt-10 flex gap-3 lg:hidden print:hidden">
                  {previous && (
                    <button
                      type="button"
                      onClick={() => goTo(previous.id)}
                      className="flex flex-1 items-center gap-2 rounded-card border border-border bg-surface p-3 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block text-xs text-muted-foreground">Chương trước</span>
                        {previous.title}
                      </span>
                    </button>
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => goTo(next.id)}
                      className="flex flex-1 items-center justify-end gap-2 rounded-card border-2 border-accent bg-surface p-3 text-right text-sm font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <span>
                        <span className="block text-xs font-normal text-muted-foreground">Chương tiếp</span>
                        {next.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
