import { describe, expect, it } from "vitest";
import {
  REVIEW_ACTIONS,
  REVIEW_TRANSITIONS,
  availableReviewActions,
  canReview,
  parseReviewAction,
  reviewNoteFor,
  revisionReasonSchema,
  staleMessage,
} from "@/lib/admin/review";
import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

const statuses: WorkflowStatus[] = ["draft", "pending_review", "needs_revision", "published", "hidden"];
const roles: StaffRole[] = ["editor", "reviewer", "system_admin"];

describe("availableReviewActions", () => {
  it("chờ duyệt: có thể yêu cầu chỉnh sửa hoặc công bố", () => {
    expect(availableReviewActions("reviewer", "pending_review")).toEqual(["request_revision", "publish"]);
  });

  it("đã công bố: chỉ có thể ẩn (không trả sửa — đã chốt với người dùng)", () => {
    expect(availableReviewActions("reviewer", "published")).toEqual(["hide"]);
  });

  it("đã ẩn: chỉ có thể công bố lại", () => {
    expect(availableReviewActions("reviewer", "hidden")).toEqual(["republish"]);
  });

  it("bản nháp và bản cần chỉnh sửa: không có hành động kiểm duyệt nào", () => {
    expect(availableReviewActions("reviewer", "draft")).toEqual([]);
    expect(availableReviewActions("reviewer", "needs_revision")).toEqual([]);
  });

  it("biên tập viên không có hành động kiểm duyệt ở bất kỳ trạng thái nào", () => {
    for (const status of statuses) expect(availableReviewActions("editor", status), status).toEqual([]);
  });

  it("quản trị viên có cùng hành động như kiểm duyệt viên", () => {
    for (const status of statuses) {
      expect(availableReviewActions("system_admin", status)).toEqual(availableReviewActions("reviewer", status));
    }
  });
});

describe("REVIEW_TRANSITIONS khớp policy reviewer_update_status ở database", () => {
  // Policy: USING trạng thái cũ ∈ {pending_review, published, hidden}; WITH CHECK trạng thái mới ∈ {needs_revision, published, hidden}.
  const usingOld = ["pending_review", "published", "hidden"];
  const checkNew = ["needs_revision", "published", "hidden"];

  it("mọi hành động đều nằm trong phạm vi RLS cho phép", () => {
    for (const action of REVIEW_ACTIONS) {
      const { from, to } = REVIEW_TRANSITIONS[action];
      expect(usingOld, `${action}: from=${from}`).toContain(from);
      expect(checkNew, `${action}: to=${to}`).toContain(to);
    }
  });

  it("không có hành động nào đưa nội dung về draft hoặc pending_review", () => {
    for (const action of REVIEW_ACTIONS) {
      expect(["draft", "pending_review"]).not.toContain(REVIEW_TRANSITIONS[action].to);
    }
  });
});

describe("canReview / parseReviewAction", () => {
  it("chỉ reviewer và admin được kiểm duyệt", () => {
    expect(roles.filter(canReview)).toEqual(["reviewer", "system_admin"]);
  });

  it("nhận 4 hành động hợp lệ, giá trị lạ → null", () => {
    for (const action of REVIEW_ACTIONS) expect(parseReviewAction(action)).toBe(action);
    for (const value of ["", "delete", "constructor", "__proto__", "PUBLISH"]) expect(parseReviewAction(value), value).toBeNull();
  });
});

describe("revisionReasonSchema (UC11: bắt buộc nhập lý do)", () => {
  const parse = (value: unknown) => revisionReasonSchema.safeParse(value);

  it("từ chối lý do rỗng, chỉ khoảng trắng, thiếu trường", () => {
    for (const value of ["", "   ", "\n\t", null, undefined]) {
      const result = parse(value);
      expect(result.success, JSON.stringify(value)).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toContain("lý do");
    }
  });

  it("từ chối lý do quá ngắn hoặc quá dài", () => {
    expect(parse("ab").success).toBe(false);
    expect(parse("x".repeat(2001)).success).toBe(false);
  });

  it("nhận lý do hợp lệ và cắt khoảng trắng đầu/cuối", () => {
    const result = parse("  Sai mốc thời gian, xem lại SGK trang 45  ");
    expect(result.success && result.data).toBe("Sai mốc thời gian, xem lại SGK trang 45");
  });
});

describe("reviewNoteFor (đã chốt: xóa lý do khi công bố)", () => {
  it("trả sửa lưu lý do", () => {
    expect(reviewNoteFor("request_revision", "Sai mốc")).toEqual({ review_note: "Sai mốc" });
  });

  it("công bố và công bố lại xóa lý do cũ", () => {
    expect(reviewNoteFor("publish", null)).toEqual({ review_note: null });
    expect(reviewNoteFor("republish", null)).toEqual({ review_note: null });
  });

  it("ẩn không đụng tới review_note", () => {
    expect(reviewNoteFor("hide", null)).toEqual({});
  });
});

describe("staleMessage", () => {
  it("báo đã có người khác xử lý, kèm trạng thái hiện tại", () => {
    expect(staleMessage("Đã công bố")).toContain("xử lý bởi người khác");
    expect(staleMessage("Đã công bố")).toContain("Đã công bố");
  });

  it("nội dung không còn tồn tại vẫn có thông báo", () => {
    expect(staleMessage(null)).toContain("không còn tồn tại");
  });
});
