// Schema Zod cho form nội dung (UC07–UC09). Validate ở CẢ client (hiển thị sớm) và server
// (bắt buộc — không tin client). Các quy tắc chéo phản chiếu đúng ràng buộc CHECK trong DB
// để người dùng thấy lỗi tiếng Việt rõ ràng thay vì lỗi Postgres. Thông báo: tiếng Việt.

import { z } from "zod";

// ---------- Bộ dựng trường dùng chung ----------

/** "" / khoảng trắng / null / undefined → null (FormData trả "" cho ô trống, null cho trường vắng). */
function blankToNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

const requiredMessage = (label: string) => `Vui lòng nhập ${label}.`;

/** Chuỗi bắt buộc. */
export function requiredText(label: string, max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string({ error: requiredMessage(label) })
      .min(1, requiredMessage(label))
      .max(max, `${capitalize(label)} quá dài (tối đa ${max} ký tự).`),
  );
}

/** Chuỗi tùy chọn (rỗng → null). */
export function optionalText(label: string, max: number) {
  return z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      return typeof blank === "string" ? blank.trim() : blank;
    },
    z
      .string({ error: `${capitalize(label)} không hợp lệ.` })
      .max(max, `${capitalize(label)} quá dài (tối đa ${max} ký tự).`)
      .nullable(),
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Số nguyên tùy chọn (rỗng → null), chỉ nhận chuỗi số nguyên thuần (không "1e3", "12.5"). */
export function optionalInt(label: string, min: number, max: number) {
  return z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      if (typeof blank === "string") return /^-?\d+$/.test(blank.trim()) ? Number(blank.trim()) : blank;
      return blank;
    },
    z
      .number({ error: `${capitalize(label)} phải là một số nguyên.` })
      .int(`${capitalize(label)} phải là một số nguyên.`)
      .min(min, `${capitalize(label)} không được nhỏ hơn ${min}.`)
      .max(max, `${capitalize(label)} không được lớn hơn ${max}.`)
      .nullable(),
  );
}

/** Số nguyên bắt buộc. */
export function requiredInt(label: string, min: number, max: number) {
  return optionalInt(label, min, max).refine((value): value is number => value !== null, {
    message: requiredMessage(label),
  });
}

/** Số thực tùy chọn, chấp nhận dấu phẩy thập phân ("21,0285"); làm tròn 6 chữ số như numeric(9,6). */
function optionalDecimal(label: string, min: number, max: number) {
  return z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      if (typeof blank !== "string") return blank;
      const text = blank.trim().replace(",", ".");
      return /^-?\d+(\.\d+)?$/.test(text) ? Math.round(Number(text) * 1e6) / 1e6 : blank;
    },
    z
      .number({ error: `${capitalize(label)} phải là một số, ví dụ 21.0285.` })
      .min(min, `${capitalize(label)} phải nằm trong khoảng ${min} đến ${max}.`)
      .max(max, `${capitalize(label)} phải nằm trong khoảng ${min} đến ${max}.`)
      .nullable(),
  );
}

/** Ngày dạng YYYY-MM-DD (đúng lịch: không nhận 2024-02-31), rỗng → null. */
function optionalDate(label: string) {
  return z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      return typeof blank === "string" ? blank.trim() : blank;
    },
    z
      .string({ error: `${capitalize(label)} không hợp lệ.` })
      .refine(isRealDate, `${capitalize(label)} không hợp lệ (định dạng năm-tháng-ngày).`)
      .nullable(),
  );
}

export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** URL tùy chọn: CHỈ http/https (chặn `javascript:` và các scheme nguy hiểm khác). */
export function optionalHttpUrl(label: string, max = 2000) {
  return z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      return typeof blank === "string" ? blank.trim() : blank;
    },
    z
      .string({ error: `${capitalize(label)} không hợp lệ.` })
      .max(max, `${capitalize(label)} quá dài.`)
      .refine(isHttpUrl, `${capitalize(label)} phải là địa chỉ bắt đầu bằng http:// hoặc https://.`)
      .nullable(),
  );
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string({ error: requiredMessage("đường dẫn (slug)") })
    .min(1, requiredMessage("đường dẫn (slug)"))
    .max(120, "Đường dẫn quá dài (tối đa 120 ký tự).")
    .regex(
      SLUG_PATTERN,
      "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang (ví dụ: chien-dich-dien-bien-phu).",
    ),
);

