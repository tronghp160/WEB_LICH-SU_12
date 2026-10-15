"use client";

import { useVersionedAction } from "@/components/admin/forms/useVersionedAction";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { saveExamItemAction } from "@/lib/actions/exam-bank";
import {
  CHOICE_LETTERS,
  EXAM_COMPETENCIES,
  EXAM_ITEM_LEVELS,
  STATEMENT_LETTERS,
  examCompetencyLabels,
  examItemLevelLabels,
  type ExamItemKind,
  type ExamStatement,
} from "@/lib/exams/items";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

export type ExamItemFormValues = {
  id: string;
  stem: string;
  passage_id: string | null;
  choices: string[] | null;
  correct_index: number | null;
  statements: ExamStatement[] | null;
  explanation: string;
  grade: number;
  lesson_slug: string | null;
  topic_tag: string | null;
  level: string;
  competency: string;
  event_id: string | null;
  source_note: string;
};

type Option = { id: string; label: string };

type Props = {
  kind: ExamItemKind;
  initial?: ExamItemFormValues;
  readOnly?: boolean;
  events: Option[];
  passages: (Option & { status: WorkflowStatus })[];
  /** Tạo xong thì thêm vào đề này (slug). */
  addToSet?: string | null;
};

/** Form câu hỏi trong ngân hàng: trắc nghiệm 4 lựa chọn hoặc Đúng/Sai 4 ý (mỗi ý có đáp án và lời giải riêng). */
export function ExamItemForm({ kind, initial, readOnly = false, events, passages, addToSet }: Props) {
  const [state, formAction, pending] = useVersionedAction(saveExamItemAction);
  const typed = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors ?? {};
  const value = (name: string, fallback: string | number | boolean | null | undefined) => typed?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));
  const correct = value("correct_index", initial?.correct_index);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="kind" value={kind} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {addToSet && <input type="hidden" name="add_to_set" value={addToSet} />}
      <FormMessage state={state} />

      <fieldset key={state.version} disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Field name="passage_id" label="Đoạn tư liệu (nếu câu hỏi dựa trên tư liệu)" error={errors.passage_id}>
          {(props) => (
            <Select {...props} defaultValue={value("passage_id", initial?.passage_id)}>
              <option value="">— Không dùng tư liệu —</option>
              {passages.map((passage) => (
                <option key={passage.id} value={passage.id}>
                  {passage.label} ({workflowStatusLabels[passage.status]})
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          name="stem"
          label={kind === "mcq" ? "Câu hỏi" : "Câu dẫn"}
          required
          error={errors.stem}
          hint={kind === "true_false" ? "Ví dụ: “Đọc đoạn tư liệu sau đây:” hoặc một tình huống; 4 ý a) – d) nhập bên dưới." : undefined}
        >
          {(props) => <Textarea {...props} rows={3} defaultValue={value("stem", initial?.stem)} maxLength={800} />}
        </Field>

        {kind === "mcq" ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-sm font-medium text-foreground">
              Bốn lựa chọn — chọn nút tròn ở đáp án ĐÚNG<span className="ml-0.5 text-accent" aria-hidden="true">*</span>
            </legend>
            <p className="text-xs text-muted-foreground">Đáp án đúng đặt ở vị trí nào cũng được — khi ghép đề, hệ thống xoay thứ tự để rải đều A/B/C/D.</p>
            {CHOICE_LETTERS.map((letter, index) => (
              <div key={letter} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="correct_index"
                  value={String(index)}
                  defaultChecked={correct === String(index)}
                  aria-label={`Lựa chọn ${letter} là đáp án đúng`}
                  className="mt-3 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <Field name={`choice_${index}`} label={`Lựa chọn ${letter}`} error={errors[`choice_${index}`]} className="flex-1">
                  {(props) => <Input {...props} defaultValue={value(`choice_${index}`, initial?.choices?.[index])} maxLength={300} />}
                </Field>
              </div>
            ))}
            {(errors.correct_index || errors.choices) && <p className="text-sm text-accent">{errors.correct_index ?? errors.choices}</p>}
          </fieldset>
        ) : (
          <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
            <legend className="mb-1 text-sm font-medium text-foreground">
              Bốn ý — mỗi ý chọn Đúng hoặc Sai và ghi lời giải riêng<span className="ml-0.5 text-accent" aria-hidden="true">*</span>
            </legend>
            {STATEMENT_LETTERS.map((letter, index) => {
              const truth = value(`statement_${index}_true`, initial?.statements?.[index]?.is_true);
              return (
                <div key={letter} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <Field name={`statement_${index}`} label={`Ý ${letter})`} error={errors[`statement_${index}`]}>
                    {(props) => <Textarea {...props} rows={2} defaultValue={value(`statement_${index}`, initial?.statements?.[index]?.text)} maxLength={500} />}
                  </Field>
                  <div role="radiogroup" aria-label={`Ý ${letter}) đúng hay sai`} className="flex flex-wrap items-center gap-4 text-sm text-foreground">
                    {(["true", "false"] as const).map((option) => (
                      <label key={option} className="flex items-center gap-1.5">
                        <input type="radio" name={`statement_${index}_true`} value={option} defaultChecked={truth === option} className="h-4 w-4 accent-[var(--accent)]" />
                        {option === "true" ? "Đúng" : "Sai"}
                      </label>
                    ))}
                    {errors[`statement_${index}_true`] && <span className="text-accent">{errors[`statement_${index}_true`]}</span>}
                  </div>
                  <Field name={`statement_${index}_explanation`} label={`Lời giải ý ${letter})`} error={errors[`statement_${index}_explanation`]}>
                    {(props) => <Input {...props} defaultValue={value(`statement_${index}_explanation`, initial?.statements?.[index]?.explanation)} maxLength={1000} />}
                  </Field>
                </div>
              );
            })}
            {errors.statements && <p className="text-sm text-accent">{errors.statements}</p>}
          </fieldset>
        )}

        <Field name="explanation" label={kind === "mcq" ? "Lời giải (hiện sau khi nộp bài)" : "Nhận xét chung (hiện sau khi nộp bài)"} required error={errors.explanation}>
          {(props) => <Textarea {...props} rows={3} defaultValue={value("explanation", initial?.explanation)} maxLength={2000} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="level" label="Mức độ" required error={errors.level} hint="Phân vân thì chọn mức thấp hơn.">
            {(props) => (
              <Select {...props} defaultValue={value("level", initial?.level)}>
                <option value="">— Chọn —</option>
                {EXAM_ITEM_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {examItemLevelLabels[level]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="competency" label="Năng lực" required error={errors.competency}>
            {(props) => (
              <Select {...props} defaultValue={value("competency", initial?.competency)}>
                <option value="">— Chọn —</option>
                {EXAM_COMPETENCIES.map((competency) => (
                  <option key={competency} value={competency}>
                    {examCompetencyLabels[competency]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="grade" label="Lớp" required error={errors.grade}>
            {(props) => (
              <Select {...props} defaultValue={value("grade", initial?.grade ?? 12)}>
                <option value="12">Lớp 12</option>
                <option value="11">Lớp 11</option>
              </Select>
            )}
          </Field>
          <Field name="lesson_slug" label="Bài SGK lớp 12" error={errors.lesson_slug} hint="Câu lớp 11 để trống, ghi chủ đề bên cạnh.">
            {(props) => (
              <Select {...props} defaultValue={value("lesson_slug", initial?.lesson_slug)}>
                <option value="">— Không gắn —</option>
                {sgkLessons.map((lesson) => (
                  <option key={lesson.slug} value={lesson.slug}>
                    Bài {lesson.number}. {lesson.shortTitle}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="topic_tag" label="Chủ đề (lớp 11 / liên môn)" error={errors.topic_tag}>
            {(props) => <Input {...props} defaultValue={value("topic_tag", initial?.topic_tag)} maxLength={60} placeholder="Ví dụ: khởi nghĩa Lam Sơn" />}
          </Field>
          <Field name="event_id" label="Sự kiện liên quan" error={errors.event_id} hint="Chỉ hiện liên kết cho học sinh khi sự kiện đã công bố.">
            {(props) => (
              <Select {...props} defaultValue={value("event_id", initial?.event_id)}>
                <option value="">— Không gắn —</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field name="source_note" label="Nguồn" required error={errors.source_note} hint="Cụ thể đến bài / mục, ví dụ: SGK Lịch sử 12 (KNTT), Bài 7, mục 3. Không chép câu của sách / web thương mại.">
          {(props) => <Input {...props} defaultValue={value("source_note", initial?.source_note)} maxLength={500} />}
        </Field>
      </fieldset>

      {!readOnly && (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu…" : initial ? "Lưu câu hỏi" : addToSet ? "Tạo câu và thêm vào đề" : "Tạo câu hỏi"}
          </Button>
        </div>
      )}
    </form>
  );
}
