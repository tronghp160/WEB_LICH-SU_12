import { describe, expect, it } from "vitest";
import {
  buildFilterUrl,
  groupEventsByYear,
  parseTopicFilter,
  pickJumpTargets,
  toggleTopic,
  yearAnchorId,
} from "@/lib/utils/timeline";

const known = ["cach-mang-thang-tam-1945", "khang-chien-chong-phap", "cong-cuoc-doi-moi"];

describe("parseTopicFilter", () => {
  it("trả về mảng rỗng khi không có tham số", () => {
    expect(parseTopicFilter(null, known)).toEqual([]);
    expect(parseTopicFilter(undefined, known)).toEqual([]);
    expect(parseTopicFilter("", known)).toEqual([]);
  });

  it("đọc nhiều slug ngăn cách bằng dấu phẩy", () => {
    expect(parseTopicFilter("khang-chien-chong-phap,cong-cuoc-doi-moi", known)).toEqual([
      "khang-chien-chong-phap",
      "cong-cuoc-doi-moi",
    ]);
  });

  it("bỏ slug lạ, trùng và khoảng trắng thừa", () => {
    expect(parseTopicFilter(" khang-chien-chong-phap ,xyz,,khang-chien-chong-phap", known)).toEqual([
      "khang-chien-chong-phap",
    ]);
  });

  it("không bị đánh lừa bởi thuộc tính của Object.prototype", () => {
    expect(parseTopicFilter("constructor,__proto__,toString", known)).toEqual([]);
  });
});

describe("toggleTopic", () => {
  it("thêm slug chưa có", () => {
    expect(toggleTopic(["a"], "b")).toEqual(["a", "b"]);
  });

  it("bỏ slug đã có, không sửa mảng gốc", () => {
    const original = ["a", "b"];
    expect(toggleTopic(original, "a")).toEqual(["b"]);
    expect(original).toEqual(["a", "b"]);
  });
});

describe("buildFilterUrl", () => {
  it("không có bộ lọc thì chỉ trả về đường dẫn", () => {
    expect(buildFilterUrl("/dong-thoi-gian", [])).toBe("/dong-thoi-gian");
  });

  it("ghép nhiều slug bằng dấu phẩy (không mã hóa)", () => {
    expect(buildFilterUrl("/dong-thoi-gian", ["a", "b"])).toBe("/dong-thoi-gian?chu-de=a,b");
  });
});

describe("groupEventsByYear", () => {
  it("gộp các sự kiện liền nhau cùng năm, giữ thứ tự", () => {
    const events = [
      { startYear: 1945, title: "A" },
      { startYear: 1945, title: "B" },
      { startYear: 1954, title: "C" },
    ];
    expect(groupEventsByYear(events)).toEqual([
      { year: 1945, events: [events[0], events[1]] },
      { year: 1954, events: [events[2]] },
    ]);
  });

  it("danh sách rỗng cho kết quả rỗng", () => {
    expect(groupEventsByYear([])).toEqual([]);
  });
});

describe("pickJumpTargets", () => {
  const groups = [{ year: 1930 }, { year: 1945 }, { year: 1954 }, { year: 1968 }, { year: 1975 }, { year: 1986 }];

  it("chọn đúng nhóm cho từng mốc", () => {
    expect(pickJumpTargets(groups)).toEqual([
      { milestone: 1945, year: 1945 },
      { milestone: 1954, year: 1954 },
      { milestone: 1975, year: 1975 },
      { milestone: 1986, year: 1986 },
    ]);
  });

  it("mốc không có sự kiện thì lấy nhóm gần nhất phía sau", () => {
    expect(pickJumpTargets([{ year: 1950 }, { year: 1968 }], [1945, 1954])).toEqual([
      { milestone: 1945, year: 1950 },
      { milestone: 1954, year: 1968 },
    ]);
  });

  it("bỏ mốc không còn nhóm nào và không lặp cùng một nhóm", () => {
    expect(pickJumpTargets([{ year: 1968 }], [1945, 1954, 1986])).toEqual([
      { milestone: 1945, year: 1968 },
    ]);
  });
});

describe("yearAnchorId", () => {
  it("tạo id neo theo năm", () => {
    expect(yearAnchorId(1954)).toBe("nam-1954");
  });
});
