"use client";

import { useVersionedAction } from "@/components/admin/forms/useVersionedAction";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { updateExamSetAction } from "@/lib/actions/exams";
import { EXAM_FORMATS, examDifficultyLabels, examFormatLabels, THPT_2025, THPT_2025_PARTS } from "@/lib/exams/format";

type Props = {
  set: { slug: string; title: string; description: string | null; format: string; duration_min: number; difficulty: number | null; sort_order: number; free: boolean };
  readOnly: boolean;
};

/** Thông tin chung của đề: tên, mô tả, loại đề, thời gian, độ khó, thứ tự, miễn phí hay thuộc gói. */
export function ExamSetForm({ set, readOnly }: Props) {
  const [state, formAction, pending] = useVersionedAction(updateExamSetAction);
  const errors = state.fieldErrors ?? {};
  const typed = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={set.slug} />
      <FormMessage state={state} />
      <fieldset key={state.version} disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field name="title" label="Tên đề" required error={errors.title}>
          {(props) => <Input {...props} defaultValue={typed?.title ?? set.title} maxLength={160} />}
        </Field>
        <Field name="description" label="Mô tả ngắn" error={errors.description} hint="Hiện ở danh sách đề cho học sinh.">
          {(props) => <Textarea {...props} rows={2} defaultValue={typed?.description ?? set.description ?? ""} maxLength={500} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="format" label="Loại đề" required error={errors.format} hint={`Đề đầy đủ: ${THPT_2025_PARTS}.`}>
            {(props) => (
              <Select {...props} defaultValue={typed?.format ?? set.format}>
                {EXAM_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {examFormatLabels[format]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="duration_min" label="Thời gian (phút)" required error={errors.duration_min} hint={`Đề đầy đủ: ${THPT_2025.durationMin} phút.`}>
            {(props) => <Input {...props} type="number" min={5} max={180} defaultValue={typed?.duration_min ?? String(set.duration_min)} />}
          </Field>
          <Field name="difficulty" label="Độ khó (nhãn hiển thị)" error={errors.difficulty}>
            {(props) => (
              <Select {...props} defaultValue={typed?.difficulty ?? (set.difficulty ? String(set.difficulty) : "")}>
                <option value="">— Không ghi —</option>
                {([1, 2, 3] as const).map((level) => (
                  <option key={level} value={level}>
                    {examDifficultyLabels[level]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="sort_order" label="Thứ tự hiển thị" error={errors.sort_order}>
            {(props) => <Input {...props} type="number" defaultValue={typed?.sort_order ?? String(set.sort_order)} />}
          </Field>
        </div>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" name="free" defaultChecked={typed ? typed.free === "on" : set.free} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>Đề miễn phí (dùng thử, ai cũng làm được). Bỏ chọn = thuộc Gói luyện thi.</span>
        </label>
      </fieldset>
      {!readOnly && (
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Đang lưu…" : "Lưu thông tin đề"}
          </Button>
        </div>
      )}
    </form>
  );
}
