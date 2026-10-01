import Link from "next/link";
import { ArrowDown, Presentation } from "lucide-react";
import { CountUp } from "@/components/lesson/CountUp";
import { Credit } from "@/components/lesson/sections/shared";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import type { Lesson } from "@/lib/lessons/types";
import type { SgkPlacement } from "@/lib/sgk/curriculum";
import { sgkPaths } from "@/lib/sgk/curriculum";

/** Ảnh mở đầu của chuyên đề: tên, mốc thời gian, số liệu chính, nút Bắt đầu học và Trình chiếu. */
export function LessonHero({ lesson, placement }: { lesson: Lesson; placement?: SgkPlacement }) {
  return (
    <section aria-labelledby="bai-hoc-tieu-de" className="relative isolate flex min-h-[30rem] items-end overflow-hidden bg-black sm:min-h-[34rem]">
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/, là phần tử LCP */}
      <img
        src={lesson.hero.src}
        alt={lesson.hero.alt}
        fetchPriority="high"
        className="lesson-kenburns absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" aria-hidden="true" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-24 text-white sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge variant="accent" className="shrink-0">
            Chuyên đề tương tác
          </Badge>
          {placement && (
            <Link
              href={sgkPaths.section(placement.lesson.slug, placement.section.id)}
              className="text-sm text-white/85 underline-offset-4 hover:text-white hover:underline"
            >
              Thuộc Bài {placement.lesson.number} · mục {placement.section.numeral} — quay về bài
            </Link>
          )}
        </div>
        <h1 id="bai-hoc-tieu-de" className="lesson-rise font-serif text-4xl font-bold text-balance sm:text-6xl">
          {lesson.title}
        </h1>
        <p className="lesson-rise mt-3 text-xl font-semibold text-[#f3d9a4]" style={{ animationDelay: "120ms" }}>
          {lesson.dateText}
        </p>
        <p className="lesson-rise mt-4 max-w-2xl text-lg text-white/90" style={{ animationDelay: "240ms" }}>
          {lesson.tagline}
        </p>
        <ul className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Số liệu chính">
          {lesson.heroStats.map((stat) => (
            <li key={stat.label} className="rounded-card border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <span className="block font-serif text-4xl font-bold">
                <CountUp value={stat.value} />
                {stat.suffix}
              </span>
              <span className="text-sm text-white/85">{stat.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <LinkButton href="#dien-bien" size="lg">
            Bắt đầu học
            <ArrowDown className="h-5 w-5" aria-hidden="true" />
          </LinkButton>
          <Link
            href={`/bai-hoc/${lesson.slug}/trinh-chieu`}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 text-base font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Presentation className="h-5 w-5" aria-hidden="true" />
            Trình chiếu trên lớp
          </Link>
          <p className="text-xs text-white/70">
            Ảnh: {lesson.hero.caption} <Credit image={lesson.hero} />
          </p>
        </div>
      </div>
    </section>
  );
}
