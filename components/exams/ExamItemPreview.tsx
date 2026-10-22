import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { LocationLine, TrapBadge } from "@/components/exams/KnowledgeRef";
import { CHOICE_LETTERS, STATEMENT_LETTERS, type ChoiceNote, type ExamItemKind, type ExamStatement, type KnowledgeRef } from "@/lib/exams/items";
import { cn } from "@/lib/utils/cn";

const camelRef = (ref: KnowledgeRef) => ({ lessonSlug: ref.lesson_slug ?? null, sectionId: ref.section_id ?? null, ref: ref.ref ?? null });

type Passage = { title?: string; body: string; source_citation: string };

type Props = {
  kind: ExamItemKind;
  stem: string;
  passage?: Passage | null;
  /** Lựa chọn theo thứ tự HỌC SINH THẤY (đã xoay nếu đang ở trong đề). */
  choices?: readonly string[] | null;
  /** Đáp án đúng theo thứ tự học sinh thấy. */
  correctIndex?: number | null;
  statements?: readonly ExamStatement[] | null;
  /** Lời giải từng lựa chọn theo thứ tự HỌC SINH THẤY (xoay cùng choices). */
  choiceNotes?: readonly ChoiceNote[] | null;
  explanation?: string;
  remember?: string | null;
  /** Bài + mục của câu (để hiện vị trí kiến thức; lựa chọn / ý không ghi bài thì dùng bài này). */
  lessonSlug?: string | null;
  sectionId?: string | null;
  /** Hiện đáp án + lời giải (cho người soạn / người duyệt; với học sinh chỉ sau khi nộp bài). */
  showAnswers?: boolean;
  /** Số thứ tự hiển thị ("Câu 3"). */
  label?: string;
  className?: string;
};

/** Đoạn tư liệu: giữ xuống dòng, chân trang ghi nguồn. */
export function PassageBlock({ passage }: { passage: Passage }) {
  return (
    <figure className="m-0 rounded-lg border-l-4 border-gold bg-muted/60 px-4 py-3">
      {passage.title && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-deep">Tư liệu</p>}
      <blockquote className="m-0 whitespace-pre-line font-serif text-foreground">{passage.body}</blockquote>
      <figcaption className="mt-2 text-xs text-muted-foreground">Nguồn: {passage.source_citation}</figcaption>
    </figure>
  );
}

/**
 * Một câu hỏi như học sinh thấy: câu trắc nghiệm A–D hoặc câu Đúng/Sai 4 ý a–d, kèm tư liệu nếu có. Dùng ở trang quản trị
 * (xem trước, duyệt) và — từ GĐ3 — phòng thi / trang kết quả.
 */
export function ExamItemPreview({
  kind,
  stem,
  passage,
  choices,
  correctIndex,
  statements,
  choiceNotes,
  explanation,
  remember,
  lessonSlug = null,
  sectionId = null,
  showAnswers = false,
  label,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {passage && <PassageBlock passage={passage} />}
      <p className="whitespace-pre-line font-medium text-foreground">
        {label && <span className="mr-1 font-bold text-gold-deep">{label}.</span>}
        {stem}
      </p>
      {kind === "mcq" && choices && (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {choices.map((choice, index) => {
            const correct = showAnswers && index === correctIndex;
            const note = showAnswers ? choiceNotes?.[index] : undefined;
            return (
              <li key={index} className={cn("flex flex-col gap-1 rounded-lg border px-3 py-2", correct ? "border-success/60 bg-success/10" : "border-border")}>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-foreground">{CHOICE_LETTERS[index]}.</span>
                  <span className="flex-1 text-foreground">{choice}</span>
                  {correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Đáp án đúng" />}
                </div>
                {note && (
                  <div className="pl-5 text-sm text-muted-foreground">
                    {note.note}
                    <TrapBadge trap={note.trap} />
                    <LocationLine refInfo={camelRef(note)} fallbackLesson={lessonSlug} prefix="Ở:" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {kind === "true_false" && statements && (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {statements.map((statement, index) => (
            <li key={index} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-foreground">{STATEMENT_LETTERS[index]})</span>
                <span className="flex-1 text-foreground">{statement.text}</span>
                {showAnswers && (
                  <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-semibold", statement.is_true ? "text-success" : "text-accent")}>
                    {statement.is_true ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    {statement.is_true ? "Đúng" : "Sai"}
                  </span>
                )}
              </div>
              {showAnswers && (
                <div className="pl-5 text-sm text-muted-foreground">
                  {statement.explanation}
                  {!statement.is_true && <TrapBadge trap={statement.trap} />}
                  {(statement.section_id || statement.lesson_slug || statement.ref) && <LocationLine refInfo={camelRef(statement)} fallbackLesson={lessonSlug} prefix="Ở:" />}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {showAnswers && explanation && (
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Lời giải: </strong>
          {explanation}
        </p>
      )}
      {showAnswers && remember && (
        <p className="flex items-start gap-1.5 text-sm text-foreground">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
          <span>
            <strong>Ghi nhớ:</strong> {remember}
          </span>
        </p>
      )}
      {showAnswers && lessonSlug && <LocationLine refInfo={{ lessonSlug, sectionId }} fallbackLesson={null} prefix="Kiến thức chính ở:" />}
    </div>
  );
}
