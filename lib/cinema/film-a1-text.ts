import type { Chapter, FactLabel, Subtitle } from "@/lib/cinema/types";

// Phần chữ của phim "Đồi A1, đêm 6/5/1954": nhẹ, dùng được ở phía máy chủ (transcript, poster) mà không nạp cả kịch bản 3D.
// TODO: đối chiếu chiều dài đường hầm (~45 m), khối bộc phá (~1 tấn), mốc 20 giờ 30 phút và "rạng sáng 7/5" với SGK/tài liệu chính thống.

export const FILM_TITLE = "Đồi A1, đêm 6/5/1954";
export const FILM_DURATION = 110;
export const FILM_BLAST_TIME = 48;

/** Lời thuyết minh (cũng là phụ đề). Mỗi câu dài đủ để đọc/nghe được (~4 từ/giây). */
export const subtitles: Subtitle[] = [
  { t0: 1.0, t1: 11.0, text: "Điện Biên Phủ, đêm 6 tháng 5 năm 1954. Sau hơn năm mươi ngày đêm chiến đấu, đồi A1 vẫn là cứ điểm cuối cùng chặn bước quân ta tiến vào trung tâm Mường Thanh." },
  { t0: 12.0, t1: 22.5, text: "Đồi A1, người Pháp gọi là Éliane 2, nằm ngay phía đông sở chỉ huy của tướng Đờ Cát. Hai bên giành giật từng tấc chiến hào, có nơi chỉ cách nhau vài chục mét." },
  { t0: 24.2, t1: 35.8, text: "Nhiều đợt xung phong bị chặn lại bởi các hỏa điểm kiên cố. Bộ đội ta quyết định đào một đường hầm dài khoảng bốn mươi lăm mét dưới chân đồi, đặt khối bộc phá gần một tấn ngay dưới hầm chỉ huy của địch." },
  { t0: 37.5, t1: 46.5, text: "Hai mươi giờ ba mươi phút, ngày sáu tháng năm. Trong chiến hào, các chiến sĩ nín thở chờ hiệu lệnh." },
  { t0: 50.5, t1: 57.5, text: "Khối bộc phá nổ tung. Trận địa địch trên đỉnh đồi bị xóa sổ trong chớp mắt." },
  { t0: 58.5, t1: 68.0, text: "Bộ binh ta ào lên xung phong, đánh chiếm từng công sự và đẩy lùi các đợt phản kích của địch." },
  { t0: 70.0, t1: 80.0, text: "Cuộc chiến đấu diễn ra ác liệt trong những đoạn hào chật hẹp, có lúc phải đánh giáp lá cà." },
  { t0: 86.0, t1: 94.5, text: "Rạng sáng ngày bảy tháng năm, quân ta làm chủ hoàn toàn đồi A1." },
  { t0: 96.0, t1: 108.5, text: "Chiếm được A1, bộ đội ta mở đường tiến vào sở chỉ huy tập đoàn cứ điểm. Chiều hôm đó, chiến dịch Điện Biên Phủ toàn thắng." },
];

export const chapters: Chapter[] = [
  { t: 0, title: "Mường Thanh", clock: "Đêm 6/5/1954" },
  { t: 12, title: "Đồi A1 (Éliane 2)" },
  { t: 24, title: "Đường hầm dưới chân đồi" },
  { t: 36, title: "Giờ G", clock: "20 giờ 30 phút" },
  { t: 47, title: "Bộc phá" },
  { t: 58, title: "Xung phong" },
  { t: 76, title: "Giáp lá cà" },
  { t: 86, title: "Rạng sáng", clock: "7/5/1954" },
];

export const labels: FactLabel[] = [
  { t0: 0.5, t1: 9, position: [-551, 30, -200], text: "Sở chỉ huy De Castries" },
  { t0: 17, t1: 24, position: [0, 46, 0], text: "Đồi A1 (Éliane 2)" },
  { t0: 28, t1: 35.5, position: [8, 37, 4], text: "Đường hầm dài khoảng 45 m" },
  { t0: 29, t1: 35.5, position: [-20, 36, 4], text: "Khối bộc phá gần 1 tấn" },
];
