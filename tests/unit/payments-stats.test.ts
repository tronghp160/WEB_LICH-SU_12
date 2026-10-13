import { describe, expect, it } from "vitest";
import { looksShared, summarizeRevenue, vnDate, type PaidOrderRow } from "@/lib/payments/stats";

// 13/10/2026 09:00 giờ Việt Nam = 02:00 UTC
const NOW = new Date("2026-10-13T02:00:00Z");

const row = (paidAt: string, amount: number, kind: PaidOrderRow["kind"] = "exam_pack"): PaidOrderRow => ({ amount_vnd: amount, paid_at: paidAt, kind });

describe("doanh thu theo ngày lịch Việt Nam", () => {
  it("23:30 UTC hôm trước đã là 'hôm nay' ở Việt Nam", () => {
    expect(vnDate(new Date("2026-10-12T17:30:00Z"))).toBe("2026-10-13");
    expect(vnDate(new Date("2026-10-12T16:59:00Z"))).toBe("2026-10-12");
  });

  it("chia đúng các cửa sổ hôm nay / 7 ngày / 30 ngày và theo loại sản phẩm", () => {
    const summary = summarizeRevenue(
      [
        row("2026-10-12T17:30:00Z", 29000), // 00:30 ngày 13 (VN) → hôm nay
        row("2026-10-13T01:00:00Z", 50000, "donation"), // hôm nay
        row("2026-10-12T16:00:00Z", 29000), // 23:00 ngày 12 → không phải hôm nay, trong 7 ngày
        row("2026-10-07T05:00:00Z", 29000), // ngày 7 → trong 7 ngày (7..13)
        row("2026-10-06T05:00:00Z", 29000), // ngày 6 → ngoài 7 ngày, trong 30
        row("2026-09-14T05:00:00Z", 20000, "donation"), // ngày 14/9 → ngày đầu cửa sổ 30 ngày
        row("2026-09-13T05:00:00Z", 99000), // ngoài 30 ngày
      ],
      NOW,
    );
    expect(summary.today).toEqual({ count: 2, amountVnd: 79000, examPackVnd: 29000, donationVnd: 50000 });
    expect(summary.last7Days).toEqual({ count: 4, amountVnd: 137000, examPackVnd: 87000, donationVnd: 50000 });
    expect(summary.last30Days).toEqual({ count: 6, amountVnd: 186000, examPackVnd: 116000, donationVnd: 70000 });
  });

  it("không có đơn → toàn số 0", () => {
    expect(summarizeRevenue([], NOW).last30Days).toEqual({ count: 0, amountVnd: 0, examPackVnd: 0, donationVnd: 0 });
  });
});

describe("cảnh báo mã bị chia sẻ", () => {
  it("hết lượt thiết bị trong vòng 24 giờ → nghi chia sẻ", () => {
    const quick = ["2026-10-13T01:00:00Z", "2026-10-13T05:00:00Z", "2026-10-13T20:00:00Z"].map((at) => ({ activated_at: at }));
    expect(looksShared(quick, 3)).toBe(true);
  });

  it("dùng dần trong nhiều ngày hoặc chưa hết lượt → bình thường", () => {
    const slow = ["2026-10-01T01:00:00Z", "2026-10-05T05:00:00Z", "2026-10-13T20:00:00Z"].map((at) => ({ activated_at: at }));
    expect(looksShared(slow, 3)).toBe(false);
    expect(looksShared(slow.slice(0, 2), 3)).toBe(false);
    expect(looksShared([], 3)).toBe(false);
  });
});
