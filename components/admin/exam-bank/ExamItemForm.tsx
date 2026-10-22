"use client";

import { useState } from "react";
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
  TRAP_KINDS,
  examCompetencyLabels,
  examItemLevelLabels,
  trapLabels,
  type ChoiceNote,
  type ExamItemKind,
  type ExamStatement,
  type KnowledgeRef,
} from "@/lib/exams/items";
import { getSgkLesson, sgkLessons } from "@/lib/sgk/curriculum";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

export type ExamItemFormValues = {
  id: string;
  stem: string;
  passage_id: string | null;
  choices: string[] | null;
  correct_index: number | null;
  statements: ExamStatement[] | null;
  choice_notes: ChoiceNote[] | null;
  explanation: string;
  remember: string | null;
  grade: number;
  lesson_slug: string | null;
  section_id: string | null;
  topic_tag: string | null;
  level: string;
  competency: string;
  event_id: string | null;
  source_note: string;
  content_key: string | null;
};

type Option = { id: string; label: string };

type FieldValue = (name: string, fallback: string | number | boolean | null | undefined) => string;

/** Mục SGK của một bài (rỗng khi chưa chọn bài). */
function sectionsOf(lessonSlug: string) {
  return getSgkLesson(lessonSlug)?.sections ?? [];
}

/**
 * Vị trí kiến thức + kiểu bẫy của một lựa chọn / một ý: Bài (bỏ trống = cùng bài của câu), Mục (lọc theo bài), vị trí
 * dạng chữ (câu lớp 11), kiểu bẫy (chỉ lựa chọn / ý SAI). Tên ô: <prefix>_lesson, _section, _ref, _trap (itemFromForm).
 */
function RefFields({ prefix, who, itemLesson, initial, value, errors }: { prefix: string; who: string; itemLesson: string; initial: KnowledgeRef | undefined; value: FieldValue; errors: Record<string, string> }) {
  const [lesson, setLesson] = useState(() => value(`${prefix}_lesson`, initial?.lesson_slug));
  const sections = sectionsOf(lesson || itemLesson);
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Field name={`${prefix}_lesson`} label={`Bài (${who})`} error={errors[`${prefix}_lesson`]}>
        {(props) => (
          <Select {...props} value={lesson} onChange={(event) => setLesson(event.target.value)}>
            <option value="">Cùng bài của câu</option>
            {sgkLessons.map((item) => (
              <option key={item.slug} value={item.slug}>
                Bài {item.number}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name={`${prefix}_section`} label={`Mục (${who})`} error={errors[`${prefix}_section`]}>
        {(props) => (
          <Select {...props} key={lesson || itemLesson} defaultValue={value(`${prefix}_section`, initial?.section_id)}>
            <option value="">—</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Mục {section.numeral}. {section.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name={`${prefix}_trap`} label={`Kiểu bẫy (${who}, nếu sai)`} error={errors[`${prefix}_trap`]}>
        {(props) => (
          <Select {...props} defaultValue={value(`${prefix}_trap`, initial?.trap)}>
            <option value="">—</option>
            {TRAP_KINDS.map((trap) => (
              <option key={trap} value={trap}>
                {trapLabels[trap]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name={`${prefix}_ref`} label={`Vị trí dạng chữ (${who})`} error={errors[`${prefix}_ref`]} hint="Câu lớp 11, ví dụ: SGK Lịch sử 11, Bài 5, mục 2.">
        {(props) => <Input {...props} defaultValue={value(`${prefix}_ref`, initial?.ref)} maxLength={160} />}
      </Field>
    </div>
  );
}

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
  const value: FieldValue = (name, fallback) => typed?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));
  const correct = value("correct_index", initial?.correct_index);
  const [lesson, setLesson] = useState(() => value("lesson_slug", initial?.lesson_slug));

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
            <p className="text-xs text-muted-foreground">
              Đáp án đúng đặt ở vị trí nào cũng được — khi ghép đề, hệ thống xoay thứ tự để rải đều A/B/C/D. Mỗi lựa chọn nên có lời giải riêng: lựa chọn sai thì
              nói nó là gì, vì sao không khớp câu hỏi, nằm ở bài / mục nào và kiểu bẫy.
            </p>
            {CHOICE_LETTERS.map((letter, index) => (
              <div key={letter} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
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
                <Field name={`choice_${index}_note`} label={`Giải thích lựa chọn ${letter}`} error={errors[`choice_${index}_note`]}>
                  {(props) => <Textarea {...props} rows={2} defaultValue={value(`choice_${index}_note`, initial?.choice_notes?.[index]?.note)} maxLength={500} />}
                </Field>
                <RefFields prefix={`choice_${index}`} who={`lựa chọn ${letter}`} itemLesson={lesson} initial={initial?.choice_notes?.[index]} value={value} errors={errors} />
              </div>
            ))}
            {errors.choice_notes && <p className="text-sm text-accent">{errors.choice_notes}</p>}
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
                  <Field
                    name={`statement_${index}_explanation`}
                    label={`Lời giải ý ${letter})`}
                    error={errors[`statement_${index}_explanation`]}
                    hint="Ý sai: chỉ đúng chữ bị đánh tráo, ví dụ “đề viết ‘duy nhất’ — thực tế còn…”."
                  >
                    {(props) => <Input {...props} defaultValue={value(`statement_${index}_explanation`, initial?.statements?.[index]?.explanation)} maxLength={1000} />}
                  </Field>
                  <RefFields prefix={`statement_${index}`} who={`ý ${letter})`} itemLesson={lesson} initial={initial?.statements?.[index]} value={value} errors={errors} />
                </div>
              );
            })}
            {errors.statements && <p className="text-sm text-accent">{errors.statements}</p>}
          </fieldset>
        )}

        <Field name="explanation" label={kind === "mcq" ? "Lời giải (hiện sau khi nộp bài)" : "Nhận xét chung (hiện sau khi nộp bài)"} required error={errors.explanation}>
          {(props) => <Textarea {...props} rows={3} defaultValue={value("explanation", initial?.explanation)} maxLength={2000} />}
        </Field>

        <Field name="remember" label="Ghi nhớ (một câu chốt kiến thức, hiện sau khi nộp bài)" error={errors.remember} hint="10–300 ký tự, ví dụ: Điện Biên Phủ (13-3 → 7-5-1954) đập tan hoàn toàn kế hoạch Na-va.">
          {(props) => <Input {...props} defaultValue={value("remember", initial?.remember)} maxLength={300} />}
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
              <Select {...props} value={lesson} onChange={(event) => setLesson(event.target.value)}>
                <option value="">— Không gắn —</option>
                {sgkLessons.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    Bài {item.number}. {item.shortTitle}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="section_id" label="Mục SGK chứa kiến thức chính" error={errors.section_id} hint="Học sinh bấm vào sẽ tới đúng mục của trang Bài.">
            {(props) => (
              <Select {...props} key={lesson} defaultValue={value("section_id", initial?.section_id)} disabled={!lesson}>
                <option value="">{lesson ? "— Chọn mục —" : "— Chọn bài trước —"}</option>
                {sectionsOf(lesson).map((section) => (
                  <option key={section.id} value={section.id}>
                    Mục {section.numeral}. {section.title}
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
        {initial?.content_key && (
          <p className="text-xs text-muted-foreground">
            Khóa nội dung: <code>{initial.content_key}</code> (đặt khi nhập từ tệp JSON, dùng để ghép đề — không sửa ở đây).
          </p>
        )}
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
