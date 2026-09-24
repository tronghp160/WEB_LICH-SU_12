"use client";

import { useActionState } from "react";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { FormFooter } from "@/components/admin/forms/FormFooter";
import { TitleSlugFields } from "@/components/admin/forms/TitleSlugFields";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveFigureAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import { contentPaths } from "@/lib/admin/content-kinds";

type FigureFormProps = {
  id?: string;
  initial: {
    name: string;
    slug: string;
    other_names: string | null;
    birth_year: number | null;
    death_year: number | null;
    biography: string | null;
    portrait_url: string | null;
  };
  readOnly?: boolean;
};

/** Form nhân vật (UC07). */
export function FigureForm({ id, initial, readOnly }: FigureFormProps) {
  const [state, formAction, pending] = useActionState(saveFigureAction, initialActionState);
  const value = valueReader(state, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex max-w-3xl flex-col gap-5">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />
      <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <TitleSlugFields
          titleName="name"
          titleLabel="Tên nhân vật"
          initialTitle={value("name")}
          initialSlug={value("slug")}
          isNew={!id}
          titleError={errors.name}
          slugError={errors.slug}
        />
        <Field name="other_names" label="Tên khác" error={errors.other_names} hint="Bí danh, tên gọi thời trẻ… ngăn cách bằng dấu phẩy.">
          {(props) => <Input {...props} defaultValue={value("other_names")} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="birth_year" label="Năm sinh" error={errors.birth_year}>
            {(props) => <Input {...props} inputMode="numeric" defaultValue={value("birth_year")} />}
          </Field>
          <Field name="death_year" label="Năm mất" error={errors.death_year}>
            {(props) => <Input {...props} inputMode="numeric" defaultValue={value("death_year")} />}
          </Field>
        </div>
        <Field
          name="portrait_url"
          label="Địa chỉ ảnh chân dung"
          error={errors.portrait_url}
          hint="Địa chỉ http(s) của ảnh có giấy phép sử dụng rõ ràng (ví dụ Wikimedia Commons)."
        >
          {(props) => <Input {...props} type="url" defaultValue={value("portrait_url")} />}
        </Field>
        <Field name="biography" label="Tiểu sử" error={errors.biography} hint="Cách nhau một dòng trống để tách đoạn.">
          {(props) => <Textarea {...props} defaultValue={value("biography")} rows={8} />}
        </Field>
      </fieldset>
      <FormFooter pending={pending} cancelHref={contentPaths.list("nhan-vat")} readOnly={readOnly} />
    </form>
  );
}
