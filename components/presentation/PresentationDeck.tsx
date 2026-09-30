"use client";

import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { PresentationMap } from "@/components/presentation/PresentationMap";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  buildSlides,
  nextPosition,
  previousPosition,
  slideBuilds,
  slideFromHash,
  slideLabel,
  type DeckPosition,
  type Slide,
} from "@/lib/lessons/presentation";
import type { Lesson, LessonImage } from "@/lib/lessons/types";
import { cn } from "@/lib/utils/cn";

const numberFormat = new Intl.NumberFormat("vi-VN");

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function Credit({ image, className }: { image: LessonImage; className?: string }) {
  return (
    <p className={cn("text-sm text-white/70", className)}>
      Ảnh: {image.credit} ·{" "}
      <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
        Trang gốc
      </a>
    </p>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-4xl font-bold text-balance text-white md:text-6xl">{children}</h2>;
}

/** Nội dung một slide (trừ slide bản đồ — xem MapSlide). Cỡ chữ lớn để đọc được trên máy chiếu từ cuối lớp. */
function SlideBody({ slide, build }: { slide: Exclude<Slide, { kind: "map" }>; build: number }) {
  switch (slide.kind) {
    case "title":
      return (
        <div className="relative flex h-full items-end overflow-hidden">
          <SafeImage src={slide.image.src} alt={slide.image.alt} className="absolute inset-0 h-full w-full object-cover" fallbackClassName="absolute inset-0" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" aria-hidden="true" />
          <div className="relative flex w-full flex-col gap-4 p-8 md:p-16">
            <p className="text-2xl font-medium text-[#e9c98f] md:text-3xl">{slide.dateText}</p>
            <h2 className="font-serif text-5xl font-bold text-balance text-white md:text-8xl">{slide.title}</h2>
            <p className="max-w-4xl text-2xl text-white/90 md:text-3xl">{slide.tagline}</p>
            <Credit image={slide.image} />
          </div>
        </div>
      );
    case "objectives":
      return (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center-safe gap-8 p-8 md:p-16">
          <Heading>{slide.title}</Heading>
          <ol className="flex list-decimal flex-col gap-5 pl-10 text-2xl text-white/90 md:text-3xl">
            {slide.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="text-lg text-white/60">{slide.textbook}</p>
        </div>
      );
    case "key-dates":
      return (
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center-safe gap-8 p-8 md:p-16">
          <Heading>{slide.title}</Heading>
          <ol className="grid list-none gap-x-10 gap-y-4 p-0 md:grid-cols-2">
            {slide.dates.map((item) => (
              <li key={item.date} className="flex items-baseline gap-4 border-b border-white/15 pb-3">
                <span className="w-40 shrink-0 font-serif text-2xl font-bold text-[#e9c98f] md:text-3xl">{item.date}</span>
                <span className="text-xl text-white/90 md:text-2xl">{item.text}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "stats":
      return (
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center-safe gap-10 p-8 md:p-16">
          <Heading>{slide.title}</Heading>
          <ul className="grid list-none gap-8 p-0 md:grid-cols-3">
            {slide.stats.map((stat) => (
              <li key={stat.label} className="flex flex-col gap-2 border-l-4 border-[#e9c98f] pl-5">
                <span className="font-serif text-6xl font-bold text-white md:text-7xl">
                  {numberFormat.format(stat.value)}
                  {stat.suffix}
                </span>
                <span className="text-xl text-white/80 md:text-2xl">{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "significance":
      return (
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center-safe gap-8 p-8 md:p-16">
          <Heading>{slide.title}</Heading>
          <ul className="grid list-none gap-6 p-0 md:grid-cols-2">
            {slide.items.map((item) => (
              <li key={item.title} className="rounded-2xl bg-white/5 p-6">
                <p className="font-serif text-2xl font-bold text-[#e9c98f] md:text-3xl">{item.title}</p>
                <p className="mt-2 text-lg text-white/90 md:text-2xl">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "quote":
      return (
        <figure className="mx-auto flex min-h-full max-w-5xl flex-col justify-center-safe gap-6 p-8 md:p-16">
          <blockquote className="whitespace-pre-line font-serif text-4xl italic leading-snug text-white md:text-6xl">{slide.text}</blockquote>
          <figcaption className="text-2xl text-[#e9c98f]">— {slide.author}</figcaption>
        </figure>
      );
    case "figures":
      return (
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center-safe gap-8 p-8 md:p-16">
          <Heading>{slide.title}</Heading>
          <ul className="grid list-none gap-6 p-0 md:grid-cols-2">
            {slide.figures.map((figure) => (
              <li key={figure.name} className="flex gap-4 rounded-2xl bg-white/5 p-5">
                {figure.image && (
                  <SafeImage src={figure.image.src} alt={figure.image.alt} className="h-28 w-24 shrink-0 rounded-lg object-cover" fallbackClassName="h-28 w-24 shrink-0 rounded-lg" />
                )}
                <div>
                  <p className="font-serif text-2xl font-bold text-white md:text-3xl">{figure.name}</p>
                  <p className="text-lg text-[#e9c98f]">{figure.role}</p>
                  <p className="mt-1 text-lg text-white/85">{figure.text}</p>
                  {figure.image && <Credit image={figure.image} className="mt-1 text-xs" />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    case "photo":
      return (
        <figure className="flex h-full flex-col gap-3 p-4 md:p-8">
          <p className="text-xl font-medium text-[#e9c98f] md:text-2xl">{slide.title}</p>
          <div className="min-h-0 flex-1">
            <SafeImage src={slide.image.src} alt={slide.image.alt} className="h-full w-full object-contain" fallbackClassName="h-full w-full" />
          </div>
          <figcaption className="flex flex-col gap-1">
            <span className="text-2xl text-white md:text-3xl">{slide.image.caption}</span>
            <Credit image={slide.image} />
          </figcaption>
        </figure>
      );
    case "flashcard":
      return (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center-safe gap-8 p-8 md:p-16">
          <p className="text-xl font-medium uppercase tracking-wide text-[#e9c98f]">
            Ghi nhớ nhanh · Câu {slide.index}/{slide.total}
          </p>
          <p className="font-serif text-4xl font-bold text-balance text-white md:text-6xl">{slide.card.question}</p>
          {build >= 1 ? (
            <p className="rounded-2xl border-l-4 border-[#e9c98f] bg-white/5 p-6 text-2xl text-white md:text-4xl">{slide.card.answer}</p>
          ) : (
            <p className="text-xl text-white/60">Cả lớp cùng suy nghĩ… Bấm “Tiếp” (hoặc phím →) để hiện đáp án.</p>
          )}
        </div>
      );
    case "end":
      return (
        <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center-safe gap-8 p-8 text-center md:p-16">
          <Heading>{slide.title}</Heading>
          <p className="text-2xl text-white/90 md:text-3xl">Cả lớp làm 10 câu trắc nghiệm có ảnh để ôn lại bài.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={slide.quizHref} className="rounded-full bg-[#e9c98f] px-8 py-4 text-2xl font-bold text-[#1c1815] hover:opacity-90">
              Làm trắc nghiệm
            </Link>
            <Link href={slide.lessonHref} className="rounded-full border border-white/40 px-8 py-4 text-2xl text-white hover:bg-white/10">
              Về bài học
            </Link>
          </div>
        </div>
      );
  }
}

/** Slide bản đồ: bản đồ lớn bên trái, lời dẫn chữ to bên phải (trên điện thoại: xếp dọc). */
function MapSlide({ lesson, slide }: { lesson: Lesson; slide: Extract<Slide, { kind: "map" }> }) {
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:grid-rows-1">
      <div className="min-h-0 bg-black">
        <PresentationMap scenario={lesson.battle} stepIndex={slide.stepIndex} />
      </div>
      <div className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto p-6 lg:max-h-none lg:justify-center-safe lg:p-8">
        <p className="text-lg font-medium text-[#e9c98f]">
          Bước {slide.stepIndex + 1}/{lesson.battle.steps.length}
          {slide.dateText && ` · ${slide.dateText}`}
        </p>
        <h2 className="font-serif text-3xl font-bold text-white xl:text-5xl">{slide.title}</h2>
        <p className="text-xl leading-relaxed text-white/90 xl:text-2xl">{slide.caption}</p>
        {slide.fact && (
          <div className="rounded-2xl bg-white/5 p-5">
            <p className="font-bold text-[#e9c98f]">{slide.fact.title}</p>
            <p className="mt-1 text-lg text-white/85">{slide.fact.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Chế độ trình chiếu (GĐ4.7): toàn màn hình, nền tối, chữ to; ←/→ (hoặc PageUp/PageDown, Space) để chuyển,
 * Home/End về đầu/cuối, F bật/tắt toàn màn hình. Số slide lưu trên URL (#5) để tải lại không mất vị trí.
 */
export function PresentationDeck({ lesson }: { lesson: Lesson }) {
  const [slides] = useState(() => buildSlides(lesson));
  const [fullscreen, setFullscreen] = useState(false);
  const swipeStart = useRef<number | null>(null);

  // Slide đang chiếu = số trên URL (#5). Server và lần hydrate đầu thấy hash rỗng (slide 1), sau đó đọc hash thật.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const slideIndex = slideFromHash(hash, slides.length);
  // "Bước bấm" trong slide (thẻ ghi nhớ: câu hỏi → đáp án); chỉ có nghĩa với đúng slide đã ghi.
  const [buildState, setBuildState] = useState<DeckPosition>({ slide: -1, build: 0 });
  const build = buildState.slide === slideIndex ? buildState.build : 0;
  const position = useMemo<DeckPosition>(() => ({ slide: slideIndex, build }), [slideIndex, build]);
  const slide = slides[position.slide];

  const go = useCallback(
    (next: DeckPosition) => {
      setBuildState(next);
      if (next.slide !== slideIndex) {
        // replaceState: chuyển slide không làm dài lịch sử trình duyệt (nút Back vẫn về trang bài học).
        window.history.replaceState(null, "", `#${next.slide + 1}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    },
    [slideIndex],
  );
  const forward = useCallback(() => go(nextPosition(slides, position)), [go, slides, position]);
  const backward = useCallback(() => go(previousPosition(slides, position)), [go, slides, position]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      // Bản đồ Leaflet dùng phím mũi tên để kéo bản đồ khi đang được chọn.
      if (target?.closest(".leaflet-container")) return;
      const onControl = target && ["BUTTON", "A"].includes(target.tagName);
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          forward();
          break;
        case " ":
          if (onControl) return;
          event.preventDefault();
          forward();
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          backward();
          break;
        case "Home":
          event.preventDefault();
          go({ slide: 0, build: 0 });
          break;
        case "End":
          event.preventDefault();
          go({ slide: slides.length - 1, build: slideBuilds(slides[slides.length - 1]) - 1 });
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, backward, go, slides, toggleFullscreen]);

  const progress = ((position.slide + 1) / slides.length) * 100;
  const lessonHref = `/bai-hoc/${lesson.slug}`;

  return (
    <div
      className="deck-stage fixed inset-0 z-[60] flex flex-col bg-[#14110e] text-white"
      role="region"
      aria-roledescription="bài trình chiếu"
      aria-label={`Trình chiếu: ${lesson.title}`}
    >
      <h1 className="sr-only">Trình chiếu: {lesson.title}</h1>
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 text-sm text-white/70">
        <span className="truncate">
          {lesson.title} · <span className="text-white">{slideLabel(slide)}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9c98f]"
          >
            {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình (F)"}</span>
            <span className="sr-only sm:hidden">{fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}</span>
          </button>
          <Link
            href={lessonHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9c98f]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Thoát trình chiếu</span>
            <span className="sr-only sm:hidden">Thoát trình chiếu</span>
          </Link>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto"
        onPointerDown={(event) => {
          swipeStart.current = slide.kind === "map" || event.pointerType === "mouse" ? null : event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeStart.current === null) return;
          const dx = event.clientX - swipeStart.current;
          swipeStart.current = null;
          if (dx < -60) forward();
          else if (dx > 60) backward();
        }}
      >
        <p className="sr-only" aria-live="polite">
          Slide {position.slide + 1}/{slides.length}: {slideLabel(slide)}
        </p>
        {slide.kind === "map" ? <MapSlide lesson={lesson} slide={slide} /> : <SlideBody key={position.slide} slide={slide} build={position.build} />}
      </div>

      <div className="flex h-14 shrink-0 items-center gap-3 px-4">
        <button
          type="button"
          onClick={backward}
          disabled={position.slide === 0 && position.build === 0}
          className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-white hover:bg-white/10 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9c98f]"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          Lùi
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <div className="h-full rounded-full bg-[#e9c98f] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <span className="w-16 text-center text-sm tabular-nums text-white/70">
          {position.slide + 1}/{slides.length}
        </span>
        <button
          type="button"
          onClick={forward}
          disabled={position.slide === slides.length - 1}
          className="inline-flex h-10 items-center gap-1 rounded-full bg-[#e9c98f] px-5 font-bold text-[#1c1815] hover:opacity-90 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98f]"
        >
          Tiếp
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
