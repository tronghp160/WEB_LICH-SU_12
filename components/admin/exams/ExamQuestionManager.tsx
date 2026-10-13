"use client";

import { ListPlus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { addExamQuestionAction, deleteExamQuestionAction, updateExamQuestionAction } from "@/lib/actions/exams";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { EXAM_CHOICE_FIELDS } from "@/lib/exams/admin";
import { sgkLessons } from "@/lib/sgk/curriculum";

export type ExamQuestionData = {
  id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  lesson_slug: string | null;
  event_id: string | null;
  source_note: string;
};

export type EventOption = { id: string; label: string };

const LETTERS = ["A", "B", "C", "D"];

function QuestionFields({ prefix, initial, state, events }: { prefix: string; initial?: ExamQuestionData; state: ActionState; events: EventOption[] }) {
  const typed = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors ?? {};
  const correct = typed?.correct_index ?? (initial ? String(initial.correct_index) : "");

  return (
    <>
      <Field name={`${prefix}-question`} label="Câu hỏi" required error={errors.question}>
        {(props) => <Textarea {...props} name="question" rows={2} defaultValue={typed?.question ?? initial?.question ?? ""} maxLength={600} />}
      </Field>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-medium text-foreground">
          Bốn đáp án — chọn nút tròn ở đáp án ĐÚNG<span className="ml-0.5 text-accent" aria-hidden="true">*</span>
        </legend>
        {EXAM_CHOICE_FIELDS.map((field, index) => (
          <div key={field} className="flex items-start gap-2">
            <input
              type="radio"
              name="correct_index"
              value={String(index)}
              defaultChecked={correct === String(index)}
              aria-label={`Đáp án ${LETTERS[index]} là đáp án đúng`}
              className="mt-3 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <Field name={`${prefix}-${field}`} label={`Đáp án ${LETTERS[index]}`} error={errors[field]} className="flex-1">
              {(props) => <Input {...props} name={field} defaultValue={typed?.[field] ?? initial?.choices[index] ?? ""} maxLength={300} />}
            </Field>
          </div>
        ))}
        {errors.correct_index && <p className="text-sm text-accent">{errors.correct_index}</p>}
      </fieldset>
      <Field name={`${prefix}-explanation`} label="Lời giải thích (hiện sau khi nộp bài)" required error={errors.explanation}>
        {(props) => <Textarea {...props} name="explanation" rows={3} defaultValue={typed?.explanation ?? initial?.explanation ?? ""} maxLength={1500} />}
      </Field>
      <Field
        name={`${prefix}-source`}
        label="Nguồn"
        required
        hint="Ví dụ: SGK Lịch sử 12 (KNTT), Bài 7. Không chép đề của sách / web thương mại."
        error={errors.source_note}
      >
        {(props) => <Input {...props} name="source_note" defaultValue={typed?.source_note ?? initial?.source_note ?? ""} maxLength={500} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name={`${prefix}-lesson`} label="Bài SGK để đọc lại" error={errors.lesson_slug}>
          {(props) => (
            <Select {...props} name="lesson_slug" defaultValue={typed?.lesson_slug ?? initial?.lesson_slug ?? ""}>
              <option value="">— Không gắn —</option>
              {sgkLessons.map((lesson) => (
                <option key={lesson.slug} value={lesson.slug}>
                  Bài {lesson.number}. {lesson.shortTitle}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field name={`${prefix}-event`} label="Sự kiện liên quan" error={errors.event_id} hint="Chỉ hiện liên kết khi sự kiện đã công bố.">
          {(props) => (
            <Select {...props} name="event_id" defaultValue={typed?.event_id ?? initial?.event_id ?? ""}>
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
    </>
  );
}

function QuestionItem({ slug, item, index, events, readOnly }: { slug: string; item: ExamQuestionData; index: number; events: EventOption[]; readOnly: boolean }) {
  const [updateState, updateAction, updating] = useActionState(updateExamQuestionAction, initialActionState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteExamQuestionAction, initialActionState);

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
        Câu {index + 1} · đáp án đúng {LETTERS[item.correct_index]}
      </p>
      <form action={updateAction} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="question_id" value={item.id} />
        <FormMessage state={updateState} />
        <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <QuestionFields prefix={item.id} initial={item} state={updateState} events={events} />
        </fieldset>
        {!readOnly && (
          <div>
            <Button type="submit" size="sm" variant="secondary" disabled={updating}>
              {updating ? "Đang lưu…" : "Lưu câu hỏi"}
            </Button>
          </div>
        )}
      </form>
      {!readOnly && (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Xóa câu hỏi này?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="question_id" value={item.id} />
          <FormMessage state={deleteState} />
          <Button type="submit" size="sm" variant="ghost" disabled={deleting} className="text-accent">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {deleting ? "Đang xóa…" : "Xóa câu hỏi"}
          </Button>
        </form>
      )}
    </li>
  );
}

function AddQuestionForm({ slug, events }: { slug: string; events: EventOption[] }) {
  // Đổi key sau khi thêm thành công để xóa trắng các ô.
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await addExamQuestionAction(previous, formData);
    if (result.status === "success") setFormKey((key) => key + 1);
    return result;
  }, initialActionState);

  return (
    <form key={formKey} action={formAction} noValidate className="flex flex-col gap-4 rounded-card border border-dashed border-border p-4">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <ListPlus className="h-5 w-5 text-gold-deep" aria-hidden="true" />
        Thêm câu hỏi
      </h3>
      <input type="hidden" name="slug" value={slug} />
      <FormMessage state={state} />
      <QuestionFields prefix={`moi-${formKey}`} state={state} events={events} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang thêm…" : "Thêm câu hỏi"}
        </Button>
      </div>
    </form>
  );
}

/** Câu hỏi của một đề luyện thi: sửa khi đề đang nháp / cần chỉnh sửa (biên tập viên) hoặc bất kỳ lúc nào (quản trị viên). */
export function ExamQuestionManager({ slug, questions, events, readOnly }: { slug: string; questions: ExamQuestionData[]; events: EventOption[]; readOnly: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {questions.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {questions.map((item, index) => (
            <QuestionItem key={item.id} slug={slug} item={item} index={index} events={events} readOnly={readOnly} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Đề chưa có câu hỏi nào.</p>
      )}
      {!readOnly && <AddQuestionForm slug={slug} events={events} />}
    </div>
  );
}
