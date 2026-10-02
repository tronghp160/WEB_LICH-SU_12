// Danh mục GỌN của các chuyên đề tương tác (chỉ slug, tên, mốc thời gian) cho menu và các component chạy ở trình duyệt.
// Không import lib/lessons (dữ liệu đầy đủ gồm cả kịch bản bản đồ) để khỏi kéo hàng chục KB vào mọi trang.
// tests/unit/curriculum.test.ts kiểm tra danh mục này luôn khớp lib/lessons.

export type LessonCatalogEntry = { slug: string; title: string; dateText: string };

export const lessonCatalog: LessonCatalogEntry[] = [
  { slug: "cach-mang-thang-tam-1945", title: "Cách mạng tháng Tám năm 1945", dateText: "14/8 – 2/9/1945" },
  { slug: "chien-dich-dien-bien-phu", title: "Chiến dịch Điện Biên Phủ", dateText: "13/3 – 7/5/1954" },
  { slug: "tet-mau-than-1968", title: "Tổng tiến công và nổi dậy Tết Mậu Thân 1968", dateText: "Xuân Mậu Thân, 1968" },
  { slug: "chien-dich-ho-chi-minh-1975", title: "Chiến dịch Hồ Chí Minh", dateText: "26 – 30/4/1975" },
];
