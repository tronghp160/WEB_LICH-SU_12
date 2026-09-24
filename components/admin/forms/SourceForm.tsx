"use client";

import { useActionState } from "react";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { FormFooter } from "@/components/admin/forms/FormFooter";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { saveSourceAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import { contentPaths } from "@/lib/admin/content-kinds";
import { sourceTypeLabels } from "@/lib/utils/labels";

type SourceFormProps = {
  id?: string;
  initial: {
    title: string;
    author_org: string | null;
    publisher: string | null;
    published_year: number | null;
    url: string | null;
    source_type: string;
    citation: string;
    accessed_at: string | null;
  };
};

/** Form nguồn tham khảo (UC08). Nguồn trang web bắt buộc có ngày truy cập. */
export function SourceForm({ id, initial }: SourceFormProps) {
  const [state, formAction, pending] = useActionState(saveSourceAction, initialActionState);
  const value = valueReader(state, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex max-w-3xl flex-col gap-5">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />
      <Field name="title" label="Tên nguồn" required error={errors.title}>
        {(props) => <Input {...props} defaultValue={value("title")} maxLength={300} />}
      </Field>
      <Field name="source_type" label="Loại nguồn" required error={errors.source_type}>
        {(props) => (
          <Select {...props} defaultValue={value("source_type")}>
            <option value="">— Chọn loại nguồn —</option>
            {Object.entries(sourceTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        name="citation"
        label="Trích dẫn"
        required
        error={errors.citation}
        hint="Thông tin đủ để người khác tìm lại nguồn: tác giả, tên tài liệu, nhà xuất bản, năm, trang…"
      >
        {(props) => <Textarea {...props} defaultValue={value("citation")} rows={3} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="author_org" label="Tác giả / tổ chức" error={errors.author_org}>
          {(props) => <Input {...props} defaultValue={value("author_org")} />}
        </Field>
        <Field name="publisher" label="Nhà xuất bản" error={errors.publisher}>
          {(props) => <Input {...props} defaultValue={value("publisher")} />}
        </Field>
        <Field name="published_year" label="Năm xuất bản" error={errors.published_year}>
          {(props) => <Input {...props} inputMode="numeric" defaultValue={value("published_year")} />}
        </Field>
        <Field
          name="accessed_at"
          label="Ngày truy cập"
          error={errors.accessed_at}
          hint="Bắt buộc với nguồn trang web."
        >
          {(props) => <Input {...props} type="date" defaultValue={value("accessed_at")} />}
        </Field>
      </div>
      <Field name="url" label="Đường dẫn (URL)" error={errors.url} hint="Bắt đầu bằng http:// hoặc https://.">
        {(props) => <Input {...props} type="url" defaultValue={value("url")} />}
      </Field>
      <FormFooter pending={pending} cancelHref={contentPaths.list("nguon")} />
    </form>
  );
}
