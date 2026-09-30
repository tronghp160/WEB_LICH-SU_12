import { dienBienPhu1954 } from "@/lib/battles/dien-bien-phu-1954";
import type { Lesson } from "@/lib/lessons/types";

// Bài học tương tác: Chiến dịch Điện Biên Phủ 1954. Nội dung VIẾT LẠI theo khung SGK Lịch sử 12 (Kết nối tri thức),
// không chép nguyên văn sách. Ảnh đã kiểm tra giấy phép trên Wikimedia Commons (24/9/2026), tải về public/lessons/dien-bien-phu.
// Video: nhúng YouTube từ kênh truyền hình chính thống, đã xác minh bằng oEmbed (cho phép nhúng) ngày 24/9/2026.

const PHOTO = "/lessons/dien-bien-phu";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const DE_CASTRIES_PORTRAIT = {
  src: `${PHOTO}/de-castries.webp`,
  alt: "Chân dung đại tá Christian de Castries năm 1954",
  caption: "Christian de Castries, 1954.",
  credit: "Không rõ tác giả, phạm vi công cộng",
  sourceUrl: `${COMMONS}Dien_Bien_Phu001.jpg`,
};

const HAM_DE_CASTRIES_NAY = {
  src: `${PHOTO}/ham-de-castries-nay.webp`,
  alt: "Hầm chỉ huy của De Castries được bảo tồn, có mái vòm bằng thép",
  caption: "Hầm chỉ huy tập đoàn cứ điểm ngày nay (2022).",
  credit: "Ioe2015, CC BY 4.0",
  sourceUrl: `${COMMONS}H%E1%BA%A7m_ch%E1%BB%89_huy_t%E1%BA%ADp_%C4%91o%C3%A0n_c%E1%BB%A9_%C4%91i%E1%BB%83m_%C4%90i%E1%BB%87n_Bi%C3%AAn_Ph%E1%BB%A7_(2022).jpg`,
};

