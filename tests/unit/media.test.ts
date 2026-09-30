import { describe, expect, it } from "vitest";
import { arrangeMedia, licenseLabel, pickCardCover, toMediaItems, type MediaRow } from "@/lib/media";
import { pickOnThisDay, vietnamToday } from "@/lib/utils/on-this-day";

function row(id: string, extra: Partial<MediaRow> = {}): MediaRow {
  return {
    id,
    file_url: `https://x/${id}-1200.webp`,
    media_type: "image",
    caption: null,
    alt_text: id,
    sort_order: 1,
    era: "historical",
    year_taken: null,
    photographer: null,
    license: "CC BY 4.0",
    license_url: null,
    source_page_url: null,
    is_reenactment: false,
    is_colorized: false,
    is_cover: false,
    focal_point: null,
    pair_id: null,
    width: null,
    height: null,
    sources: null,
    ...extra,
  };
}

describe("arrangeMedia", () => {
  it("ảnh bìa lên đầu và không lặp lại trong bộ sưu tập", () => {
    const items = toMediaItems([row("a", { sort_order: 1 }), row("b", { sort_order: 2, is_cover: true })]);
    const { cover, gallery } = arrangeMedia(items);
    expect(cover?.id).toBe("b");
    expect(gallery.map((item) => item.id)).toEqual(["a"]);
  });

  it("chưa chọn ảnh bìa → ảnh đầu tiên làm bìa", () => {
    expect(arrangeMedia(toMediaItems([row("a", { sort_order: 2 }), row("b", { sort_order: 1 })])).cover?.id).toBe("b");
  });

  it("cặp xưa – nay: đúng một ảnh xưa và một ảnh nay; ảnh trong cặp không nằm trong bộ sưu tập", () => {
    const items = toMediaItems([
      row("cover", { is_cover: true }),
      row("old", { pair_id: "p1", sort_order: 2 }),
      row("new", { pair_id: "p1", era: "today", sort_order: 3 }),
      row("other", { sort_order: 4 }),
    ]);
    const { pairs, gallery } = arrangeMedia(items);
    expect(pairs.map((pair) => [pair.before.id, pair.after.id])).toEqual([["old", "new"]]);
    expect(gallery.map((item) => item.id)).toEqual(["other"]);
  });

  it("ghép sai (hai ảnh cùng là ảnh xưa) thì không thành cặp, vẫn hiện trong bộ sưu tập", () => {
    const items = toMediaItems([row("x", { pair_id: "p", is_cover: true }), row("y", { pair_id: "p" })]);
    const { pairs, gallery } = arrangeMedia(items);
    expect(pairs).toEqual([]);
    expect(gallery.map((item) => item.id)).toEqual(["y"]);
  });

  it("không có ảnh → không bìa, không cặp", () => {
    expect(arrangeMedia([])).toEqual({ cover: null, pairs: [], gallery: [] });
  });
});

describe("pickCardCover và licenseLabel", () => {
  it("thẻ lấy ảnh bìa, không có bìa thì ảnh thứ tự nhỏ nhất, bỏ qua tài liệu", () => {
    const base = { alt_text: "a", focal_point: null, is_cover: false };
    expect(
      pickCardCover([
        { ...base, file_url: "doc", media_type: "document", sort_order: 0 },
        { ...base, file_url: "b", media_type: "image", sort_order: 2 },
        { ...base, file_url: "c", media_type: "image", sort_order: 1 },
      ])?.url,
    ).toBe("c");
    expect(pickCardCover([])).toBeUndefined();
  });

  it("dịch tên giấy phép thường gặp sang tiếng Việt, giữ nguyên tên CC", () => {
    expect(licenseLabel("Public domain")).toBe("Phạm vi công cộng");
    expect(licenseLabel("CC BY-SA 4.0")).toBe("CC BY-SA 4.0");
    expect(licenseLabel(null)).toBeNull();
  });
});

describe("Hôm nay trong lịch sử", () => {
  const events = [
    { slug: "tuyen-ngon", startDate: "1945-09-02" },
    { slug: "dbp", startDate: "1954-05-07" },
    { slug: "hcm", startDate: "1975-04-30" },
  ];

  it("đúng ngày → kind today, số năm tròn", () => {
    const result = pickOnThisDay(events, { year: 2026, month: 9, day: 2 });
    expect(result).toMatchObject({ kind: "today", distance: 0, day: 2, month: 9 });
    expect(result?.items.map((item) => [item.slug, item.yearsAgo])).toEqual([["tuyen-ngon", 81]]);
  });

  it("không trùng ngày → ngày kỷ niệm gần nhất, vừa qua hoặc sắp tới", () => {
    // 1/5: 30/4 vừa qua 1 ngày, 7/5 còn 6 ngày → chọn 30/4 (vừa qua)
    expect(pickOnThisDay(events, { year: 2026, month: 5, day: 1 })).toMatchObject({ kind: "recent", distance: 1, month: 4, day: 30 });
    const late = pickOnThisDay(events, { year: 2026, month: 9, day: 30 });
    expect(late).toMatchObject({ kind: "recent", distance: 28, month: 9, day: 2 });
    expect(late?.items[0].yearsAgo).toBe(81);
  });

  it("sắp tới qua năm mới: số năm tính theo năm của lần kỷ niệm đó", () => {
    const wrap = pickOnThisDay([{ slug: "paris", startDate: "1973-01-27" }], { year: 2026, month: 12, day: 30 });
    expect(wrap).toMatchObject({ kind: "upcoming", distance: 28 });
    expect(wrap?.items[0].yearsAgo).toBe(54); // 27/1/2027 − 1973
  });

  it("cách đều hai phía thì ưu tiên ngày sắp tới", () => {
    const tie = pickOnThisDay([{ slug: "a", startDate: "1950-06-01" }, { slug: "b", startDate: "1960-06-05" }], { year: 2026, month: 6, day: 3 });
    expect(tie?.items.map((item) => item.slug)).toEqual(["b"]);
  });

  it("không có sự kiện nào có ngày → null", () => {
    expect(pickOnThisDay([], { year: 2026, month: 1, day: 1 })).toBeNull();
  });

  it("ngày hôm nay tính theo giờ Việt Nam (UTC+7)", () => {
    expect(vietnamToday(new Date("2026-09-01T18:30:00Z"))).toEqual({ year: 2026, month: 9, day: 2 });
  });
});
