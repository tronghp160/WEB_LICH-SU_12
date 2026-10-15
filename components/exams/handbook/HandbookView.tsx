import Link from "next/link";
import type { Handbook } from "@/lib/exams/handbook";
import { examItemKindLabels } from "@/lib/exams/items";
import { sgkPaths } from "@/lib/sgk/curriculum";

/** Nội dung sổ tay một bài — dùng được cả ở server lẫn client (không gọi dữ liệu). In gọn trên giấy A4. */
export function HandbookView({ handbook }: { handbook: Handbook }) {
  const { lesson, sections, timeline, figures, tricky } = handbook;
  return (
    <article className="flex flex-col gap-8 text-foreground" data-testid="handbook">
      {lesson.goals.length > 0 && (
        <section aria-labelledby="can-dat" className="flex flex-col gap-2">
          <h2 id="can-dat" className="font-serif text-2xl font-semibold">
            Cần nắm được
          </h2>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            {lesson.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="moc" className="flex flex-col gap-2">
        <h2 id="moc" className="font-serif text-2xl font-semibold">
          Mốc thời gian
        </h2>
        {timeline.length === 0 ? (
          <p className="text-muted-foreground">Các sự kiện của bài đang được biên soạn.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-1.5 border-l-2 border-gold p-0 pl-4" data-testid="handbook-timeline">
            {timeline.map((event) => (
              <li key={event.slug} className="break-inside-avoid">
                <strong className="tabular-nums">{event.dateText}</strong> —{" "}
                <Link href={`/su-kien/${event.slug}`} className="hover:text-accent hover:underline">
                  {event.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="theo-muc" className="flex flex-col gap-4">
        <h2 id="theo-muc" className="font-serif text-2xl font-semibold">
          Theo từng mục
        </h2>
        {sections.map((section) => (
          <div key={section.id} className="flex break-inside-avoid flex-col gap-2">
            <h3 className="font-semibold">
              {section.numeral}. {section.title}
            </h3>
            {section.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Đọc mục này trong{" "}
                <Link href={sgkPaths.section(lesson.slug, section.id)} className="text-accent underline">
                  Bài {lesson.number}
                </Link>
                .
              </p>
            ) : (
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {section.events.map((event) => (
                  <li key={event.slug}>
                    <strong>
                      {event.title} ({event.dateText}):
                    </strong>{" "}
                    {event.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {figures.length > 0 && (
        <section aria-labelledby="nhan-vat" className="flex flex-col gap-2">
          <h2 id="nhan-vat" className="font-serif text-2xl font-semibold">
            Nhân vật
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
            {figures.map((figure) => (
              <li key={figure.slug}>
                <Link href={`/nhan-vat/${figure.slug}`} className="text-accent hover:underline">
                  {figure.name}
                </Link>
                {figure.years && <span className="text-sm text-muted-foreground"> ({figure.years})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="hay-nham" className="flex flex-col gap-2">
        <h2 id="hay-nham" className="font-serif text-2xl font-semibold">
          Câu hay bị nhầm
        </h2>
        {tricky.length === 0 ? (
          <p className="text-sm text-muted-foreground">Mục này tự hiện khi đủ lượt làm bài để biết câu nào nhiều học sinh làm sai.</p>
        ) : (
          <ol className="m-0 flex list-decimal flex-col gap-3 pl-5">
            {tricky.map((item) => (
              <li key={item.itemId} className="break-inside-avoid">
                <span className="whitespace-pre-line">{item.stem}</span>
                <span className="block text-sm">
                  <span className="text-muted-foreground">({examItemKindLabels[item.kind]} · {Math.round(item.p * 100)}% làm đúng)</span> Đáp án:{" "}
                  <strong className="text-success">{item.answer}</strong>
                </span>
                <span className="block text-sm text-muted-foreground">{item.explanation}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
