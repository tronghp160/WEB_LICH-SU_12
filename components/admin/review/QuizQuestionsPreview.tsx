import { Check } from "lucide-react";
import type { QuizQuestionData } from "@/components/admin/QuizQuestionManager";

const LETTERS = ["A", "B", "C", "D"];

/** Câu hỏi trắc nghiệm soạn tay của sự kiện đang duyệt (chỉ xem): công bố sự kiện là công bố luôn các câu này. */
export function QuizQuestionsPreview({ questions }: { questions: QuizQuestionData[] }) {
  return (
    <section aria-labelledby="duyet-trac-nghiem" className="rounded-card border border-border bg-background p-4 sm:p-6">
      <h2 id="duyet-trac-nghiem" className="font-serif text-xl font-bold text-foreground">
        Câu hỏi trắc nghiệm ({questions.length})
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Các câu này sẽ hiện ở trang Trắc nghiệm khi sự kiện được công bố. Câu hỏi tự sinh (từ ảnh, năm, địa điểm) không liệt
        kê ở đây vì chúng lấy thẳng từ nội dung đã duyệt.
      </p>
      {questions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sự kiện chưa có câu hỏi soạn tay.</p>
      ) : (
        <ol className="mt-4 flex list-none flex-col gap-4 p-0">
          {questions.map((question, index) => (
            <li key={question.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-medium text-foreground">
                Câu {index + 1}. {question.question}
                {question.media_id && <span className="ml-2 text-xs text-muted-foreground">(có ảnh kèm)</span>}
              </p>
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {question.choices.map((choice, position) => (
                  <li key={position} className={position === question.correct_index ? "font-semibold text-success" : "text-foreground"}>
                    {LETTERS[position]}. {choice}
                    {position === question.correct_index && (
                      <>
                        <Check className="ml-1 inline h-4 w-4" aria-hidden="true" />
                        <span className="sr-only"> (đáp án đúng)</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Giải thích:</span> {question.explanation}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
