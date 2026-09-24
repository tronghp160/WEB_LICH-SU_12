// Nhãn tiếng Việt cho các giá trị enum / CHECK trong database (Mục 6, KE_HOACH_DU_AN.md).

export const workflowStatusLabels = {
  draft: "Bản nháp",
  pending_review: "Chờ duyệt",
  needs_revision: "Cần chỉnh sửa",
  published: "Đã công bố",
  hidden: "Đã ẩn",
} as const;

export const staffRoleLabels = {
  editor: "Biên tập viên",
  reviewer: "Kiểm duyệt viên",
  system_admin: "Quản trị viên hệ thống",
} as const;

export const accountStatusLabels = {
  active: "Hoạt động",
  locked: "Đã khóa",
} as const;

export const datePrecisionLabels = {
  exact: "Chính xác",
  year: "Theo năm",
  period: "Theo giai đoạn",
  approximate: "Gần đúng",
  disputed: "Còn tranh luận",
} as const;

export const accuracyLevelLabels = {
  exact: "Chính xác",
  approximate: "Gần đúng",
  region: "Khu vực",
  unknown: "Chưa xác định",
} as const;

export const sourceTypeLabels = {
  book: "Sách",
  article: "Bài báo",
  official: "Văn bản chính thức",
  web: "Trang web",
  archive: "Tư liệu lưu trữ",
  other: "Khác",
} as const;

/**
 * `date_precision` trong DB là text có CHECK (không phải enum) nên kiểu sinh ra
 * chỉ là `string`. Hàm này thu hẹp về DatePrecision; giá trị lạ (không thể xảy
 * ra khi CHECK còn nguyên, nhưng có thể khi schema đổi mà nhãn chưa cập nhật)
 * được coi là "approximate" để vẫn hiện nhãn cảnh báo thay vì giấu sự không chắc chắn.
 */
export function parseDatePrecision(value: string): DatePrecision {
  return Object.hasOwn(datePrecisionLabels, value)
    ? (value as DatePrecision)
    : "approximate";
}

/**
 * `accuracy_level` cũng là text có CHECK nên kiểu sinh ra chỉ là `string`. Giá
 * trị lạ được coi là "unknown" — vẫn hiện nhãn cảnh báo thay vì giả vờ chính xác.
 */
export function parseAccuracyLevel(value: string): AccuracyLevel {
  return Object.hasOwn(accuracyLevelLabels, value) ? (value as AccuracyLevel) : "unknown";
}

export type WorkflowStatus = keyof typeof workflowStatusLabels;
export type StaffRole = keyof typeof staffRoleLabels;
export type AccountStatus = keyof typeof accountStatusLabels;
export type DatePrecision = keyof typeof datePrecisionLabels;
export type AccuracyLevel = keyof typeof accuracyLevelLabels;
export type SourceType = keyof typeof sourceTypeLabels;
