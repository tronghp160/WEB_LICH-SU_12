import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurriculum } from "@/lib/queries/sgk";
import { lessonStatus, sgkPaths } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

/**
 * Mục lục rút gọn ở trang chủ (mục 6.1): 6 chủ đề dạng gáy sách, mỗi chủ đề một màu, các bài là nút nhỏ. Bài có chuyên đề
 * tương tác có dấu ✦; bài đang biên soạn hiện mờ hơn (vẫn mở được khung bài). Dữ liệu tĩnh → luôn hiện, kể cả khi
 * database lỗi.
 */
export async function SgkTocCompact() {
  const { topics } = await getCurriculum();
  return (
    <section id="muc-luc-sgk" aria-labelledby="toc-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="toc-heading" className="font-serif text-2xl font-bold text-foreground sm:text-[1.75rem]">
            Mục lục sách giáo khoa
          </h2>
          <p className="mt-1 text-muted-foreground">Chọn bài em đang học trên lớp.</p>
        </div>
        <Link href={sgkPaths.toc} className="text-sm font-medium text-accent hover:underline">
          Xem mục lục đầy đủ →
        </Link>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li
            key={topic.slug}
            data-topic-color={topic.color}
            className="flex flex-col rounded-card border border-border border-l-[6px] border-l-[var(--topic)] bg-surface p-4 shadow-card"
          >
            <Link href={sgkPaths.topic(topic.slug)} className="group">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--topic)]">Chủ đề {topic.number}</span>
              <span className="mt-0.5 block font-serif text-lg font-bold leading-snug text-foreground group-hover:underline">{topic.shortTitle}</span>
            </Link>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Các bài của chủ đề ${topic.number}`}>
              {topic.lessons.map((lesson) => {
                const status = lessonStatus(lesson);
                return (
                  <li key={lesson.slug}>
                    <Link
                      href={sgkPaths.lesson(lesson.slug)}
                      title={`Bài ${lesson.number}. ${lesson.title}${status === "drafting" ? " (đang biên soạn)" : ""}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                        status === "drafting"
                          ? "border-dashed border-border-strong text-muted-foreground hover:bg-muted"
                          : "border-[var(--topic)] text-[var(--topic)] hover:bg-[var(--topic)] hover:text-background",
                      )}
                    >
                      Bài {lesson.number}
                      {status === "ready" && (
                        <>
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">(có chuyên đề tương tác)</span>
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