const uuidField = (label: string) =>
  z.string({ error: `Vui lòng chọn ${label}.` }).uuid(`Vui lòng chọn ${label}.`);

/** Checkbox HTML: có gửi lên ("on") = true, vắng mặt = false. */
const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

// ---------- Enum khớp CHECK trong DB ----------

export const DATE_PRECISIONS = ["exact", "year", "period", "approximate", "disputed"] as const;
export const ACCURACY_LEVELS = ["exact", "approximate", "region", "unknown"] as const;
export const SOURCE_TYPES = ["book", "article", "official", "web", "archive", "other"] as const;

// ---------- Chủ đề ----------

export const topicSchema = z.object({
  name: requiredText("tên chủ đề", 200),
  slug: slugField,
  description: optionalText("mô tả", 2000),
  sort_order: optionalInt("thứ tự", 0, 9999).transform((value) => value ?? 0),
});
export type TopicInput = z.infer<typeof topicSchema>;

// ---------- Nhân vật ----------

export const figureSchema = z
  .object({
    name: requiredText("tên nhân vật", 200),
    slug: slugField,
    other_names: optionalText("tên khác", 500),
    birth_year: optionalInt("năm sinh", 1, 2200),
    death_year: optionalInt("năm mất", 1, 2200),
    biography: optionalText("tiểu sử", 20000),
    portrait_url: optionalHttpUrl("địa chỉ ảnh chân dung"),
  })
  .superRefine((value, context) => {
    if (value.birth_year !== null && value.death_year !== null && value.death_year < value.birth_year) {
      context.addIssue({ code: "custom", path: ["death_year"], message: "Năm mất không được nhỏ hơn năm sinh." });
    }
  });
export type FigureInput = z.infer<typeof figureSchema>;

// ---------- Địa điểm ----------

export const locationSchema = z
  .object({
    name: requiredText("tên địa điểm", 200),
    historical_name: optionalText("tên lịch sử", 200),
    slug: slugField,
    description: optionalText("mô tả", 5000),
    latitude: optionalDecimal("vĩ độ", -90, 90),
    longitude: optionalDecimal("kinh độ", -180, 180),
    accuracy_level: z.enum(ACCURACY_LEVELS, { error: "Vui lòng chọn độ chính xác của tọa độ." }),
    accuracy_note: optionalText("ghi chú độ chính xác", 1000),
  })
  .superRefine((value, context) => {
    // Khớp CHECK ((latitude is null) = (longitude is null)).
    if (value.latitude !== null && value.longitude === null) {
      context.addIssue({ code: "custom", path: ["longitude"], message: "Nhập cả kinh độ khi đã có vĩ độ (hoặc bỏ trống cả hai)." });
    }
    if (value.longitude !== null && value.latitude === null) {
      context.addIssue({ code: "custom", path: ["latitude"], message: "Nhập cả vĩ độ khi đã có kinh độ (hoặc bỏ trống cả hai)." });
    }
  });
export type LocationInput = z.infer<typeof locationSchema>;

// ---------- Sự kiện ----------

export const eventSchema = z
  .object({
    topic_id: uuidField("chủ đề"),
    title: requiredText("tiêu đề sự kiện", 300),
    slug: slugField,
    start_year: requiredInt("năm bắt đầu", 1, 2200),
    end_year: optionalInt("năm kết thúc", 1, 2200),
    start_date: optionalDate("ngày bắt đầu"),
    end_date: optionalDate("ngày kết thúc"),
    date_text: requiredText("cách ghi thời gian", 200),
    date_precision: z.enum(DATE_PRECISIONS, { error: "Vui lòng chọn độ chính xác của mốc thời gian." }),
    summary: requiredText("tóm tắt", 1500),
    content: optionalText("nội dung", 50000),
    is_featured: checkbox,
  })
  .superRefine((value, context) => {
    const add = (path: string, message: string) => context.addIssue({ code: "custom", path: [path], message });
    const yearOf = (date: string) => Number(date.slice(0, 4));

    // Phản chiếu 4 ràng buộc CHECK của historical_events.
    if (value.start_year !== null && value.end_year !== null && value.end_year < value.start_year) {
      add("end_year", "Năm kết thúc không được nhỏ hơn năm bắt đầu.");
    }
    if (value.start_date && value.end_date && value.end_date < value.start_date) {
      add("end_date", "Ngày kết thúc không được trước ngày bắt đầu.");
    }
    if (value.start_date && value.start_year !== null && yearOf(value.start_date) !== value.start_year) {
      add("start_date", "Năm của ngày bắt đầu phải trùng với năm bắt đầu.");
    }
    if (value.end_date && value.end_year !== null && yearOf(value.end_date) !== value.end_year) {
      add("end_date", "Năm của ngày kết thúc phải trùng với năm kết thúc.");
    }
  });
