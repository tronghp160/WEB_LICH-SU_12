import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FlipCard } from "@/components/lesson/FlipCard";
import { SectionHeading } from "@/components/lesson/sections/shared";
import { LessonStudiedMarker } from "@/components/progress/LessonStudiedMarker";
import { PASSPORT_HREF } from "@/components/progress/StampNotice";
import { LinkButton } from "@/components/ui/Button";
import type { Lesson } from "@/lib/lessons/types";
import { quizPaths } from "@/lib/quiz/sets";

/** Ôn tập cuối chuyên đề: thẻ ghi nhớ lật được + lối vào trắc nghiệm (đọc tới đây thì được ghi là đã học). */
export function ReviewSection({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-labelledby="ghi-nho">
      <SectionHeading id="ghi-nho" eyebrow="Tự ôn tập" title="Ghi nhớ nhanh" />
      <p className="-mt-3 mb-5 text-muted-foreground">Đọc câu hỏi, tự trả lời trong đầu, rồi bấm để lật thẻ xem đáp án.</p>
      <LessonStudiedMarker slug={lesson.slug} />
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
      {lesson.quiz && lesson.quiz.length > 0 && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-foreground">
            <strong>Kiểm tra nhanh:</strong> 10 câu trắc nghiệm có ảnh, chấm điểm ngay và gợi ý phần cần ôn lại. Đạt từ 7/10 là em được đóng dấu vào{" "}
            <Link href={PASSPORT_HREF} className="text-accent underline">
              Hộ chiếu lịch sử
            </Link>
            .
          </p>
          <LinkButton href={quizPaths.lesson(lesson.slug)} size="lg">
            Làm trắc nghiệm
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        </div>
      )}
    </section>
  );
}
