import { ChapterShell, type Chapter } from "@/components/lesson/ChapterShell";
import { ScrollProgress } from "@/components/lesson/ScrollProgress";
import { BattleSection } from "@/components/lesson/sections/BattleSection";
import { FiguresSection } from "@/components/lesson/sections/FiguresSection";
import { GoalBox } from "@/components/lesson/sections/GoalBox";
import { KeyDates } from "@/components/lesson/sections/KeyDates";
import { LessonHero } from "@/components/lesson/sections/LessonHero";
import { ResourceSection } from "@/components/lesson/sections/ResourceSection";
import { ResultsSection } from "@/components/lesson/sections/ResultsSection";
import { ReviewSection } from "@/components/lesson/sections/ReviewSection";
import { SourcesSection } from "@/components/lesson/sections/SourcesSection";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Lesson } from "@/lib/lessons/types";
import { placementForFeature, sgkPaths } from "@/lib/sgk/curriculum";

/**
 * Trang "Chuyên đề tương tác" (mục 6.5): ảnh mở đầu, rồi các CHƯƠNG Mở đầu → Diễn biến trên bản đồ → Kết quả → Nhân vật
 * → Tư liệu → Ôn tập → Nguồn. Máy tính: cuộn liền có mục lục chương bên trái; điện thoại: từng chương một
 * (components/lesson/ChapterShell). Mỗi khối nằm trong components/lesson/sections.
 */
export function LessonView({ lesson }: { lesson: Lesson }) {
  const placement = placementForFeature(lesson.slug);
  const hasResources = lesson.videos.length > 0 || (lesson.artifacts?.length ?? 0) > 0 || lesson.today.length > 0 || Boolean(lesson.cinema);

  const chapters: Chapter[] = [
    {
      id: "mo-dau",
      title: "Mở đầu và mốc thời gian",
      content: (
        <>
          <GoalBox lesson={lesson} />
          <KeyDates lesson={lesson} />
        </>
      ),
    },
    { id: "dien-bien", title: "Diễn biến trên bản đồ", content: <BattleSection lesson={lesson} /> },
    { id: "ket-qua", title: "Kết quả và ý nghĩa", content: <ResultsSection lesson={lesson} /> },
    { id: "nhan-vat", title: "Nhân vật", content: <FiguresSection lesson={lesson} /> },
    ...(hasResources ? [{ id: "tu-lieu", title: "Tư liệu: phim, hiện vật, di tích", content: <ResourceSection lesson={lesson} /> }] : []),
    { id: "on-tap", title: "Ôn tập", content: <ReviewSection lesson={lesson} /> },
    { id: "nguon", title: "Nguồn tham khảo", content: <SourcesSection lesson={lesson} placement={placement} /> },
  ];

  return (
    <article>
      <ScrollProgress />

      {/* Breadcrumb ở trên cùng, trước ảnh mở đầu (V-25). */}
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <Breadcrumb
          items={[
            { label: "Mục lục", href: sgkPaths.toc },
            ...(placement ? [{ label: `Bài ${placement.lesson.number}`, href: sgkPaths.section(placement.lesson.slug, placement.section.id) }] : []),
            { label: `Chuyên đề: ${lesson.title}` },
          ]}
        />
      </div>

      <LessonHero lesson={lesson} placement={placement} />

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pt-10">
        <ChapterShell chapters={chapters} slug={lesson.slug} title={`chuyên đề ${lesson.title}`} />
      </div>
    </article>
  );
}
