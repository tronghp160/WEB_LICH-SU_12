import type { Metadata } from "next";
import Link from "next/link";
import { FlipCard } from "@/components/lesson/FlipCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { lessons } from "@/lib/lessons";
import { quizPaths } from "@/lib/quiz/sets";
import { placementForFeature, sgkPaths } from "@/lib/sgk/curriculum";

export const metadata: Metadata = {
  title: "Thẻ ghi nhớ",
  description: "Thẻ hỏi – đáp lật được để tự ôn từng bài Lịch sử 12: đọc câu hỏi, tự trả lời, lật thẻ xem đáp án.",
};

/**
 * Thẻ ghi nhớ theo bài (mục 6.6): gom thẻ "Ghi nhớ nhanh" của các chuyên đề tương tác, xếp theo Bài SGK. Dữ liệu viết
 * trong code (lib/lessons) nên trang dựng sẵn.
 */
export default function FlashcardsPage() {
  const decks = lessons
    .filter((lesson) => lesson.flashcards.length > 0)
    .map((lesson) => ({ lesson, placement: placementForFeature(lesson.slug) }))
    .sort((a, b) => (a.placement?.lesson.number ?? 99) - (b.placement?.lesson.number ?? 99));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Ôn tập", href: quizPaths.hub }, { label: "Thẻ ghi nhớ" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Thẻ ghi nhớ</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Đọc câu hỏi, tự trả lời trong đầu, rồi bấm (hoặc nhấn Enter) để lật thẻ xem đáp án. Thẻ nào chưa nhớ thì quay lại bài để đọc kỹ hơn.
        </p>
      </header>

      {decks.length === 0 ? (
        <EmptyState title="Chưa có thẻ ghi nhớ" description="Thẻ ghi nhớ đang được biên soạn cùng các chuyên đề tương tác." />
      ) : (
        <div className="flex flex-col gap-12">
          {decks.map(({ lesson, placement }) => (
            <section key={lesson.slug} aria-labelledby={`bo-the-${lesson.slug}`} data-topic-color={placement?.lesson.topic.color}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[var(--topic,var(--border))] pb-2">
                <h2 id={`bo-the-${lesson.slug}`} className="font-serif text-2xl font-bold text-foreground">
                  {placement && <span className="mr-2 text-[var(--topic)]">Bài {placement.lesson.number}.</span>}
                  {lesson.title}
                </h2>
                <span className="text-sm text-muted-foreground">{lesson.flashcards.length} thẻ</span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lesson.flashcards.map((card, index) => (
                  <li key={card.question}>
                    <FlipCard
                      className="h-52"
                      front={
                        <>
                          <span className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Câu {index + 1}</span>
                          <span className="mt-2 block font-medium">{card.question}</span>
                        </>
                      }
                      back={
                        <>
                          <span className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Đáp án</span>
                          <span className="mt-2 block font-medium">{card.answer}</span>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {placement && (
                  <Link href={sgkPaths.section(placement.lesson.slug, placement.section.id)} className="font-medium text-accent hover:underline">
                    Đọc lại Bài {placement.lesson.number}, mục {placement.section.numeral}
                  </Link>
                )}
                <Link href={`/bai-hoc/${lesson.slug}`} className="font-medium text-accent hover:underline">
                  Mở chuyên đề {lesson.title}
                </Link>
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
