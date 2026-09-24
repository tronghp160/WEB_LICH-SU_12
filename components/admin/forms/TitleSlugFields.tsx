"use client";

import { useState } from "react";
import { Field } from "@/components/admin/forms/Field";
import { Input } from "@/components/ui/Input";
import { slugify } from "@/lib/utils/slugify";

type TitleSlugFieldsProps = {
  /** Tên trường của tiêu đề trong form: "name" hoặc "title". */
  titleName: "name" | "title";
  titleLabel: string;
  initialTitle: string;
  initialSlug: string;
  /** Tạo mới: slug tự sinh theo tiêu đề cho tới khi người dùng tự sửa slug. Sửa bản ghi cũ: giữ nguyên slug. */
  isNew: boolean;
  titleError?: string;
  slugError?: string;
};

/**
 * Cặp "tiêu đề + đường dẫn (slug)". Khi tạo mới, slug tự sinh từ tiêu đề (bỏ dấu tiếng Việt)
 * và vẫn sửa tay được; khi đã sửa tay thì không tự ghi đè nữa. Khi SỬA bản ghi cũ thì không tự đổi
 * slug để không làm hỏng các liên kết đã chia sẻ.
 */
export function TitleSlugFields({
  titleName,
  titleLabel,
  initialTitle,
  initialSlug,
  isNew,
  titleError,
  slugError,
}: TitleSlugFieldsProps) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(!isNew || initialSlug !== "");

  return (
    <>
      <Field name={titleName} label={titleLabel} required error={titleError}>
        {(props) => (
          <Input
            {...props}
            value={title}
            maxLength={300}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugEdited) setSlug(slugify(event.target.value));
            }}
          />
        )}
      </Field>
      <Field
        name="slug"
        label="Đường dẫn (slug)"
        required
        error={slugError}
        hint="Dùng trong địa chỉ trang, chỉ gồm chữ thường không dấu, số và dấu gạch ngang."
      >
        {(props) => (
          <Input
            {...props}
            value={slug}
            maxLength={120}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
          />
        )}
      </Field>
    </>
  );
}