export const dienBienPhuLesson: Lesson = {
  slug: "chien-dich-dien-bien-phu",
  eventSlug: "chien-dich-dien-bien-phu",
  title: "Chiến dịch Điện Biên Phủ",
  dateText: "13/3 – 7/5/1954",
  tagline: "56 ngày đêm \"khoét núi, ngủ hầm, mưa dầm, cơm vắt\" làm nên chiến thắng \"lừng lẫy năm châu, chấn động địa cầu\".",
  hero: {
    src: `${PHOTO}/cam-co-ham-de-castries.webp`,
    alt: "Chiến sĩ Quân đội nhân dân Việt Nam cắm cờ trên nóc hầm chỉ huy của Pháp ở Điện Biên Phủ",
    // Cảnh quay dựng lại: theo báo Nhân Dân (trích nhật ký Roman Karmen), các cảnh tấn công hầm De Castries được quay sau chiến dịch.
    caption:
      "Lá cờ \"Quyết chiến, Quyết thắng\" trên nóc hầm De Castries. Cảnh dựng lại: đoàn làm phim của Roman Karmen (Liên Xô) quay lại sau khi chiến dịch kết thúc (7/5/1954).",
    // Commons gắn PD-Vietnam nhưng ảnh 1954 tới 2026 mới ~72 năm (< 75 năm bảo hộ) — không ghi "phạm vi công cộng" như sự thật đã chắc.
    credit: "Quân đội nhân dân Việt Nam, qua Wikimedia Commons (Commons ghi phạm vi công cộng tại Việt Nam; nhãn này đang được xem lại)",
    sourceUrl: `${COMMONS}Victory_in_Battle_of_Dien_Bien_Phu.jpg`,
  },
  heroStats: [
    { value: 56, label: "ngày đêm chiến đấu" },
    { value: 49, label: "cứ điểm của địch" },
    { value: 16200, label: "quân địch bị loại khỏi vòng chiến đấu" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài: Cuộc kháng chiến chống thực dân Pháp (1945–1954)",
    objectives: [
      "Trình bày được bối cảnh: kế hoạch Nava và lý do Pháp xây dựng Điện Biên Phủ thành tập đoàn cứ điểm.",
      "Nêu được chủ trương, sự chuẩn bị và phương châm \"đánh chắc, tiến chắc\" của ta.",
      "Mô tả được diễn biến chính của ba đợt tiến công trên bản đồ.",
      "Nêu được kết quả và ý nghĩa lịch sử của chiến thắng Điện Biên Phủ.",
    ],
  },
  keyDates: [
    { date: "20/11/1953", text: "Pháp nhảy dù chiếm Điện Biên Phủ" },
    { date: "6/12/1953", text: "Bộ Chính trị quyết định mở chiến dịch" },
    { date: "26/1/1954", text: "Chuyển sang phương châm \"đánh chắc, tiến chắc\"" },
    { date: "13/3/1954", text: "Nổ súng đánh Him Lam — mở đầu đợt 1" },
    { date: "30/3/1954", text: "Mở đợt 2: đánh các điểm cao phía đông" },
    { date: "1/5/1954", text: "Mở đợt 3: tổng công kích" },
    { date: "7/5/1954", text: "Bắt sống De Castries — toàn thắng" },
    { date: "21/7/1954", text: "Ký Hiệp định Giơnevơ về Đông Dương" },
  ],
  battle: dienBienPhu1954,
  mapFilm: "dien-bien-phu",
  models3d: {
    soLieu: ["sa-ban-chien-thang"],
    nhanVat: ["tuong-vo-nguyen-giap", "tuong-de-castries", "tuong-phan-dinh-giot", "tuong-to-vinh-dien"],
    hienVat: ["luu-phao-105", "xe-dap-tho", "chien-si", "may-bay-c47"],
    diTich: ["ham-de-castries", "duong-ham-a1", "chien-hao-a1"],
  },
  cinema: {
    href: "/phim-3d/doi-a1",
    title: "Đồi A1, đêm 6/5/1954",
    description:
      "Xem trận đánh đồi A1 diễn ra như một thước phim 3D trên địa hình lòng chảo thật: đường hầm bộc phá, vụ nổ, bộ đội xung phong, rạng sáng cắm cờ. Có âm thanh, thuyết minh tiếng Việt và phụ đề.",
    posterSrc: "/lessons/dien-bien-phu/ho-boc-pha-a1.webp",
    posterAlt: "Hố bộc phá trên đồi A1 ngày nay",
  },
  videos: [
    {
      youtubeId: "qvE5Zd9kHPY",
      title: "Điện Biên Phủ 1954: 56 ngày đêm làm nên chiến thắng \"chấn động địa cầu\"",
      channel: "QPVN — Truyền hình Quốc phòng Việt Nam",
      note: "Toàn cảnh chiến dịch — xem sau khi học xong phần diễn biến.",
    },
    {
      youtubeId: "JJVn9hFeaPE",
      title: "Điện Biên Phủ sức mạnh lòng dân — Tập 1: Tay không kéo pháo",
      channel: "THVL Tổng Hợp (Truyền hình Vĩnh Long)",
      note: "Gắn với bước \"Ta chuẩn bị\": kéo pháo, dân công hỏa tuyến.",
    },
    {
      youtubeId: "kPpJD6UzSPU",
      title: "Điện Biên Phủ — Cuộc chiến vì hòa bình",
      channel: "VTV4",
      note: "Ý nghĩa quốc tế của chiến thắng.",
    },
  ],
  results: [
    { value: 16200, label: "quân địch bị loại khỏi vòng chiến đấu" },
    { value: 62, label: "máy bay bị bắn rơi và phá hủy" },
    { value: 56, label: "ngày đêm chiến đấu liên tục" },
  ],
  significance: [
    {
      title: "Đập tan kế hoạch Nava",
      text: "Tập đoàn cứ điểm mạnh nhất Đông Dương bị tiêu diệt hoàn toàn, kế hoạch quân sự lớn nhất của Pháp có Mỹ giúp sức bị phá sản.",
    },
    {
      title: "Xoay chuyển cục diện chiến tranh",
      text: "Chiến thắng giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp, buộc Pháp phải tính đến việc kết thúc chiến tranh.",
    },
    {
      title: "Tạo thế cho Hội nghị Giơnevơ",
      text: "Thắng lợi trên chiến trường tạo cơ sở cho cuộc đấu tranh ngoại giao, dẫn tới việc ký Hiệp định Giơnevơ ngày 21/7/1954.",
    },
    {
      title: "Cổ vũ phong trào giải phóng dân tộc",
      text: "Điện Biên Phủ trở thành biểu tượng, cổ vũ nhân dân các nước thuộc địa đứng lên đấu tranh giành độc lập.",
    },
  ],
  quote: {
    text: "Chín năm làm một Điện Biên\nNên vành hoa đỏ, nên thiên sử vàng!",
    author: "Tố Hữu, \"Ba mươi năm đời ta có Đảng\"",
  },
  figures: [
    {
      name: "Võ Nguyên Giáp",
      role: "Đại tướng, Chỉ huy trưởng chiến dịch",
      text: "Người đưa ra quyết định khó khăn nhất đời cầm quân: hoãn trận đánh đã chuẩn bị, chuyển từ \"đánh nhanh, giải quyết nhanh\" sang \"đánh chắc, tiến chắc\".",
      href: "/nhan-vat/vo-nguyen-giap",
    },
    {
      name: "Christian de Castries",
      role: "Chỉ huy tập đoàn cứ điểm của Pháp",
      text: "Được thăng hàm thiếu tướng khi đang bị vây. Chiều 7/5/1954 bị bắt sống cùng toàn bộ Bộ tham mưu trong hầm chỉ huy.",
      image: DE_CASTRIES_PORTRAIT,
    },
    {
      name: "Phan Đình Giót",
      role: "Anh hùng Lực lượng vũ trang nhân dân",
      text: "Trong trận Him Lam ngày 13/3/1954, anh lấy thân mình lấp lỗ châu mai của địch để đồng đội xung phong.",
    },
    {
      name: "Tô Vĩnh Diện",
      role: "Anh hùng Lực lượng vũ trang nhân dân",
      text: "Hy sinh khi lấy thân mình chèn bánh xe, giữ khẩu pháo không lao xuống vực trên đường kéo pháo.",
    },
  ],
  flashcards: [
    { question: "Kế hoạch quân sự nào của Pháp bị chiến thắng Điện Biên Phủ đập tan?", answer: "Kế hoạch Nava (1953–1954)." },
    { question: "Tập đoàn cứ điểm Điện Biên Phủ gồm bao nhiêu cứ điểm, chia mấy phân khu?", answer: "49 cứ điểm, chia thành 3 phân khu: Bắc, Trung tâm (Mường Thanh) và Nam (Hồng Cúm)." },
    { question: "Ngày 26/1/1954, ta thay đổi phương châm tác chiến như thế nào?", answer: "Từ \"đánh nhanh, giải quyết nhanh\" chuyển sang \"đánh chắc, tiến chắc\"." },
    { question: "Trận mở màn chiến dịch diễn ra ở đâu, ngày nào?", answer: "Cụm cứ điểm Him Lam, chiều 13/3/1954." },
    { question: "Đợt 2 của chiến dịch tập trung đánh vào đâu?", answer: "Các điểm cao phía đông phân khu Trung tâm: E1, D1, C1, A1." },
    { question: "Chiến dịch kết thúc thắng lợi khi nào?", answer: "Chiều 7/5/1954, tướng De Castries và Bộ tham mưu bị bắt sống." },
  ],
  quiz: [
    {
      question: "Chiến thắng Điện Biên Phủ đã đập tan kế hoạch quân sự nào của Pháp (có Mỹ giúp sức)?",
      choices: ["Kế hoạch Nava", "Kế hoạch Rơve", "Kế hoạch Đờ Lát đơ Tátxinhi", "Kế hoạch Bôlae"],
      correct: 0,
      explanation: "Tập đoàn cứ điểm mạnh nhất Đông Dương bị tiêu diệt hoàn toàn, kế hoạch Nava — kế hoạch quân sự lớn nhất của Pháp có Mỹ giúp sức — bị phá sản.",
    },
    {
      question: "Quyết định chuyển sang phương châm \"đánh chắc, tiến chắc\" được đưa ra ngày nào?",
      choices: ["26/1/1954", "6/12/1953", "13/3/1954", "20/11/1953"],
      correct: 0,
      explanation: "Ngày 26/1/1954, ta chuyển từ \"đánh nhanh, giải quyết nhanh\" sang \"đánh chắc, tiến chắc\". Ngày 6/12/1953 là ngày Bộ Chính trị quyết định mở chiến dịch; 13/3/1954 là ngày nổ súng.",
    },
    {
      question: "Chiều 13/3/1954, quân ta nổ súng mở màn chiến dịch bằng trận đánh vào đâu?",
      choices: ["Cụm cứ điểm Him Lam", "Đồi A1", "Phân khu Nam (Hồng Cúm)", "Sở chỉ huy Mường Thanh"],
      correct: 0,
      explanation: "Chiều 13/3/1954, ta nổ súng đánh cụm cứ điểm Him Lam, mở đầu đợt 1. Đợt 1 tiêu diệt Him Lam và toàn bộ phân khu Bắc.",
    },
    {
      question: "Đợt 2 của chiến dịch (từ 30/3/1954) tập trung đánh vào đâu?",
      choices: [
        "Các điểm cao phía đông phân khu Trung tâm (E1, D1, C1, A1)",
        "Phân khu Nam (Hồng Cúm)",
        "Cụm cứ điểm Him Lam",
        "Các sân bay ở Hà Nội",
      ],
      correct: 0,
      explanation: "Đợt 2 đánh các điểm cao phía đông phân khu Trung tâm: E1, D1, C1, A1; chiến đấu giằng co ác liệt nhất ở đồi A1.",
    },
    {
      question: "Người trong ảnh chỉ huy tập đoàn cứ điểm Điện Biên Phủ và bị bắt sống chiều 7/5/1954. Đó là ai?",
      image: DE_CASTRIES_PORTRAIT,
      choices: ["Christian de Castries", "Henri Navarre", "Raoul Salan", "René Cogny"],
      correct: 0,
      explanation: "Christian de Castries được thăng hàm thiếu tướng khi đang bị vây; chiều 7/5/1954 bị bắt sống cùng toàn bộ Bộ tham mưu trong hầm chỉ huy. Henri Navarre là tác giả kế hoạch Nava.",
    },
    {
      question: "Anh hùng nào hy sinh khi lấy thân mình chèn bánh xe, giữ khẩu pháo không lao xuống vực?",
      choices: ["Tô Vĩnh Diện", "Phan Đình Giót", "Bế Văn Đàn", "Bùi Quang Thận"],
      correct: 0,
      explanation: "Tô Vĩnh Diện hy sinh trên đường kéo pháo khi lấy thân mình chèn bánh xe. Phan Đình Giót là người lấy thân mình lấp lỗ châu mai trong trận Him Lam.",
    },
    {
      question: "Công trình trong ảnh, được bảo tồn ở Điện Biên Phủ ngày nay, là gì?",
      image: HAM_DE_CASTRIES_NAY,
      choices: ["Hầm chỉ huy của De Castries", "Hố bộc phá trên đồi A1", "Tượng đài Chiến thắng trên đồi D1", "Nghĩa trang liệt sĩ A1"],
      correct: 0,
      explanation: "Đây là hầm chỉ huy tập đoàn cứ điểm của De Castries, có mái vòm bằng thép, nay được bảo tồn cho khách tham quan.",
    },
    {
      question: "Chiến dịch Điện Biên Phủ đã loại khỏi vòng chiến đấu khoảng bao nhiêu quân địch?",
      choices: ["16.200", "6.200", "26.000", "49.000"],
      correct: 0,
      explanation: "Ta loại khỏi vòng chiến đấu khoảng 16.200 quân địch, bắn rơi và phá hủy 62 máy bay sau 56 ngày đêm chiến đấu.",
    },
  ],
  today: [
    HAM_DE_CASTRIES_NAY,
    {
      src: `${PHOTO}/ho-boc-pha-a1.webp`,
      alt: "Hố sâu trên đồi A1 do khối bộc phá tạo ra",
      caption: "Hố bộc phá trên đồi A1 — dấu tích vụ nổ đêm 6/5/1954.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}Crater_Left_by_Vietminh_Dynamite_Blast_-_Hill_A1_(Eliane_2)_-_Dien_Bien_Phu_-_Vietnam_(48168795271).jpg`,
    },
    {
      src: `${PHOTO}/chien-hao-a1.webp`,
      alt: "Chiến hào được bảo tồn trên đồi A1",
      caption: "Chiến hào trên đồi A1 được bảo tồn.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}French_Trenches_at_Hill_A1_(Eliane_2)_-_Dien_Bien_Phu_-_Vietnam_-_02_(48168793656).jpg`,
    },
    {
      src: `${PHOTO}/tuong-dai-d1.webp`,
      alt: "Phù điêu tại tượng đài Chiến thắng trên đồi D1",
      caption: "Phù điêu ở tượng đài Chiến thắng Điện Biên Phủ trên đồi D1.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}Frieze_Showing_French_Surrender_in_May_1954_-_Hill_D1_(Victory_Monument)_-_Dien_Bien_Phu_-_Vietnam_(48168819157).jpg`,
    },
  ],
  toVerify: [
    "Số bài và số trang trong SGK Lịch sử 12 Kết nối tri thức.",
    "49 cứ điểm, 3 phân khu; quân số lúc cao nhất 16.200.",
    "Kết quả: loại khỏi vòng chiến đấu 16.200 địch, bắn rơi và phá hủy 62 máy bay.",
    "Các ngày của ba đợt: 13/3–17/3, 30/3–26/4, 1/5–7/5/1954.",
    "Khối bộc phá ở đồi A1 \"gần 1 tấn\".",
    "Cách viết \"Giơnevơ\" hay \"Genève\" theo đúng bộ sách.",
    "Câu thơ Tố Hữu và tên bài thơ.",
    "Phim 3D đồi A1: đường hầm ~45 m, khối bộc phá ~1 tấn, mốc 20 giờ 30 phút ngày 6/5, và \"rạng sáng 7/5\" làm chủ A1; vị trí công sự và số lượng nhân vật là minh họa.",
  ],
};