export type EventInput = z.infer<typeof eventSchema>;

// ---------- Liên kết của sự kiện (gửi lên dưới dạng JSON) ----------

const linkNote = (label: string) => optionalText(label, 500);

export const eventLinksSchema = z
  .object({
    figures: z.array(z.object({ figure_id: uuidField("nhân vật"), relationship: linkNote("quan hệ") })).max(50),
    locations: z
      .array(
        z.object({
          location_id: uuidField("địa điểm"),
          location_role: linkNote("vai trò địa điểm"),
          is_primary: z.boolean(),
        }),
      )
      .max(50),
    sources: z
      .array(
        z.object({
          source_id: uuidField("nguồn"),
          source_note: linkNote("ghi chú nguồn"),
          confidence_note: linkNote("ghi chú độ tin cậy"),
        }),
      )
      .max(50),
  })
  .superRefine((value, context) => {
    const duplicate = <T,>(items: T[], key: (item: T) => string) => new Set(items.map(key)).size !== items.length;
    if (duplicate(value.figures, (item) => item.figure_id)) {
      context.addIssue({ code: "custom", path: ["figures"], message: "Một nhân vật chỉ được gắn một lần." });
    }
    if (duplicate(value.locations, (item) => item.location_id)) {
      context.addIssue({ code: "custom", path: ["locations"], message: "Một địa điểm chỉ được gắn một lần." });
    }
    if (duplicate(value.sources, (item) => item.source_id)) {
      context.addIssue({ code: "custom", path: ["sources"], message: "Một nguồn chỉ được gắn một lần." });
    }
    if (value.locations.filter((item) => item.is_primary).length > 1) {
      context.addIssue({ code: "custom", path: ["locations"], message: "Mỗi sự kiện chỉ có tối đa một địa điểm chính." });
    }
  });
export type EventLinksInput = z.infer<typeof eventLinksSchema>;

// ---------- Nguồn tham khảo (UC08) ----------

export const sourceSchema = z
  .object({
    title: requiredText("tên nguồn", 300),
    author_org: optionalText("tác giả / tổ chức", 300),
    publisher: optionalText("nhà xuất bản", 300),
    published_year: optionalInt("năm xuất bản", 1, 2200),
    url: optionalHttpUrl("đường dẫn nguồn"),
    source_type: z.enum(SOURCE_TYPES, { error: "Vui lòng chọn loại nguồn." }),
    citation: requiredText("trích dẫn", 2000),
    accessed_at: optionalDate("ngày truy cập"),
  })
  .superRefine((value, context) => {
    // Nguồn trang web phải có ngày truy cập (Phase 10, mục 3).
    if (value.source_type === "web" && value.accessed_at === null) {
      context.addIssue({ code: "custom", path: ["accessed_at"], message: "Nguồn trang web phải có ngày truy cập." });
    }
  });
export type SourceInput = z.infer<typeof sourceSchema>;

// ---------- Media (UC08) ----------

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Loại nội dung sở hữu ảnh (khớp ràng buộc media_owner_one: đúng một trong event_id/figure_id/location_id). */
export const MEDIA_OWNER_KINDS = ["su-kien", "nhan-vat", "dia-diem"] as const;
export type MediaOwnerKind = (typeof MEDIA_OWNER_KINDS)[number];

/** Ảnh tư liệu năm đó / ảnh chụp ngày nay / tranh, ảnh minh họa (khớp CHECK media_assets.era). */
export const MEDIA_ERAS = ["historical", "today", "illustration"] as const;

