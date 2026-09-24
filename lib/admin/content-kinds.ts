// Danh mục các loại nội dung có quy trình duyệt (Mục 0.2) + quyền chỉnh sửa theo vai trò.
// Hàm thuần, không import server-only, để dùng cả ở server lẫn client và unit test được.

import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

export const CONTENT_KINDS = ["chu-de", "su-kien", "nhan-vat", "dia-diem"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** Loại thứ 5 trong khu Nội dung: nguồn tham khảo — không có quy trình duyệt. */
export const SOURCE_KIND = "nguon" as const;
export type ContentSegment = ContentKind | typeof SOURCE_KIND;

export const CONTENT_TABLES = {
  "chu-de": "curriculum_topics",
  "su-kien": "historical_events",
  "nhan-vat": "historical_figures",
  "dia-diem": "historical_locations",
} as const satisfies Record<ContentKind, string>;

export const contentKindLabels: Record<
  ContentSegment,
  { singular: string; plural: string; newLabel: string }
> = {
  "chu-de": { singular: "chủ đề", plural: "Chủ đề", newLabel: "Thêm chủ đề" },
  "su-kien": { singular: "sự kiện", plural: "Sự kiện", newLabel: "Thêm sự kiện" },
  "nhan-vat": { singular: "nhân vật", plural: "Nhân vật", newLabel: "Thêm nhân vật" },
  "dia-diem": { singular: "địa điểm", plural: "Địa điểm", newLabel: "Thêm địa điểm" },
  nguon: { singular: "nguồn", plural: "Nguồn tham khảo", newLabel: "Thêm nguồn" },
};

/** Đọc đoạn URL `[loai]`; giá trị lạ → null (trang sẽ trả 404). */
export function parseContentSegment(value: string): ContentSegment | null {
  if (value === SOURCE_KIND) return SOURCE_KIND;
  return CONTENT_KINDS.find((kind) => kind === value) ?? null;
}

/**
 * Vai trò có SỬA được nội dung ở trạng thái này không (phản chiếu RLS ở database:
 * editor chỉ sửa `draft`/`needs_revision`; admin sửa mọi trạng thái; reviewer không sửa nội dung).
 * Đây chỉ là lớp ẩn/hiện nút — quyền thật do RLS quyết định.
 */
export function canEditContent(role: StaffRole, status: WorkflowStatus): boolean {
  if (role === "system_admin") return true;
  if (role === "editor") return status === "draft" || status === "needs_revision";
  return false;
}

/** Được GỬI DUYỆT khi đang là bản nháp hoặc bản cần chỉnh sửa (UC09). */
export function canSubmitForReview(role: StaffRole, status: WorkflowStatus): boolean {
  return (role === "editor" || role === "system_admin") && (status === "draft" || status === "needs_revision");
}

/** Đường dẫn các trang quản lý nội dung. */
export const contentPaths = {
  hub: "/quan-tri/noi-dung",
  list: (segment: ContentSegment) => `/quan-tri/noi-dung/${segment}`,
  create: (segment: ContentSegment) => `/quan-tri/noi-dung/${segment}/moi`,
  edit: (segment: ContentSegment, id: string) => `/quan-tri/noi-dung/${segment}/${id}`,
};
