"use client";

import { useActionState } from "react";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { FormFooter } from "@/components/admin/forms/FormFooter";
import { TitleSlugFields } from "@/components/admin/forms/TitleSlugFields";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveTopicAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import { contentPaths } from "@/lib/admin/content-kinds";

type TopicFormProps = {
  /** Có id = sửa; không có = tạo mới. */
  id?: string;
  initial: { name: string; slug: string; description: string | null; sort_order: number };
  readOnly?: boolean;
};

/** Form chủ đề (UC07): tên, slug, mô tả, thứ tự. */
export function TopicForm({ id, initial, readOnly }: TopicFormProps) {
  const [state, formAction, pending] = useActionState(saveTopicAction, initialActionState);
  const value = valueReader(state, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex max-w-3xl flex-col gap-5">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />
      <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <TitleSlugFields
          titleName="name"
          titleLabel="Tên chủ đề"
          initialTitle={value("name")}
          initialSlug={value("slug")}
          isNew={!id}
          titleError={errors.name}
          slugError={errors.slug}
        />
        <Field name="description" label="Mô tả" error={errors.description}>
          {(props) => <Textarea {...props} defaultValue={value("description")} rows={4} />}
        </Field>
        <Field
          name="sort_order"
          label="Thứ tự hiển thị"
          error={errors.sort_order}
          hint="Số nhỏ hiển thị trước. Để trống = 0."
          className="max-w-40"
        >
          {(props) => <Input {...props} inputMode="numeric" defaultValue={value("sort_order")} />}
        </Field>
      </fieldset>
      <FormFooter pending={pending} cancelHref={contentPaths.list("chu-de")} readOnly={readOnly} />
    </form>
  );
}