/** Điểm lấy nét khi cắt ảnh, dạng "50% 30%" (ngang dọc). */
const FOCAL_POINT_PATTERN = /^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$/;

/** Thông tin ghi công và trình bày của một ảnh — dùng chung cho thêm mới và sửa. */
const mediaMetaShape = {
  owner_kind: z.enum(MEDIA_OWNER_KINDS, { error: "Loại nội dung của ảnh không hợp lệ." }),
  owner_id: uuidField("nội dung gắn ảnh"),
  // Bắt buộc nhập chữ thay thế để trình đọc màn hình mô tả được ảnh (yêu cầu a11y).
  alt_text: requiredText("chữ thay thế (mô tả ảnh)", 300),
  caption: optionalText("chú thích", 500),
  source_id: z.preprocess(blankToNull, z.string().uuid("Nguồn không hợp lệ.").nullable()),
  era: z.enum(MEDIA_ERAS, { error: "Vui lòng chọn loại ảnh." }),
  year_taken: optionalInt("năm chụp", 1800, 2100),
  photographer: optionalText("tác giả", 200),
  // Bắt buộc: không rõ giấy phép thì chưa được đưa ảnh lên trang học sinh xem.
  license: requiredText("giấy phép (ví dụ: CC BY-SA 4.0, Phạm vi công cộng, Được phép của …)", 200),
  license_url: optionalHttpUrl("đường dẫn giấy phép"),
  source_page_url: optionalHttpUrl("trang gốc của ảnh"),
  is_reenactment: checkbox,
  is_colorized: checkbox,
  is_cover: checkbox,
  focal_point: z.preprocess(
    (value) => {
      const blank = blankToNull(value);
      return typeof blank === "string" ? blank.trim().replace(/\s+/g, " ") : blank;
    },
    z.string().regex(FOCAL_POINT_PATTERN, "Điểm lấy nét có dạng \"50% 30%\" (ngang, dọc; 0–100%).").nullable(),
  ),
};

export const mediaSchema = z.object({
  ...mediaMetaShape,
  width: optionalInt("chiều rộng ảnh", 1, 20000),
  height: optionalInt("chiều cao ảnh", 1, 20000),
  file_url: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string({ error: requiredMessage("địa chỉ ảnh") })
      .min(1, requiredMessage("địa chỉ ảnh"))
      .max(2000, "Địa chỉ ảnh quá dài.")
      .refine(isHttpUrl, "Địa chỉ ảnh phải bắt đầu bằng http:// hoặc https://."),
  ),
});
export type MediaInput = z.infer<typeof mediaSchema>;

/** Sửa media đã có: không cho đổi địa chỉ tệp hay kích thước, chỉ đổi thông tin mô tả và ghi công. */
export const mediaUpdateSchema = z.object(mediaMetaShape);
export type MediaUpdateInput = z.infer<typeof mediaUpdateSchema>;

/** Cột chủ sở hữu tương ứng trong media_assets. */
export function mediaOwnerColumn(kind: MediaOwnerKind): "event_id" | "figure_id" | "location_id" {
  return kind === "su-kien" ? "event_id" : kind === "nhan-vat" ? "figure_id" : "location_id";
}

/** Các cột mô tả/ghi công của media_assets lấy từ dữ liệu form đã kiểm tra (không gồm cột chủ sở hữu). */
export function mediaColumns(input: MediaUpdateInput) {
  return {
    alt_text: input.alt_text,
    caption: input.caption,
    source_id: input.source_id,
    era: input.era,
    year_taken: input.year_taken,
    photographer: input.photographer,
    license: input.license,
    license_url: input.license_url,
    source_page_url: input.source_page_url,
    is_reenactment: input.is_reenactment,
    is_colorized: input.is_colorized,
    is_cover: input.is_cover,
    focal_point: input.focal_point,
  };
}

/** Kiểm tra tệp ảnh trước khi tải lên (dùng ở client; bucket Storage cũng tự chặn ở server). */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Chỉ nhận ảnh định dạng JPG, PNG hoặc WebP.";
  }
  if (file.size > MEDIA_MAX_BYTES) {
    return "Ảnh quá lớn: tối đa 5 MB.";
  }
  if (file.size === 0) {
    return "Tệp ảnh trống.";
  }
  return null;
}
