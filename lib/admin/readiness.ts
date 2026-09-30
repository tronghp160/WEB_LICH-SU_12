// Kiểm tra "sẵn sàng gửi duyệt" (UC09) — hàm thuần dùng chung cho giao diện (hiện checklist)
// và Server Action (chặn lần cuối, không tin client). Chia hai mức:
//  - blocking: BẮT BUỘC, chưa đạt thì không gửi duyệt được
//  - warnings: khuyến nghị, không chặn nhưng nên xử lý

import type { ContentKind } from "@/lib/admin/content-kinds";
import { countWords, missingStandardSections } from "@/lib/utils/rich-text";

export type ReadinessResult = {
  blocking: string[];
  warnings: string[];
};

/** Thống kê ảnh của nội dung (sự kiện, nhân vật, địa điểm). */
export type MediaStats = {
  count: number;
  missingAlt: number;
  missingLicense: number;
};

type CommonChecks = {
  /** Các đoạn chữ sẽ hiện ở trang công khai (tiêu đề, mô tả, ghi chú nguồn, chú thích ảnh…). */
  publicTexts?: readonly (string | null | undefined)[];
  /** Không truyền = loại nội dung không có ảnh (chủ đề). */
  media?: MediaStats;
};

export type ReadinessSnapshot = CommonChecks &
  (
  | { kind: "chu-de"; description: string | null }
  | { kind: "nhan-vat"; biography: string | null }
  | {
      kind: "dia-diem";
      latitude: number | null;
      longitude: number | null;
      accuracyLevel: string;
      description: string | null;
    }
  | {
      kind: "su-kien";
      content: string | null;
      sourceCount: number;
      /** Địa điểm chính đã gắn (có thể chưa published). */
      hasPrimaryLocation: boolean;
      figureCount: number;
      /** Số nhân vật/địa điểm gắn vào nhưng CHƯA published — sẽ không hiện ở trang công khai. */
      unpublishedLinkedCount: number;
    }
  );

/** Ghi chú nội bộ kiểu "TODO: kiểm chứng" — không được lọt ra trang học sinh xem. */
const INTERNAL_NOTE_PATTERN = /\b(TODO|FIXME)\b/i;

export function containsInternalNote(text: string | null | undefined): boolean {
  return typeof text === "string" && INTERNAL_NOTE_PATTERN.test(text);
}

export function evaluateReadiness(snapshot: ReadinessSnapshot): ReadinessResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  const internalNoteCount = (snapshot.publicTexts ?? []).filter(containsInternalNote).length;
  if (internalNoteCount > 0) {
    blocking.push(
      `Còn ${internalNoteCount} đoạn chứa ghi chú nội bộ "TODO" sẽ hiện cho học sinh. Hãy chuyển ghi chú sang tài liệu nội bộ trước khi gửi duyệt.`,
    );
  }

  const media = snapshot.media;
  if (media) {
    if (media.missingAlt > 0) {
      blocking.push(`Còn ${media.missingAlt} ảnh chưa có chữ thay thế (alt text).`);
    }
    if (media.missingLicense > 0) {
      blocking.push(`Còn ${media.missingLicense} ảnh chưa ghi giấy phép: chưa rõ bản quyền thì chưa đưa lên cho học sinh xem.`);
    }
    if (media.count === 0) {
      // Nguyên tắc "ảnh thật đi trước": hiện là khuyến nghị, sẽ thành bắt buộc khi kho ảnh đã đủ.
      warnings.push("Chưa có ảnh nào: học sinh sẽ chỉ thấy chữ. Nên thêm ít nhất một ảnh thật (ảnh tư liệu hoặc ảnh ngày nay).");
    }
  }

  switch (snapshot.kind) {
    case "su-kien":
      if (snapshot.sourceCount === 0) {
        blocking.push("Sự kiện phải có ít nhất 1 nguồn tham khảo.");
      }
      if (!snapshot.hasPrimaryLocation) {
        warnings.push("Chưa chọn địa điểm chính: sự kiện sẽ không có vị trí trên bản đồ.");
      }
      if (!snapshot.content || snapshot.content.trim() === "") {
        warnings.push("Chưa có phần nội dung chi tiết (chỉ có tóm tắt).");
      } else {
        const missing = missingStandardSections(snapshot.content);
        if (missing.length > 0) {
          warnings.push(`Nội dung chưa theo khung chuẩn, còn thiếu mục: ${missing.join(", ")} (viết "## Tên mục" ở đầu mỗi mục).`);
        }
        const words = countWords(snapshot.content);
        if (words < 300) {
          warnings.push(`Nội dung còn ngắn (${words} chữ); khuyến nghị 400–800 chữ.`);
        }
      }
      if (snapshot.figureCount === 0) {
        warnings.push("Chưa gắn nhân vật nào.");
      }
      if (snapshot.unpublishedLinkedCount > 0) {
        warnings.push(
          `${snapshot.unpublishedLinkedCount} nhân vật/địa điểm đã gắn chưa được công bố nên chưa hiển thị ở trang công khai.`,
        );
      }
      break;

    case "dia-diem": {
      const hasCoordinates = snapshot.latitude !== null && snapshot.longitude !== null;
      if (!hasCoordinates) {
        warnings.push("Chưa có tọa độ: địa điểm sẽ không xuất hiện trên bản đồ.");
      } else if (snapshot.accuracyLevel === "unknown") {
        warnings.push("Đã có tọa độ nhưng độ chính xác còn là \"Chưa xác định\".");
      }
      if (!snapshot.description || snapshot.description.trim() === "") {
        warnings.push("Chưa có mô tả.");
      }
      break;
    }

    case "nhan-vat":
      if (!snapshot.biography || snapshot.biography.trim() === "") {
        warnings.push("Chưa có tiểu sử.");
      }
      break;

    case "chu-de":
      if (!snapshot.description || snapshot.description.trim() === "") {
        warnings.push("Chưa có mô tả chủ đề.");
      }
      break;
  }

  return { blocking, warnings };
}

export function isReady(result: ReadinessResult): boolean {
  return result.blocking.length === 0;
}

/** Loại nội dung có kiểm tra bắt buộc ngoài các trường NOT NULL của DB. */
export const KINDS_WITH_BLOCKING_CHECKS: readonly ContentKind[] = ["chu-de", "nhan-vat", "dia-diem", "su-kien"];
