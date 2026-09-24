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
import { validateImageFile } from "@/lib/validation/content";
import { resizeCommonsImage } from "@/lib/utils/text";

export type MediaItemData = {
  id: string;
  file_url: string;
  caption: string | null;
  alt_text: string | null;
  source_id: string | null;
};

type MediaManagerProps = {
  eventId: string;
  media: MediaItemData[];
  sources: Option[];
  readOnly?: boolean;
};

/** Một ảnh đã có: xem trước, sửa chữ thay thế/chú thích/nguồn, hoặc xóa. */
function MediaItem({ item, eventId, sources, readOnly }: { item: MediaItemData; eventId: string; sources: Option[]; readOnly?: boolean }) {
  const [updateState, updateAction, updating] = useActionState(updateMediaAction, initialActionState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteMediaAction, initialActionState);
  const errors = updateState.fieldErrors ?? {};
  const typed = updateState.values;

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
          <input type="hidden" name="event_id" value={eventId} />
          <FormMessage state={updateState} />
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <Field name={`alt-${item.id}`} label="Chữ thay thế (alt)" required error={errors.alt_text}>
              {(props) => <Input {...props} name="alt_text" defaultValue={typed?.alt_text ?? item.alt_text ?? ""} maxLength={300} />}
            </Field>
            <Field name={`caption-${item.id}`} label="Chú thích" error={errors.caption}>
              {(props) => <Input {...props} name="caption" defaultValue={typed?.caption ?? item.caption ?? ""} maxLength={500} />}
            </Field>
            <Field name={`source-${item.id}`} label="Nguồn của ảnh" error={errors.source_id}>
              {(props) => (
                <Select key={typed?.source_id ?? item.source_id ?? ""} {...props} name="source_id" defaultValue={typed?.source_id ?? item.source_id ?? ""}>
                  <option value="">— Không chọn —</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
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
              if (!window.confirm("Xóa ảnh này khỏi sự kiện?")) event.preventDefault();
            }}
          >
            <input type="hidden" name="media_id" value={item.id} />
            <input type="hidden" name="event_id" value={eventId} />
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

/** Thêm ảnh mới: tải tệp lên Storage (bucket `media`) hoặc dùng địa chỉ ảnh bên ngoài. */
function AddMediaForm({ eventId, sources }: { eventId: string; sources: Option[] }) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (previous: typeof initialActionState, formData: FormData) => {
      const result = await addMediaAction(previous, formData);
      if (result.status === "success") setUploadedUrl("");
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const typed = state.values;

  async function handleFile(file: File | undefined) {
    setUploadError(null);
    setUploadedUrl("");
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
      const path = `events/${eventId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) {
        setUploadError(
          /not found/i.test(error.message)
            ? "Chưa có kho lưu ảnh (bucket “media”). Hãy chạy migration media_storage trong Supabase."
            : "Không tải ảnh lên được. Kiểm tra kết nối mạng, quyền hạn và thử lại.",
        );
        return;
      }
      setUploadedUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
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
      <input type="hidden" name="event_id" value={eventId} />
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
          {uploadedUrl && (
            <>
              <input type="hidden" name="file_url" value={uploadedUrl} />
              <SafeImage
                src={uploadedUrl}
                alt="Ảnh vừa tải lên"
                className="aspect-[4/3] w-48 rounded-lg border border-border object-cover"
                fallbackClassName="aspect-[4/3] w-48 rounded-lg"
              />
              <p role="status" className="text-sm text-green-700 dark:text-green-400">Đã tải lên. Điền chữ thay thế rồi bấm “Thêm ảnh”.</p>
            </>
          )}
          {errors.file_url && !uploadedUrl && <p className="text-sm text-accent">Vui lòng chọn và tải một ảnh lên trước.</p>}
        </div>
      ) : (
        <Field name="file_url" label="Địa chỉ ảnh (URL)" required error={errors.file_url} hint="Ảnh phải có giấy phép sử dụng rõ ràng; ghi nguồn ở mục bên dưới.">
          {(props) => <Input {...props} type="url" defaultValue={typed?.file_url ?? ""} />}
        </Field>
      )}

      <Field name="alt_text" label="Chữ thay thế (mô tả ảnh cho người dùng trình đọc màn hình)" required error={errors.alt_text}>
        {(props) => <Input {...props} defaultValue={typed?.alt_text ?? ""} maxLength={300} />}
      </Field>
      <Field name="caption" label="Chú thích" error={errors.caption}>
        {(props) => <Input {...props} defaultValue={typed?.caption ?? ""} maxLength={500} />}
      </Field>
      <Field name="source_id" label="Nguồn của ảnh" error={errors.source_id} hint="Nên chọn để ghi rõ tác giả/giấy phép ảnh.">
        {(props) => (
          <Select key={typed?.source_id ?? ""} {...props} defaultValue={typed?.source_id ?? ""}>
            <option value="">— Không chọn —</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <Button type="submit" disabled={pending || uploading || (mode === "upload" && !uploadedUrl)}>
          {pending ? "Đang thêm…" : "Thêm ảnh"}
        </Button>
      </div>
    </form>
  );
}

/** Khu vực quản lý ảnh/tư liệu của một sự kiện (UC08). */
export function MediaManager({ eventId, media, sources, readOnly }: MediaManagerProps) {
  return (
    <div className="flex flex-col gap-4">
      {media.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {media.map((item) => (
            <MediaItem key={item.id} item={item} eventId={eventId} sources={sources} readOnly={readOnly} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào cho sự kiện này.</p>
      )}
      {!readOnly && <AddMediaForm eventId={eventId} sources={sources} />}
    </div>
  );
}
