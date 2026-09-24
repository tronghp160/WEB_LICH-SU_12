import { describe, expect, it } from "vitest";
import {
  eventLinksSchema,
  eventSchema,
  figureSchema,
  isRealDate,
  locationSchema,
  mediaSchema,
  sourceSchema,
  topicSchema,
  validateImageFile,
} from "@/lib/validation/content";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const uuid2 = "223e4567-e89b-42d3-a456-426614174000";

function fieldErrors(result: { success: boolean; error?: { flatten: () => { fieldErrors: unknown } } }) {
  return result.success ? null : (result.error!.flatten().fieldErrors as Record<string, string[]>);
}

const validEvent = {
  topic_id: uuid,
  title: "Chiến dịch Điện Biên Phủ",
  slug: "chien-dich-dien-bien-phu",
  start_year: "1954",
  end_year: "1954",
  start_date: "1954-03-13",
  end_date: "1954-05-07",
  date_text: "13/3 – 7/5/1954",
  date_precision: "period",
  summary: "Tóm tắt.",
  content: "",
  is_featured: "on",
};

describe("isRealDate", () => {
  it("chỉ nhận ngày có thật", () => {
    expect(isRealDate("1954-05-07")).toBe(true);
    expect(isRealDate("2024-02-29")).toBe(true);
    for (const value of ["2023-02-29", "2024-02-31", "2024-13-01", "1954-5-7", "abc", ""]) {
      expect(isRealDate(value), value).toBe(false);
    }
  });
});

describe("topicSchema", () => {
  it("nhận dữ liệu hợp lệ; thứ tự trống → 0", () => {
    const result = topicSchema.safeParse({ name: " Chủ đề A ", slug: "chu-de-a", description: "", sort_order: "" });
    expect(result.success && result.data).toEqual({ name: "Chủ đề A", slug: "chu-de-a", description: null, sort_order: 0 });
  });

  it("slug: chặn chữ hoa, dấu, khoảng trắng, gạch ngang đầu/cuối, gạch đôi", () => {
    for (const slug of ["Chu-De", "chủ-đề", "chu de", "-a", "a-", "a--b", ""]) {
      expect(fieldErrors(topicSchema.safeParse({ name: "A", slug }))?.slug, slug).toBeDefined();
    }
  });

  it("tên bắt buộc, có thông báo tiếng Việt", () => {
    expect(fieldErrors(topicSchema.safeParse({ name: "  ", slug: "a" }))?.name).toEqual(["Vui lòng nhập tên chủ đề."]);
  });
});

describe("eventSchema", () => {
  it("nhận sự kiện hợp lệ", () => {
    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start_year).toBe(1954);
      expect(result.data.is_featured).toBe(true);
      expect(result.data.content).toBeNull();
    }
  });

  it("checkbox vắng mặt → false", () => {
    const rest: Record<string, string> = { ...validEvent };
    delete rest.is_featured;
    const result = eventSchema.safeParse(rest);
    expect(result.success && result.data.is_featured).toBe(false);
  });

  it("phản chiếu CHECK: năm kết thúc < năm bắt đầu", () => {
    const errors = fieldErrors(eventSchema.safeParse({ ...validEvent, end_year: "1953", end_date: "" }));
    expect(errors?.end_year).toEqual(["Năm kết thúc không được nhỏ hơn năm bắt đầu."]);
  });

  it("phản chiếu CHECK: ngày kết thúc trước ngày bắt đầu", () => {
    const errors = fieldErrors(eventSchema.safeParse({ ...validEvent, end_date: "1954-03-01" }));
    expect(errors?.end_date).toEqual(["Ngày kết thúc không được trước ngày bắt đầu."]);
  });

  it("phản chiếu CHECK: năm của ngày bắt đầu phải trùng năm bắt đầu", () => {
    const errors = fieldErrors(eventSchema.safeParse({ ...validEvent, start_date: "1955-03-13", end_year: "", end_date: "" }));
    expect(errors?.start_date).toEqual(["Năm của ngày bắt đầu phải trùng với năm bắt đầu."]);
  });

  it("phản chiếu CHECK: năm của ngày kết thúc phải trùng năm kết thúc", () => {
    const errors = fieldErrors(eventSchema.safeParse({ ...validEvent, end_year: "1955" }));
    expect(errors?.end_date).toEqual(["Năm của ngày kết thúc phải trùng với năm kết thúc."]);
  });

  it("chặn số không nguyên, ký hiệu khoa học, ngoài khoảng", () => {
    for (const start_year of ["19.54", "1e3", "abc", "", "0", "9999"]) {
      expect(fieldErrors(eventSchema.safeParse({ ...validEvent, start_year, start_date: "", end_year: "", end_date: "" }))?.start_year, start_year).toBeDefined();
    }
  });

  it("độ chính xác và chủ đề bắt buộc", () => {
    const errors = fieldErrors(eventSchema.safeParse({ ...validEvent, date_precision: "abc", topic_id: "" }));
    expect(errors?.date_precision).toEqual(["Vui lòng chọn độ chính xác của mốc thời gian."]);
    expect(errors?.topic_id).toEqual(["Vui lòng chọn chủ đề."]);
  });
});

