"use client";

import { ListPlus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { addQuizQuestionAction, deleteQuizQuestionAction, updateQuizQuestionAction } from "@/lib/actions/quiz";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { QUIZ_CHOICE_FIELDS } from "@/lib/validation/content";

export type QuizQuestionData = {
  id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  media_id: string | null;
};

/** Ảnh của sự kiện có thể gắn vào câu hỏi. */
export type QuizMediaOption = { id: string; label: string };

type QuizQuestionManagerProps = {
  eventId: string;
  questions: QuizQuestionData[];
  media: QuizMediaOption[];
  readOnly?: boolean;
};

const LETTERS = ["A", "B", "C", "D"];

/** Các ô của một câu hỏi — dùng chung cho thêm mới và sửa. */
function QuestionFields({
  prefix,
  initial,
  state,
  media,
}: {
  prefix: string;
  initial?: QuizQuestionData;
  state: ActionState;
  media: QuizMediaOption[];
}) {
  const typed = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors ?? {};
  const correct = typed?.correct_index ?? (initial ? String(initial.correct_index) : "");

  return (
    <>
      <Field name={`${prefix}-question`} label="Câu hỏi" required error={errors.question}>
        {(props) => <Input {...props} name="question" defaultValue={typed?.question ?? initial?.question ?? ""} maxLength={300} />}
      </Field>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-medium text-foreground">
          Bốn đáp án — chọn nút tròn ở đáp án ĐÚNG<span className="ml-0.5 text-accent" aria-hidden="true">*</span>
        </legend>
        {QUIZ_CHOICE_FIELDS.map((field, index) => (
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
              {(props) => (
                <Input {...props} name={field} defaultValue={typed?.[field] ?? initial?.choices[index] ?? ""} maxLength={200} />
              )}
            </Field>
          </div>
        ))}
        {errors.correct_index && <p className="text-sm text-accent">{errors.correct_index}</p>}
      </fieldset>

      <Field
        name={`${prefix}-explanation`}
        label="Lời giải thích (hiện sau khi học sinh trả lời)"
        required
        error={errors.explanation}
        hint="Nêu vì sao đáp án đúng, nếu được thì giải thích luôn vì sao các đáp án khác sai."
      >
        {(props) => <Textarea {...props} name="explanation" rows={3} defaultValue={typed?.explanation ?? initial?.explanation ?? ""} maxLength={1000} />}
      </Field>

      <Field
        name={`${prefix}-media`}
        label="Ảnh kèm câu hỏi"
        error={errors.media_id}
        hint="Chỉ chọn được ảnh của chính sự kiện này (ghi công ảnh hiện cùng câu hỏi). Chú thích ảnh chỉ hiện sau khi trả lời."
      >
        {(props) => (
          <Select {...props} name="media_id" defaultValue={typed?.media_id ?? initial?.media_id ?? ""}>
            <option value="">— Không có ảnh —</option>
            {media.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

function QuestionItem({ eventId, item, index, media, readOnly }: { eventId: string; item: QuizQuestionData; index: number; media: QuizMediaOption[]; readOnly?: boolean }) {
  const [updateState, updateAction, updating] = useActionState(updateQuizQuestionAction, initialActionState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteQuizQuestionAction, initialActionState);

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Câu {index + 1}</p>
      <form action={updateAction} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="question_id" value={item.id} />
        <FormMessage state={updateState} />
        <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <QuestionFields prefix={item.id} initial={item} state={updateState} media={media} />
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
          <input type="hidden" name="event_id" value={eventId} />
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

function AddQuestionForm({ eventId, media }: { eventId: string; media: QuizMediaOption[] }) {
  // Đổi key sau khi thêm thành công để xóa trắng các ô (ô nhập không điều khiển giữ chữ đã gõ).
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await addQuizQuestionAction(previous, formData);
    if (result.status === "success") setFormKey((key) => key + 1);
    return result;
  }, initialActionState);

  return (
    <form key={formKey} action={formAction} noValidate className="flex flex-col gap-4 rounded-card border border-dashed border-border p-4">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <ListPlus className="h-5 w-5 text-gold-deep" aria-hidden="true" />
        Thêm câu hỏi
      </h3>
      <input type="hidden" name="event_id" value={eventId} />
      <FormMessage state={state} />
      <QuestionFields prefix={`moi-${formKey}`} state={state} media={media} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang thêm…" : "Thêm câu hỏi"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Câu hỏi trắc nghiệm soạn tay của một sự kiện (GĐ4.1). Câu hỏi được duyệt cùng sự kiện: chỉ hiện ở trang
 * công khai khi sự kiện đã công bố; editor chỉ sửa được khi sự kiện đang là nháp hoặc cần chỉnh sửa (RLS).
 */
export function QuizQuestionManager({ eventId, questions, media, readOnly }: QuizQuestionManagerProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Ngoài các câu hỏi này, trang trắc nghiệm còn tự sinh câu hỏi từ ảnh, năm và địa điểm của sự kiện. Chỉ dùng chi tiết
        đã có trong nội dung sự kiện và đã kiểm chứng. Câu hỏi được duyệt cùng sự kiện.
      </p>
      {questions.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {questions.map((item, index) => (
            <QuestionItem key={item.id} eventId={eventId} item={item} index={index} media={media} readOnly={readOnly} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có câu hỏi soạn tay nào.</p>
      )}
      {!readOnly && <AddQuestionForm eventId={eventId} media={media} />}
    </div>
  );
}
