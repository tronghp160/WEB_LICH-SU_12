"use client";

import { useActionState } from "react";
import { EventLinksEditor, type EventLinksValue } from "@/components/admin/forms/EventLinksEditor";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { FormFooter } from "@/components/admin/forms/FormFooter";
import { TitleSlugFields } from "@/components/admin/forms/TitleSlugFields";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { saveEventAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import { contentPaths } from "@/lib/admin/content-kinds";
import type { Option } from "@/lib/queries/admin-content";
import { datePrecisionLabels, workflowStatusLabels } from "@/lib/utils/labels";

type EventFormProps = {
  id?: string;
  initial: {
    topic_id: string;
    title: string;
    slug: string;
    start_year: number | null;
    end_year: number | null;
    start_date: string | null;
    end_date: string | null;
    date_text: string;
    date_precision: string;
    summary: string;
    content: string | null;
    is_featured: boolean;
  };
  initialLinks: EventLinksValue;
  options: { topics: Option[]; figures: Option[]; locations: Option[]; sources: Option[] };
  readOnly?: boolean;
};

/** Form sự kiện (UC07) — bảng trung tâm: mốc thời gian, nội dung và các liên kết. */
export function EventForm({ id, initial, initialLinks, options, readOnly }: EventFormProps) {
  const [state, formAction, pending] = useActionState(saveEventAction, initialActionState);
  const value = valueReader(state, initial);
  const errors = state.fieldErrors ?? {};

  // Khi form trả lỗi, giữ đúng ô "nổi bật" người dùng vừa chọn; lần đầu lấy từ dữ liệu gốc.
  const featured = state.values ? state.values.is_featured === "on" : initial.is_featured;

  return (
    <form action={formAction} noValidate className="flex max-w-3xl flex-col gap-5">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />
      <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Field name="topic_id" label="Chủ đề" required error={errors.topic_id}>
          {(props) => (
            <Select key={value("topic_id")} {...props} defaultValue={value("topic_id")}>
              <option value="">— Chọn chủ đề —</option>
              {options.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.status && topic.status !== "published"
                    ? `${topic.label} (${workflowStatusLabels[topic.status]})`
                    : topic.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <TitleSlugFields
          titleName="title"
          titleLabel="Tiêu đề sự kiện"
          initialTitle={value("title")}
          initialSlug={value("slug")}
          isNew={!id}
          titleError={errors.title}
          slugError={errors.slug}
        />

        <section aria-labelledby="moc-thoi-gian" className="flex flex-col gap-4 rounded-card border border-border p-4">
          <h2 id="moc-thoi-gian" className="font-serif text-lg font-semibold text-foreground">
            Mốc thời gian
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="date_text"
              label="Cách ghi thời gian"
              required
              error={errors.date_text}
              hint="Hiển thị trên trang, ví dụ: 13/3 – 7/5/1954."
            >
              {(props) => <Input {...props} defaultValue={value("date_text")} maxLength={200} />}
            </Field>
            <Field
              name="date_precision"
              label="Độ chính xác của mốc"
              required
              error={errors.date_precision}
              hint="Mốc gần đúng hoặc còn tranh luận sẽ được gắn nhãn cho người đọc."
            >
              {(props) => (
                <Select key={value("date_precision")} {...props} defaultValue={value("date_precision")}>
                  <option value="">— Chọn độ chính xác —</option>
                  {Object.entries(datePrecisionLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="start_year" label="Năm bắt đầu" required error={errors.start_year} hint="Dùng để sắp xếp trên dòng thời gian.">
              {(props) => <Input {...props} inputMode="numeric" defaultValue={value("start_year")} />}
            </Field>
            <Field name="end_year" label="Năm kết thúc" error={errors.end_year} hint="Để trống nếu sự kiện diễn ra trong một năm.">
              {(props) => <Input {...props} inputMode="numeric" defaultValue={value("end_year")} />}
            </Field>
            <Field name="start_date" label="Ngày bắt đầu" error={errors.start_date} hint="Tùy chọn; năm phải trùng năm bắt đầu.">
              {(props) => <Input {...props} type="date" defaultValue={value("start_date")} />}
            </Field>
            <Field name="end_date" label="Ngày kết thúc" error={errors.end_date} hint="Tùy chọn; không được trước ngày bắt đầu.">
              {(props) => <Input {...props} type="date" defaultValue={value("end_date")} />}
            </Field>
          </div>
        </section>

        <Field name="summary" label="Tóm tắt" required error={errors.summary} hint="1–3 câu, hiển thị ở danh sách và thẻ sự kiện.">
          {(props) => <Textarea {...props} defaultValue={value("summary")} rows={3} />}
        </Field>
        <Field
          name="content"
          label="Nội dung chi tiết"
          error={errors.content}
          hint="Khung chuẩn: ## Bối cảnh · ## Diễn biến · ## Kết quả · ## Ý nghĩa · ## Câu chuyện nhỏ · ## Em có biết? · ## Di tích ngày nay. Một dòng trống tách đoạn; “- ” gạch đầu dòng; “> ” trích dẫn (dòng “> — Nguồn” ghi nguồn); **chữ đậm**."
        >
          {(props) => <Textarea {...props} defaultValue={value("content")} rows={18} />}
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={featured}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Đánh dấu là sự kiện nổi bật (hiện ở trang chủ)
        </label>

        <EventLinksEditor options={options} initial={initialLinks} disabled={readOnly} />
      </fieldset>
      <FormFooter pending={pending} cancelHref={contentPaths.list("su-kien")} readOnly={readOnly} />
    </form>
  );
}