describe("figureSchema", () => {
  const base = { name: "Hồ Chí Minh", slug: "ho-chi-minh" };

  it("năm mất nhỏ hơn năm sinh bị từ chối", () => {
    expect(fieldErrors(figureSchema.safeParse({ ...base, birth_year: "1890", death_year: "1800" }))?.death_year).toEqual([
      "Năm mất không được nhỏ hơn năm sinh.",
    ]);
  });

  it("chỉ có một trong hai năm vẫn hợp lệ", () => {
    expect(figureSchema.safeParse({ ...base, birth_year: "1890", death_year: "" }).success).toBe(true);
  });

  it("ảnh chân dung chỉ nhận http/https, chặn javascript: và data:", () => {
    for (const portrait_url of ["javascript:alert(1)", "data:text/html,<script>", "ftp://a.com/x.jpg", "không phải url"]) {
      expect(fieldErrors(figureSchema.safeParse({ ...base, portrait_url }))?.portrait_url, portrait_url).toBeDefined();
    }
    expect(figureSchema.safeParse({ ...base, portrait_url: "https://commons.wikimedia.org/x.jpg" }).success).toBe(true);
  });
});

describe("locationSchema", () => {
  const base = { name: "Huế", slug: "hue", accuracy_level: "region" };

  it("cho phép bỏ trống cả hai tọa độ", () => {
    const result = locationSchema.safeParse({ ...base, latitude: "", longitude: "" });
    expect(result.success && [result.data.latitude, result.data.longitude]).toEqual([null, null]);
  });

  it("chấp nhận dấu phẩy thập phân và làm tròn 6 chữ số", () => {
    const result = locationSchema.safeParse({ ...base, latitude: "16,4637123456", longitude: "107.5909" });
    expect(result.success && result.data.latitude).toBe(16.463712);
  });

  it("chỉ có một tọa độ bị từ chối (khớp CHECK)", () => {
    expect(fieldErrors(locationSchema.safeParse({ ...base, latitude: "16.4", longitude: "" }))?.longitude).toBeDefined();
    expect(fieldErrors(locationSchema.safeParse({ ...base, latitude: "", longitude: "107.5" }))?.latitude).toBeDefined();
  });

  it("tọa độ ngoài khoảng bị từ chối", () => {
    expect(fieldErrors(locationSchema.safeParse({ ...base, latitude: "100", longitude: "107" }))?.latitude).toBeDefined();
    expect(fieldErrors(locationSchema.safeParse({ ...base, latitude: "16", longitude: "181" }))?.longitude).toBeDefined();
    expect(fieldErrors(locationSchema.safeParse({ ...base, latitude: "abc", longitude: "1e2" }))).not.toBeNull();
  });

  it("bắt buộc chọn độ chính xác (không tự mặc định)", () => {
    expect(fieldErrors(locationSchema.safeParse({ ...base, accuracy_level: "" }))?.accuracy_level).toEqual([
      "Vui lòng chọn độ chính xác của tọa độ.",
    ]);
  });
});

