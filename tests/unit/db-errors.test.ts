import { describe, expect, it } from "vitest";
import { translateDbError } from "@/lib/utils/db-errors";

describe("translateDbError", () => {
  it("23505 trùng slug → 'Đường dẫn đã tồn tại' và gắn vào ô slug", () => {
    const result = translateDbError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "historical_events_slug_key"',
      details: "Key (slug)=(tuyen-ngon-doc-lap) already exists.",
    });
    expect(result).toEqual({ message: "Đường dẫn đã tồn tại. Hãy chọn đường dẫn khác.", field: "slug" });
  });

  it("23505 khi database KHÔNG trả details: suy ra cột từ tên ràng buộc (trường hợp thực tế)", () => {
    for (const constraint of ["historical_events_slug_key", "curriculum_topics_slug_key", "historical_figures_slug_key", "historical_locations_slug_key"]) {
      const result = translateDbError({
        code: "23505",
        details: null,
        message: `duplicate key value violates unique constraint "${constraint}"`,
      });
      expect(result, constraint).toEqual({ message: "Đường dẫn đã tồn tại. Hãy chọn đường dẫn khác.", field: "slug" });
    }
    expect(
      translateDbError({ code: "23505", message: 'duplicate key value violates unique constraint "curriculum_topics_name_key"' }).field,
    ).toBe("name");
  });

  it("23505 trùng tên chủ đề", () => {
    const result = translateDbError({ code: "23505", details: "Key (name)=(A) already exists." });
    expect(result.field).toBe("name");
  });

  it("23505 hai địa điểm chính", () => {
    const result = translateDbError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "uq_event_locations_one_primary"',
    });
    expect(result.message).toBe("Mỗi sự kiện chỉ có tối đa một địa điểm chính.");
  });

  it("23514 vi phạm CHECK: diễn giải theo cột", () => {
    expect(translateDbError({ code: "23514", message: 'new row violates check constraint "historical_locations_latitude_check"' }).message).toContain("Tọa độ");
    expect(translateDbError({ code: "23514", message: 'new row for relation "historical_events" violates check constraint "historical_events_check"' }).message).toContain("Mốc thời gian");
    expect(translateDbError({ code: "23514", message: "x" }).message).toContain("ràng buộc");
  });

  it("42501 RLS từ chối", () => {
    expect(translateDbError({ code: "42501", message: 'new row violates row-level security policy for table "historical_events"' }).message).toContain("không có quyền");
  });

  it("P0001 từ trigger nghiệp vụ: giữ nguyên thông báo tiếng Việt", () => {
    const message = "Sự kiện phải có ít nhất 1 nguồn tham khảo trước khi gửi duyệt hoặc công bố";
    expect(translateDbError({ code: "P0001", message }).message).toBe(message);
  });

  it("23503 khóa ngoại và 23502 thiếu trường", () => {
    expect(translateDbError({ code: "23503" }).message).toContain("đang được nơi khác sử dụng");
    expect(translateDbError({ code: "23502" }).message).toContain("thiếu");
  });

  it("lỗi lạ: thông báo chung, KHÔNG lộ chi tiết nội bộ", () => {
    const result = translateDbError({
      code: "XX000",
      message: 'relation "secret_table" does not exist',
      details: "internal detail",
    });
    expect(result.message).toBe("Không lưu được do lỗi hệ thống. Vui lòng thử lại sau.");
    expect(result.message).not.toContain("secret_table");
  });

  it("không ném lỗi khi thiếu mọi trường", () => {
    expect(() => translateDbError({})).not.toThrow();
  });
});
