import { describe, expect, it } from "vitest";
import { canEditContent, canSubmitForReview, isSourceLockedForEditor, parseContentSegment } from "@/lib/admin/content-kinds";
import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

const statuses: WorkflowStatus[] = ["draft", "pending_review", "needs_revision", "published", "hidden"];

describe("canEditContent (phản chiếu RLS)", () => {
  it("biên tập viên chỉ sửa được bản nháp và bản cần chỉnh sửa", () => {
    const editable = statuses.filter((status) => canEditContent("editor", status));
    expect(editable).toEqual(["draft", "needs_revision"]);
  });

  it("kiểm duyệt viên không sửa được nội dung ở bất kỳ trạng thái nào", () => {
    expect(statuses.some((status) => canEditContent("reviewer", status))).toBe(false);
  });

  it("quản trị viên sửa được mọi trạng thái", () => {
    expect(statuses.every((status) => canEditContent("system_admin", status))).toBe(true);
  });
});

describe("canSubmitForReview", () => {
  it("chỉ editor/admin và chỉ từ draft hoặc needs_revision", () => {
    const roles: StaffRole[] = ["editor", "reviewer", "system_admin"];
    const allowed = roles.flatMap((role) =>
      statuses.filter((status) => canSubmitForReview(role, status)).map((status) => `${role}:${status}`),
    );
    expect(allowed).toEqual([
      "editor:draft",
      "editor:needs_revision",
      "system_admin:draft",
      "system_admin:needs_revision",
    ]);
  });
});

describe("parseContentSegment", () => {
  it("nhận 4 loại nội dung và nguồn", () => {
    for (const value of ["chu-de", "su-kien", "nhan-vat", "dia-diem", "nguon"]) {
      expect(parseContentSegment(value)).toBe(value);
    }
  });

  it("giá trị lạ (kể cả thuộc tính của Object.prototype) → null", () => {
    for (const value of ["", "abc", "constructor", "__proto__", "SU-KIEN"]) {
      expect(parseContentSegment(value), value).toBeNull();
    }
  });
});

describe("isSourceLockedForEditor (phản chiếu policy của bảng sources)", () => {
  it("nguồn chưa gắn sự kiện nào → không khóa", () => {
    expect(isSourceLockedForEditor([])).toBe(false);
  });

  it("chỉ gắn với sự kiện draft/needs_revision → không khóa", () => {
    expect(isSourceLockedForEditor(["draft", "needs_revision", "draft"])).toBe(false);
  });

  it("gắn với BẤT KỲ sự kiện pending_review/published/hidden nào → khóa", () => {
    for (const locked of ["pending_review", "published", "hidden"] as const) {
      expect(isSourceLockedForEditor([locked]), locked).toBe(true);
      expect(isSourceLockedForEditor(["draft", locked]), `draft + ${locked}`).toBe(true);
    }
  });
});
