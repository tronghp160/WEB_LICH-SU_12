"use client";

import { useVersionedAction } from "@/components/admin/forms/useVersionedAction";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { savePassageAction } from "@/lib/actions/exam-bank";
import { sgkLessons } from "@/lib/sgk/curriculum";

type Props = {
  initial?: { id: string; title: string; body: string; source_citation: string; lesson_slug: string | null };
  readOnly?: boolean;
};

/** Đoạn tư liệu dùng chung cho nhiều câu (trích văn kiện, tài liệu) — bắt buộc ghi nguồn đầy đủ. */
export function PassageForm({ initial, readOnly = false }: Props) {
  const [state, formAction, pending] = useVersionedAction(savePassageAction);
  const typed = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessage state={state} />
      <fieldset key={state.version} disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field name="title" label="Tên ngắn (chỉ hiện ở trang quản trị)" required error={errors.title}>
          {(props) => <Input {...props} defaultValue={typed?.title ?? initial?.title ?? ""} maxLength={160} />}
        </Field>
        <Field name="body" label="Đoạn tư liệu" required error={errors.body} hint="30–2000 ký tự, giữ nguyên xuống dòng. Vừa đọc trong 1–2 phút.">
          {(props) => <Textarea {...props} rows={8} defaultValue={typed?.body ?? initial?.body ?? ""} maxLength={2000} />}
        </Field>
        <Field name="source_citation" label="Trích dẫn nguồn" required error={errors.source_citation} hint="Tên văn kiện / sách, nơi xuất bản, năm, trang.">
          {(props) => <Input {...props} defaultValue={typed?.source_citation ?? initial?.source_citation ?? ""} maxLength={500} />}
        </Field>
        <Field name="lesson_slug" label="Bài SGK" error={errors.lesson_slug}>
          {(props) => (
            <Select {...props} defaultValue={typed?.lesson_slug ?? initial?.lesson_slug ?? ""}>
              <option value="">— Không gắn —</option>
              {sgkLessons.map((lesson) => (
                <option key={lesson.slug} value={lesson.slug}>
                  Bài {lesson.number}. {lesson.shortTitle}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </fieldset>
      {!readOnly && (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu…" : initial ? "Lưu tư liệu" : "Tạo tư liệu"}
          </Button>
        </div>
      )}
    </form>
  );
}