describe("sourceSchema", () => {
  const base = { title: "SGK Lịch sử 12", citation: "SGK, NXB GD, 2024", source_type: "book" };

  it("nguồn sách hợp lệ không cần ngày truy cập", () => {
    expect(sourceSchema.safeParse(base).success).toBe(true);
  });

  it("nguồn trang web bắt buộc có ngày truy cập", () => {
    expect(fieldErrors(sourceSchema.safeParse({ ...base, source_type: "web" }))?.accessed_at).toEqual([
      "Nguồn trang web phải có ngày truy cập.",
    ]);
    expect(sourceSchema.safeParse({ ...base, source_type: "web", accessed_at: "2026-09-24" }).success).toBe(true);
  });

  it("trích dẫn bắt buộc; URL chỉ nhận http/https", () => {
    expect(fieldErrors(sourceSchema.safeParse({ ...base, citation: "" }))?.citation).toBeDefined();
    expect(fieldErrors(sourceSchema.safeParse({ ...base, url: "javascript:alert(1)" }))?.url).toBeDefined();
    expect(sourceSchema.safeParse({ ...base, url: "https://vi.wikipedia.org/wiki/X" }).success).toBe(true);
  });
});

describe("eventLinksSchema", () => {
  const empty = { figures: [], locations: [], sources: [] };

  it("nhận bộ liên kết hợp lệ", () => {
    const result = eventLinksSchema.safeParse({
      figures: [{ figure_id: uuid, relationship: "Chỉ huy" }],
      locations: [{ location_id: uuid, location_role: "", is_primary: true }],
      sources: [{ source_id: uuid, source_note: null, confidence_note: null }],
    });
    expect(result.success).toBe(true);
  });

  it("từ chối nhiều hơn một địa điểm chính (khớp partial unique index)", () => {
    const result = eventLinksSchema.safeParse({
      ...empty,
      locations: [
        { location_id: uuid, location_role: null, is_primary: true },
        { location_id: uuid2, location_role: null, is_primary: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("từ chối gắn trùng một nhân vật/địa điểm/nguồn", () => {
    expect(
      eventLinksSchema.safeParse({ ...empty, figures: [{ figure_id: uuid, relationship: null }, { figure_id: uuid, relationship: null }] }).success,
    ).toBe(false);
    expect(
      eventLinksSchema.safeParse({ ...empty, sources: [{ source_id: uuid, source_note: null, confidence_note: null }, { source_id: uuid, source_note: null, confidence_note: null }] }).success,
    ).toBe(false);
  });

  it("từ chối id không phải UUID", () => {
    expect(eventLinksSchema.safeParse({ ...empty, figures: [{ figure_id: "abc", relationship: null }] }).success).toBe(false);
  });
});

describe("mediaSchema", () => {
  const base = { event_id: uuid, file_url: "https://example.com/a.jpg", alt_text: "Ảnh tư liệu", caption: "", source_id: "" };

  it("nhận media hợp lệ, chú thích/nguồn trống → null", () => {
    const result = mediaSchema.safeParse(base);
    expect(result.success && [result.data.caption, result.data.source_id]).toEqual([null, null]);
  });

  it("bắt buộc chữ thay thế (alt_text)", () => {
    expect(fieldErrors(mediaSchema.safeParse({ ...base, alt_text: "  " }))?.alt_text).toBeDefined();
  });

  it("địa chỉ ảnh chỉ nhận http/https", () => {
    expect(fieldErrors(mediaSchema.safeParse({ ...base, file_url: "javascript:alert(1)" }))?.file_url).toBeDefined();
  });
});

describe("validateImageFile", () => {
  it("nhận JPG/PNG/WebP dưới 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("từ chối định dạng khác, tệp quá lớn hoặc rỗng", () => {
    expect(validateImageFile({ type: "image/gif", size: 1024 })).toContain("JPG, PNG hoặc WebP");
    expect(validateImageFile({ type: "image/svg+xml", size: 1024 })).not.toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1024 })).not.toBeNull();
    expect(validateImageFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toContain("5 MB");
    expect(validateImageFile({ type: "image/png", size: 0 })).not.toBeNull();
  });
});
