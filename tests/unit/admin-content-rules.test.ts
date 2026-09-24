import { describe, expect, it } from "vitest";
import { adminContentTargets, availableAdminContentActions, deleteBlockedMessages } from "@/lib/admin/admin-content-rules";
import { CONTENT_KINDS } from "@/lib/admin/content-kinds";
import type { WorkflowStatus } from "@/lib/utils/labels";

const statuses: WorkflowStatus[] = ["draft", "pending_review", "needs_revision", "published", "hidden"];

describe("availableAdminContentActions", () => {
  it("bản nháp: chỉ có thể xóa (không cần khôi phục hay ẩn)", () => {
    expect(availableAdminContentActions("draft")).toEqual(["delete"]);
  });

  it("đã công bố: khôi phục về nháp, ẩn, xóa", () => {
    expect(availableAdminContentActions("published")).toEqual(["restore_draft", "hide", "delete"]);
  });

  it("đã ẩn: khôi phục về nháp hoặc xóa (không ẩn lại)", () => {
    expect(availableAdminContentActions("hidden")).toEqual(["restore_draft", "delete"]);
  });

  it("chờ duyệt / cần chỉnh sửa: khôi phục, ẩn, xóa", () => {
    for (const status of ["pending_review", "needs_revision"] as const) {
      expect(availableAdminContentActions(status)).toEqual(["restore_draft", "hide", "delete"]);
    }
  });

  it("ở mọi trạng thái đều có thể xóa, và không bao giờ khôi phục 'về nháp' khi đã là nháp", () => {
    for (const status of statuses) {
      const actions = availableAdminContentActions(status);
      expect(actions).toContain("delete");
      if (status === "draft") expect(actions).not.toContain("restore_draft");
    }
  });

  it("ưu tiên ẩn hơn xóa: 'ẩn' đứng trước 'xóa' trong danh sách", () => {
    const actions = availableAdminContentActions("published");
    expect(actions.indexOf("hide")).toBeLessThan(actions.indexOf("delete"));
  });
});

describe("adminContentTargets / deleteBlockedMessages", () => {
  it("trạng thái đích đúng", () => {
    expect(adminContentTargets).toEqual({ restore_draft: "draft", hide: "hidden" });
  });

  it("có thông báo xóa bị chặn (tiếng Việt) cho cả 4 loại nội dung", () => {
    for (const kind of CONTENT_KINDS) expect(deleteBlockedMessages[kind], kind).toContain("Không xóa được");
  });
});
