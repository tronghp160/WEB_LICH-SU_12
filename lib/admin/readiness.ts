// Kiểm tra "sẵn sàng gửi duyệt" (UC09) — hàm thuần dùng chung cho giao diện (hiện checklist)
// và Server Action (chặn lần cuối, không tin client). Chia hai mức:
//  - blocking: BẮT BUỘC, chưa đạt thì không gửi duyệt được
//  - warnings: khuyến nghị, không chặn nhưng nên xử lý

import type { ContentKind } from "@/lib/admin/content-kinds";

export type ReadinessResult = {
  blocking: string[];
  warnings: string[];
};

export type ReadinessSnapshot =
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
      mediaMissingAltCount: number;
    };

export function evaluateReadiness(snapshot: ReadinessSnapshot): ReadinessResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  switch (snapshot.kind) {
    case "su-kien":
      if (snapshot.sourceCount === 0) {
        blocking.push("Sự kiện phải có ít nhất 1 nguồn tham khảo.");
      }
      if (snapshot.mediaMissingAltCount > 0) {
        blocking.push(`Còn ${snapshot.mediaMissingAltCount} ảnh chưa có chữ thay thế (alt text).`);
      }
      if (!snapshot.hasPrimaryLocation) {
        warnings.push("Chưa chọn địa điểm chính: sự kiện sẽ không có vị trí trên bản đồ.");
      }
      if (!snapshot.content || snapshot.content.trim() === "") {
        warnings.push("Chưa có phần nội dung chi tiết (chỉ có tóm tắt).");
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
export const KINDS_WITH_BLOCKING_CHECKS: readonly ContentKind[] = ["su-kien"];
