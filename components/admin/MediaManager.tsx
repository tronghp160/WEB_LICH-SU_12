"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { Select } from "@/components/ui/Select";
import { addMediaAction, deleteMediaAction, updateMediaAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import type { Option } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/client";
import { mediaEraLabels } from "@/lib/utils/labels";
import { MEDIA_ERAS, validateImageFile, type MediaOwnerKind } from "@/lib/validation/content";
import { resizeCommonsImage } from "@/lib/utils/text";

export type MediaItemData = {
  id: string;
  file_url: string;
  caption: string | null;
  alt_text: string | null;
  source_id: string | null;
  era: string;
  year_taken: number | null;
  photographer: string | null;
  license: string | null;
  license_url: string | null;
  source_page_url: string | null;
  is_reenactment: boolean;
  is_colorized: boolean;
  is_cover: boolean;
  focal_point: string | null;
};

export type MediaOwner = { kind: MediaOwnerKind; id: string };

type MediaManagerProps = {
  owner: MediaOwner;
  media: MediaItemData[];
  sources: Option[];
  readOnly?: boolean;
};

/** Thư mục trong bucket `media` theo loại nội dung. */
const STORAGE_FOLDERS: Record<MediaOwnerKind, string> = {
  "su-kien": "events",
  "nhan-vat": "figures",
  "dia-diem": "locations",
};

const OWNER_NOUN: Record<MediaOwnerKind, string> = {
  "su-kien": "sự kiện",
  "nhan-vat": "nhân vật",
  "dia-diem": "địa điểm",
};

function OwnerFields({ owner }: { owner: MediaOwner }) {
  return (
    <>
      <input type="hidden" name="owner_kind" value={owner.kind} />
      <input type="hidden" name="owner_id" value={owner.id} />
    </>
  );
}

type MetaValues = Partial<Record<keyof MediaItemData, string | number | boolean | null>>;

/** Các ô mô tả, ghi công và nhãn trung thực — dùng chung cho thêm ảnh và sửa ảnh. */
function MediaMetaFields({
  prefix,
  initial,
  typed,
  errors,
  sources,
}: {
  prefix: string;
  initial: MetaValues;
  typed?: Record<string, string>;
  errors: Record<string, string | undefined>;
  sources: Option[];
}) {
  const text = (key: keyof MediaItemData) => typed?.[key] ?? (initial[key] == null ? "" : String(initial[key]));
  const checked = (key: keyof MediaItemData) => (typed ? typed[key] === "on" : initial[key] === true);

  return (
    <>
      <Field name={`${prefix}-alt`} label="Chữ thay thế (mô tả ảnh cho người dùng trình đọc màn hình)" required error={errors.alt_text}>
        {(props) => <Input {...props} name="alt_text" defaultValue={text("alt_text")} maxLength={300} />}
      </Field>
      <Field name={`${prefix}-caption`} label="Chú thích" error={errors.caption}>
        {(props) => <Input {...props} name="caption" defaultValue={text("caption")} maxLength={500} />}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name={`${prefix}-era`} label="Loại ảnh" required error={errors.era}>
          {(props) => (
            <Select key={text("era")} {...props} name="era" defaultValue={text("era") || "historical"}>
              {MEDIA_ERAS.map((era) => (
                <option key={era} value={era}>
                  {mediaEraLabels[era]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field name={`${prefix}-year`} label="Năm chụp / vẽ" error={errors.year_taken} hint="Bỏ trống nếu không rõ.">
          {(props) => <Input {...props} name="year_taken" inputMode="numeric" defaultValue={text("year_taken")} />}
        </Field>
        <Field name={`${prefix}-photographer`} label="Tác giả" error={errors.photographer}>
          {(props) => <Input {...props} name="photographer" defaultValue={text("photographer")} maxLength={200} />}
        </Field>
        <Field
          name={`${prefix}-license`}
          label="Giấy phép"
          required
          error={errors.license}
          hint="Ví dụ: CC BY-SA 4.0 · Phạm vi công cộng · Được phép của Bảo tàng …"
        >
          {(props) => <Input {...props} name="license" defaultValue={text("license")} maxLength={200} />}
        </Field>
        <Field name={`${prefix}-license-url`} label="Đường dẫn giấy phép" error={errors.license_url}>
          {(props) => <Input {...props} name="license_url" type="url" defaultValue={text("license_url")} />}
        </Field>
        <Field name={`${prefix}-source-page`} label="Trang gốc của ảnh" error={errors.source_page_url} hint="Để người xem tự kiểm tra giấy phép.">
          {(props) => <Input {...props} name="source_page_url" type="url" defaultValue={text("source_page_url")} />}
        </Field>
        <Field name={`${prefix}-focal`} label="Điểm lấy nét khi cắt ảnh" error={errors.focal_point} hint="Dạng “50% 30%” (ngang, dọc). Bỏ trống = giữa ảnh.">
          {(props) => <Input {...props} name="focal_point" defaultValue={text("focal_point")} maxLength={9} />}
        </Field>
        <Field name={`${prefix}-source`} label="Nguồn tham khảo của ảnh" error={errors.source_id}>
          {(props) => (
            <Select key={text("source_id")} {...props} name="source_id" defaultValue={text("source_id")}>
              <option value="">— Không chọn —</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <fieldset className="m-0 flex flex-wrap gap-x-5 gap-y-2 border-0 p-0">
        <legend className="mb-1 text-sm font-medium text-foreground">Nhãn trung thực và hiển thị</legend>
        {(
          [
            ["is_cover", "Ảnh bìa (hiện đầu trang và trên thẻ)"],
            ["is_reenactment", "Cảnh dựng lại"],
            ["is_colorized", "Ảnh tô màu"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name={key} defaultChecked={checked(key)} className="h-4 w-4 accent-[var(--accent)]" />
            {label}
          </label>
        ))}
      </fieldset>
    </>
  );
}

/** Một ảnh đã có: xem trước, sửa thông tin và ghi công, hoặc xóa. */
function MediaItem({ item, owner, sources, readOnly }: { item: MediaItemData; owner: MediaOwner; sources: Option[]; readOnly?: boolean }) {
  const [updateState, updateAction, updating] = useActionState(updateMediaAction, initialActionState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteMediaAction, initialActionState);

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row">
      <SafeImage
        src={resizeCommonsImage(item.file_url, 400)}
        alt={item.alt_text ?? item.caption ?? "Ảnh minh họa"}
        className="aspect-[4/3] w-full rounded-lg bg-muted object-cover sm:w-44 sm:shrink-0"
        fallbackClassName="aspect-[4/3] w-full rounded-lg sm:w-44 sm:shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <form action={updateAction} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="media_id" value={item.id} />
          <OwnerFields owner={owner} />
          <FormMessage state={updateState} />
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <MediaMetaFields
              prefix={item.id}
              initial={item}
              typed={updateState.values}
              errors={updateState.fieldErrors ?? {}}
              sources={sources}
            />
          </fieldset>
          {!readOnly && (
            <div>
              <Button type="submit" size="sm" variant="secondary" disabled={updating}>
                {updating ? "Đang lưu…" : "Lưu thông tin ảnh"}
              </Button>
            </div>
          )}
        </form>

        {!readOnly && (
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm(`Xóa ảnh này khỏi ${OWNER_NOUN[owner.kind]}?`)) event.preventDefault();
            }}
          >
            <input type="hidden" name="media_id" value={item.id} />
            <OwnerFields owner={owner} />
            <FormMessage state={deleteState} />
            <Button type="submit" size="sm" variant="ghost" disabled={deleting} className="text-accent">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {deleting ? "Đang xóa…" : "Xóa ảnh"}
            </Button>
          </form>
        )}
      </div>
    </li>
  );
}

/** Đọc kích thước thật của ảnh ở trình duyệt (để trang công khai giữ đúng tỉ lệ, không nhảy bố cục). */
async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/** Thêm ảnh mới: tải tệp lên Storage (bucket `media`) hoặc dùng địa chỉ ảnh bên ngoài. */
function AddMediaForm({ owner, sources, hasCover }: { owner: MediaOwner; sources: Option[]; hasCover: boolean }) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploaded, setUploaded] = useState<{ url: string; width?: number; height?: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (previous: typeof initialActionState, formData: FormData) => {
      const result = await addMediaAction(previous, formData);
      if (result.status === "success") setUploaded(null);
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  async function handleFile(file: File | undefined) {
    setUploadError(null);
    setUploaded(null);
    if (!file) return;

    // Kiểm tra sớm ở trình duyệt; bucket Storage vẫn tự chặn loại tệp/kích thước ở server.
    const problem = validateImageFile(file);
    if (problem) {
      setUploadError(problem);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${STORAGE_FOLDERS[owner.kind]}/${owner.id}/${crypto.randomUUID()}.${extension}`;
      const [size, { error }] = await Promise.all([
        readImageSize(file),
        supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" }),
      ]);
      if (error) {
        setUploadError(
          /not found/i.test(error.message)
            ? "Chưa có kho lưu ảnh (bucket “media”). Hãy chạy migration media_storage trong Supabase."
            : "Không tải ảnh lên được. Kiểm tra kết nối mạng, quyền hạn và thử lại.",
        );
        return;
      }
      setUploaded({ url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl, ...size });
    } catch {
      setUploadError("Không tải ảnh lên được. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4 rounded-card border border-dashed border-border p-4">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <ImagePlus className="h-5 w-5 text-gold-deep" aria-hidden="true" />
        Thêm ảnh
      </h3>
      <OwnerFields owner={owner} />
      <FormMessage state={state} />

      <div role="group" aria-label="Cách thêm ảnh" className="flex gap-2">
        {(["upload", "url"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={
              "min-h-9 rounded-full border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold " +
              (mode === option ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-surface-foreground hover:bg-muted")
            }
          >
            {option === "upload" ? "Tải ảnh lên" : "Dùng địa chỉ ảnh (URL)"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="media-file" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Chọn ảnh (JPG, PNG hoặc WebP, tối đa 5 MB)
          </label>
          <input
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            className="text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          {uploading && <p role="status" className="text-sm text-muted-foreground">Đang tải ảnh lên…</p>}
          {uploadError && <p role="alert" className="text-sm text-accent">{uploadError}</p>}
          {uploaded && (
            <>
              <input type="hidden" name="file_url" value={uploaded.url} />
              {uploaded.width && <input type="hidden" name="width" value={uploaded.width} />}
              {uploaded.height && <input type="hidden" name="height" value={uploaded.height} />}
              <SafeImage
                src={uploaded.url}
                alt="Ảnh vừa tải lên"
                className="aspect-[4/3] w-48 rounded-lg border border-border object-cover"
                fallbackClassName="aspect-[4/3] w-48 rounded-lg"
              />
              <p role="status" className="text-sm text-green-700 dark:text-green-400">
                Đã tải lên. Điền mô tả, giấy phép rồi bấm “Thêm ảnh”.
              </p>
            </>
          )}
          {errors.file_url && !uploaded && <p className="text-sm text-accent">Vui lòng chọn và tải một ảnh lên trước.</p>}
        </div>
      ) : (
        <Field name="file_url" label="Địa chỉ ảnh (URL)" required error={errors.file_url} hint="Nên tải ảnh lên thay vì dùng ảnh ở máy chủ khác (nhanh và ổn định hơn).">
          {(props) => <Input {...props} type="url" defaultValue={state.values?.file_url ?? ""} />}
        </Field>
      )}

      <MediaMetaFields
        prefix="new"
        // Nội dung chưa có ảnh bìa thì ảnh đầu tiên mặc định là ảnh bìa.
        initial={{ era: "historical", is_cover: !hasCover }}
        typed={state.values}
        errors={errors}
        sources={sources}
      />

      <div>
        <Button type="submit" disabled={pending || uploading || (mode === "upload" && !uploaded)}>
          {pending ? "Đang thêm…" : "Thêm ảnh"}
        </Button>
      </div>
    </form>
  );
}

/** Khu vực quản lý ảnh/tư liệu của một sự kiện, nhân vật hoặc địa điểm (UC08). */
export function MediaManager({ owner, media, sources, readOnly }: MediaManagerProps) {
  return (
    <div className="flex flex-col gap-4">
      {media.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {media.map((item) => (
            <MediaItem key={item.id} item={item} owner={owner} sources={sources} readOnly={readOnly} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào cho {OWNER_NOUN[owner.kind]} này.</p>
      )}
      {!readOnly && <AddMediaForm owner={owner} sources={sources} hasCover={media.some((item) => item.is_cover)} />}
    </div>
  );
}
