import { describe, expect, it } from "vitest";
import {
  LICENSE_ALPHABET,
  LICENSE_CODE_PATTERN,
  generateLicenseCode,
  isLicenseCode,
  maskLicenseCode,
  normalizeLicenseCode,
} from "@/lib/payments/license";
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  canTransition,
  isFinalStatus,
  parseOrderStatus,
  paymentReasonMessage,
} from "@/lib/payments/order-status";
import {
  DESCRIPTION_MAX_LENGTH,
  donationTier,
  formatVnd,
  parseVndInput,
  paymentDescription,
  resolveOrderAmount,
  type PricedProduct,
} from "@/lib/payments/pricing";

const pack: PricedProduct = { kind: "exam_pack", price_vnd: 29_000, min_vnd: null, max_vnd: null, is_active: true };
const donation: PricedProduct = { kind: "donation", price_vnd: null, min_vnd: 10_000, max_vnd: 2_000_000, is_active: true };

describe("mã kích hoạt", () => {
  it("sinh đúng định dạng, chỉ dùng ký tự trong bảng chữ", () => {
    for (let round = 0; round < 200; round++) {
      const code = generateLicenseCode();
      expect(code).toMatch(LICENSE_CODE_PATTERN);
      expect(isLicenseCode(code)).toBe(true);
    }
  });

  it("bảng chữ có 32 ký tự, không có I, O, 0, 1", () => {
    expect(LICENSE_ALPHABET).toHaveLength(32);
    expect(new Set(LICENSE_ALPHABET).size).toBe(32);
    for (const char of "IO01") expect(LICENSE_ALPHABET).not.toContain(char);
  });

  it("ánh xạ byte → ký tự không lệch (byte % 32) và có thể điều khiển trong test", () => {
    const code = generateLicenseCode((bytes) => bytes.map((_, index) => index + 32));
    expect(code).toBe("LT12-ABCD-EFGH-JKLM");
  });

  it("chuẩn hóa mã người dùng gõ: chữ thường, khoảng trắng, thiếu gạch, thiếu tiền tố", () => {
    expect(normalizeLicenseCode("lt12-abcd-efgh-jklm")).toBe("LT12-ABCD-EFGH-JKLM");
    expect(normalizeLicenseCode("  LT12 ABCD EFGH JKLM ")).toBe("LT12-ABCD-EFGH-JKLM");
    expect(normalizeLicenseCode("LT12ABCDEFGHJKLM")).toBe("LT12-ABCD-EFGH-JKLM");
    expect(normalizeLicenseCode("abcd-efgh-jklm")).toBe("LT12-ABCD-EFGH-JKLM");
    expect(normalizeLicenseCode("LT12–ABCD–EFGH–JKLM")).toBe("LT12-ABCD-EFGH-JKLM");
  });

  it("từ chối mã sai độ dài hoặc có ký tự dễ nhầm / ngoài bảng chữ", () => {
    expect(normalizeLicenseCode("")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH-JKLMN")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH-JKL0")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH-JKLO")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH-JKL1")).toBeNull();
    expect(normalizeLicenseCode("LT12-ABCD-EFGH-JKL!")).toBeNull();
  });

  it("che bớt mã khi hiển thị", () => {
    expect(maskLicenseCode("LT12-ABCD-EFGH-JKLM")).toBe("LT12-AB**-****-**LM");
    expect(maskLicenseCode("không phải mã")).toBe("—");
  });
});

describe("máy trạng thái đơn hàng", () => {
  it("chỉ các chuyển trạng thái trong kế hoạch là hợp lệ", () => {
    const allowed = new Set(["pending>paid", "pending>cancelled", "pending>expired", "expired>paid", "paid>refunded"]);
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to), `${from} → ${to}`).toBe(allowed.has(`${from}>${to}`));
      }
    }
  });

  it("không quay lại pending, đơn đã hủy / đã hoàn tiền là trạng thái cuối", () => {
    for (const from of ORDER_STATUSES) expect(ORDER_TRANSITIONS[from]).not.toContain("pending");
    expect(isFinalStatus("cancelled")).toBe(true);
    expect(isFinalStatus("refunded")).toBe(true);
    expect(isFinalStatus("paid")).toBe(false);
  });

  it("đọc trạng thái và lý do từ chối", () => {
    expect(parseOrderStatus("paid")).toBe("paid");
    expect(parseOrderStatus("PAID")).toBeNull();
    expect(paymentReasonMessage("device_limit")).toContain("3 thiết bị");
    expect(paymentReasonMessage("lạ")).toContain("thử lại");
    expect(paymentReasonMessage(null)).toContain("thử lại");
  });
});

describe("tính tiền đơn hàng", () => {
  it("gói luyện thi luôn lấy giá trong DB, bỏ qua số tiền gửi lên", () => {
    expect(resolveOrderAmount(pack)).toEqual({ ok: true, amountVnd: 29_000 });
    expect(resolveOrderAmount(pack, 1)).toEqual({ ok: true, amountVnd: 29_000 });
  });

  it("sản phẩm ngừng bán hoặc thiếu giá bị từ chối", () => {
    expect(resolveOrderAmount({ ...pack, is_active: false }).ok).toBe(false);
    expect(resolveOrderAmount({ ...pack, price_vnd: null }).ok).toBe(false);
    expect(resolveOrderAmount({ ...donation, max_vnd: null }, 20_000).ok).toBe(false);
  });

  it("ủng hộ: số nguyên trong khoảng cho phép", () => {
    expect(resolveOrderAmount(donation, 10_000)).toEqual({ ok: true, amountVnd: 10_000 });
    expect(resolveOrderAmount(donation, 2_000_000)).toEqual({ ok: true, amountVnd: 2_000_000 });
    expect(resolveOrderAmount(donation, 9_999).ok).toBe(false);
    expect(resolveOrderAmount(donation, 2_000_001).ok).toBe(false);
    expect(resolveOrderAmount(donation, 15_000.5).ok).toBe(false);
    expect(resolveOrderAmount(donation, Number.NaN).ok).toBe(false);
    expect(resolveOrderAmount(donation).ok).toBe(false);
  });

  it("đọc số tiền người dùng gõ", () => {
    expect(parseVndInput("50.000")).toBe(50_000);
    expect(parseVndInput("50 000đ")).toBe(50_000);
    expect(parseVndInput("50000")).toBe(50_000);
    expect(parseVndInput("1,000,000 VND")).toBe(1_000_000);
    expect(parseVndInput("-5000")).toBeNull();
    expect(parseVndInput("năm mươi nghìn")).toBeNull();
    expect(parseVndInput("")).toBeNull();
  });

  it("định dạng tiền Việt Nam", () => {
    expect(formatVnd(29_000)).toBe("29.000đ");
    expect(formatVnd(2_000_000)).toBe("2.000.000đ");
    expect(formatVnd(500)).toBe("500đ");
  });

  it("nội dung chuyển khoản ngắn, không dấu", () => {
    const text = paymentDescription("exam_pack", 100123);
    expect(text).toBe("LT12 DH100123");
    expect(paymentDescription("donation", 100124)).toBe("UH12 DH100124");
    expect(paymentDescription("donation", Number.MAX_SAFE_INTEGER).length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(text).toMatch(/^[A-Z0-9 ]+$/);
  });

  it("bức tường cảm ơn chỉ hiện mức, không hiện số tiền", () => {
    expect(donationTier(10_000)).toBe("Ủng hộ");
    expect(donationTier(50_000)).toBe("Ủng hộ nhiệt tình");
    expect(donationTier(200_000)).toBe("Nhà hảo tâm");
  });
});
