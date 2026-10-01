import { chienDichHoChiMinh1975 } from "@/lib/battles/chien-dich-ho-chi-minh-1975";
import type { Lesson, LessonImage } from "@/lib/lessons/types";

// Chuyên đề tương tác: Chiến dịch Hồ Chí Minh (26 – 30/4/1975) — GĐ7 nâng cấp giao diện. Nội dung VIẾT LẠI theo khung SGK
// Lịch sử 12 (Kết nối tri thức), Bài 8, không chép nguyên văn sách. Ảnh đã kiểm tra giấy phép trên Wikimedia Commons
// (1/10/2026): ảnh di tích ngày nay CC BY / CC BY-SA, ảnh cuộc di tản năm 1975 của Thủy quân lục chiến Mỹ (phạm vi công cộng).
// Không dùng ảnh báo chí năm 1975 của các hãng thông tấn (còn bản quyền). Video: kênh VTV24, đã xác minh bằng oEmbed ngày 1/10/2026.

const PHOTO = "/lessons/chien-dich-ho-chi-minh";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const XE_TANG_390: LessonImage = {
  src: `${PHOTO}/xe-tang-390-dinh-doc-lap.webp`,
  alt: "Xe tăng T-54 sơn số 390 đỗ dưới tán cây cổ thụ trong khuôn viên Dinh Độc Lập",
  caption: "Xe tăng mang số hiệu 390 trong khuôn viên Dinh Độc Lập ngày nay (xe cùng loại; xe nguyên bản lưu giữ tại Hà Nội) — ảnh năm 2023.",
  credit: "源義信, CC BY 4.0",
  sourceUrl: `${COMMONS}2023-12-10_T-54_tank_No._390_at_the_Independence_Palace,_Saigon_01.jpg`,
};

const XE_TANG_843: LessonImage = {
  src: `${PHOTO}/xe-tang-843-dinh-doc-lap.webp`,
  alt: "Xe tăng T-54 sơn số 843 trưng bày trên bãi cỏ trong khuôn viên Dinh Độc Lập",
  caption: "Xe tăng mang số hiệu 843 trong khuôn viên Dinh Độc Lập (xe cùng loại; xe nguyên bản lưu giữ tại Hà Nội) — ảnh năm 2023.",
  credit: "源義信, CC BY 4.0",
  sourceUrl: `${COMMONS}2023-12-10_T-54_tank_No._843_at_the_Independence_Palace,_Saigon_01.jpg`,
};

const DINH_THONG_NHAT: LessonImage = {
  src: `${PHOTO}/dinh-thong-nhat.webp`,
  alt: "Mặt tiền tòa nhà Dinh Thống Nhất màu trắng, nhiều tầng, phía trước là bãi cỏ và đài phun nước",
  caption: "Dinh Độc Lập — nay là Hội trường Thống Nhất — nhìn từ phía đại lộ (ảnh năm 2009).",
  credit: "Eustaquio Santimano, CC BY 2.0",
  sourceUrl: `${COMMONS}Reunification_Palace,_Ho_Chi_Minh_City,_Vietnam.jpg`,
};

const BAO_TANG: LessonImage = {
  src: `${PHOTO}/bao-tang-chien-dich.webp`,
  alt: "Tòa nhà Bảo tàng Chiến dịch Hồ Chí Minh, phía trước trưng bày xe tăng và pháo",
  caption: "Bảo tàng Chiến dịch Hồ Chí Minh (TP. Hồ Chí Minh), nơi trưng bày về năm cánh quân và diễn biến chiến dịch (ảnh năm 2012).",
  credit: "HappyMidnight, CC BY-SA 3.0",
  sourceUrl: `${COMMONS}Museum_of_Ho_Chi_Minh_Campaign.JPG`,
};

const MAY_BAY_A37: LessonImage = {
  src: `${PHOTO}/may-bay-a37-bao-tang.webp`,
  alt: "Máy bay phản lực cường kích nhỏ A-37 sơn màu ngụy trang đặt trên sân bảo tàng",
  caption: "Máy bay A-37 trưng bày tại Bảo tàng Chiến dịch Hồ Chí Minh — cùng loại với máy bay Phi đội Quyết thắng dùng ném bom sân bay Tân Sơn Nhất ngày 28/4/1975 (ảnh năm 2012).",
  credit: "HappyMidnight, CC BY-SA 3.0",
  sourceUrl: `${COMMONS}A-37_Dragonfly_at_Museum_of_Ho_Chi_Minh_Campaign,_HCMC,_Vietnam.JPG`,
};

export const chienDichHoChiMinhLesson: Lesson = {
  slug: "chien-dich-ho-chi-minh-1975",
  eventSlug: "chien-dich-ho-chi-minh",
  title: "Chiến dịch Hồ Chí Minh",
  dateText: "26 – 30/4/1975",
  tagline: "Năm cánh quân thần tốc tiến vào Sài Gòn; trưa 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập — miền Nam hoàn toàn giải phóng, đất nước thống nhất.",
  copy: {
    cardDescription: "Bản đồ năm cánh quân tiến vào Sài Gòn từng ngày, ảnh di tích ngày nay, video VTV24, thẻ ghi nhớ và trắc nghiệm.",
    mapTitle: "Xem năm cánh quân tiến vào Sài Gòn",
    mapHint: "Bản đồ đi từ toàn cảnh miền Nam tháng 3/1975 vào Sài Gòn; mục tiêu nào quân ta làm chủ sẽ chuyển từ ô xanh sang ô đỏ sao vàng.",
    videoTitle: "Video tư liệu",
    resultsTitle: "Vì sao chiến thắng mùa Xuân 1975 có ý nghĩa to lớn?",
    todayTitle: "Những địa danh lịch sử ngày nay",
  },
  hero: XE_TANG_390,
  heroStats: [
    { value: 5, label: "cánh quân đồng loạt tiến vào Sài Gòn" },
    { value: 3, label: "chiến dịch lớn của cuộc Tổng tiến công và nổi dậy mùa Xuân 1975" },
    { value: 21, label: "năm kháng chiến chống Mỹ, cứu nước (1954 – 1975)" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)",
    objectives: [
      "Nêu được bối cảnh, chủ trương giải phóng miền Nam và thời cơ chiến lược đầu năm 1975.",
      "Trình bày được diễn biến chính của Chiến dịch Hồ Chí Minh trên bản đồ: năm cánh quân, các mục tiêu then chốt, thời khắc 11 giờ 30 phút ngày 30/4/1975.",
      "Phân tích được ý nghĩa lịch sử của thắng lợi cuộc kháng chiến chống Mỹ, cứu nước.",
    ],
  },
  keyDates: [
    { date: "10/3/1975", text: "Trận Buôn Ma Thuột mở màn chiến dịch Tây Nguyên" },
    { date: "26/3/1975", text: "Huế được giải phóng" },
    { date: "29/3/1975", text: "Đà Nẵng được giải phóng" },
    { date: "14/4/1975", text: "Bộ Chính trị đặt tên \"Chiến dịch Hồ Chí Minh\"" },
    { date: "21/4/1975", text: "Tuyến phòng thủ Xuân Lộc bị phá vỡ" },
    { date: "26/4/1975", text: "17 giờ: Chiến dịch Hồ Chí Minh bắt đầu" },
    { date: "30/4/1975", text: "11 giờ 30 phút: cờ cách mạng trên nóc Dinh Độc Lập" },
    { date: "2/5/1975", text: "Châu Đốc được giải phóng — miền Nam hoàn toàn giải phóng" },
  ],
  battle: chienDichHoChiMinh1975,
  videos: [
    {
      youtubeId: "TnQYFiXX1Zg",
      title: "Chiến dịch Hồ Chí Minh trong 4 phút",
      channel: "VTV24",
      note: "Tóm tắt toàn bộ chiến dịch — xem trước hoặc sau phần bản đồ.",
    },
    {
      youtubeId: "bPwhnZWX-5k",
      title: "51 năm Ngày Giải phóng miền Nam, thống nhất đất nước",
      channel: "VTV24",
      note: "Phóng sự nhân dịp kỉ niệm ngày 30/4 — liên hệ với ý nghĩa của chiến thắng.",
    },
  ],
  results: [
    { value: 5, label: "cánh quân cùng tiến vào trung tâm Sài Gòn" },
    { value: 30, label: "năm chiến tranh giải phóng dân tộc (1945 – 1975) khép lại" },
    { value: 21, label: "năm kháng chiến chống Mỹ, cứu nước kết thúc thắng lợi" },
  ],
  significance: [
    {
      title: "Kết thúc 21 năm kháng chiến chống Mỹ, cứu nước",
      text: "Thắng lợi kết thúc 21 năm chiến đấu chống Mỹ, cứu nước và 30 năm chiến tranh giải phóng dân tộc, bảo vệ Tổ quốc (1945 – 1975); chấm dứt ách thống trị của chủ nghĩa đế quốc trên đất nước ta.",
    },
    {
      title: "Hoàn thành cách mạng dân tộc dân chủ, thống nhất đất nước",
      text: "Miền Nam hoàn toàn giải phóng, cả nước thống nhất về lãnh thổ, tạo cơ sở để thống nhất về nhà nước và cùng đi lên chủ nghĩa xã hội.",
    },
    {
      title: "Mở ra kỉ nguyên mới của dân tộc",
      text: "Đất nước bước vào kỉ nguyên độc lập, thống nhất, cả nước đi lên chủ nghĩa xã hội; nâng cao vị thế của Việt Nam trên trường quốc tế.",
    },
    {
      title: "Cổ vũ phong trào giải phóng dân tộc trên thế giới",
      text: "Thắng lợi của Việt Nam tác động mạnh tới tình hình nước Mỹ và thế giới, cổ vũ to lớn các dân tộc đang đấu tranh vì độc lập, dân chủ và tiến bộ xã hội.",
    },
  ],
  figures: [
    {
      name: "Văn Tiến Dũng",
      role: "Tư lệnh Chiến dịch Hồ Chí Minh",
      text: "Đại tướng, Tổng Tham mưu trưởng Quân đội nhân dân Việt Nam; trực tiếp chỉ huy các chiến dịch Tây Nguyên và Hồ Chí Minh trong mùa Xuân 1975.",
      href: "/nhan-vat/van-tien-dung",
    },
    {
      name: "Phạm Hùng",
      role: "Chính ủy Chiến dịch Hồ Chí Minh",
      text: "Ủy viên Bộ Chính trị, Bí thư Trung ương Cục miền Nam; cùng Bộ Chỉ huy chiến dịch lãnh đạo, chỉ đạo các lực lượng tiến công và nổi dậy giải phóng Sài Gòn.",
    },
    {
      name: "Lê Đức Thọ",
      role: "Đại diện Bộ Chính trị tại mặt trận",
      text: "Ủy viên Bộ Chính trị, được cử vào chiến trường cùng Bộ Chỉ huy chiến dịch truyền đạt và chỉ đạo thực hiện quyết tâm giải phóng Sài Gòn trước mùa mưa.",
      href: "/nhan-vat/le-duc-tho",
    },
    {
      name: "Nguyễn Thành Trung",
      role: "Phi công Phi đội Quyết thắng",
      text: "Ngày 8/4/1975 lái máy bay ném bom Dinh Độc Lập rồi bay về vùng giải phóng; chiều 28/4 tham gia Phi đội Quyết thắng ném bom sân bay Tân Sơn Nhất.",
    },
  ],
  flashcards: [
    { question: "Cuộc Tổng tiến công và nổi dậy mùa Xuân 1975 gồm ba chiến dịch lớn nào?", answer: "Chiến dịch Tây Nguyên, chiến dịch Huế – Đà Nẵng và Chiến dịch Hồ Chí Minh." },
    { question: "Trận mở màn chiến dịch Tây Nguyên diễn ra ở đâu, ngày nào?", answer: "Trận Buôn Ma Thuột, ngày 10/3/1975." },
    { question: "Bộ Chính trị đặt tên \"Chiến dịch Hồ Chí Minh\" vào ngày nào?", answer: "Ngày 14/4/1975." },
    { question: "Vì sao Xuân Lộc được gọi là \"cánh cửa thép\"?", answer: "Đây là tuyến phòng thủ then chốt bảo vệ Sài Gòn từ phía đông; ngày 21/4/1975 tuyến này bị quân ta phá vỡ." },
    { question: "Năm cánh quân tiến vào Sài Gòn từ những hướng nào?", answer: "Tây Bắc, Bắc, Đông, Đông Nam và Tây Nam." },
    { question: "Chiến dịch Hồ Chí Minh bắt đầu lúc nào?", answer: "17 giờ ngày 26/4/1975." },
    { question: "Thời khắc nào đánh dấu Chiến dịch Hồ Chí Minh toàn thắng?", answer: "11 giờ 30 phút ngày 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập." },
  ],
  quiz: [
    {
      question: "Chiến dịch nào mở đầu cuộc Tổng tiến công và nổi dậy mùa Xuân 1975?",
      choices: ["Chiến dịch Tây Nguyên", "Chiến dịch Huế – Đà Nẵng", "Chiến dịch Hồ Chí Minh", "Chiến dịch Đường 9 – Nam Lào"],
      correct: 0,
      explanation: "Chiến dịch Tây Nguyên mở màn bằng trận Buôn Ma Thuột (10/3/1975); tiếp theo là Huế – Đà Nẵng và cuối cùng là Chiến dịch Hồ Chí Minh. Đường 9 – Nam Lào là chiến dịch năm 1971.",
    },
    {
      question: "Ngày 14/4/1975 gắn với sự kiện nào?",
      choices: [
        "Bộ Chính trị đồng ý đặt tên chiến dịch giải phóng Sài Gòn là \"Chiến dịch Hồ Chí Minh\"",
        "Quân ta phá vỡ tuyến phòng thủ Xuân Lộc",
        "Dương Văn Minh lên làm tổng thống chính quyền Sài Gòn",
        "Quân ta nổ súng mở đầu Chiến dịch Hồ Chí Minh",
      ],
      correct: 0,
      explanation: "Ngày 14/4/1975, Bộ Chính trị đặt tên Chiến dịch Hồ Chí Minh. Xuân Lộc bị phá vỡ ngày 21/4; Dương Văn Minh lên làm tổng thống ngày 28/4; chiến dịch bắt đầu 17 giờ ngày 26/4.",
    },
    {
      question: "Tuyến phòng thủ được đối phương gọi là \"cánh cửa thép\" bảo vệ Sài Gòn từ phía đông là:",
      choices: ["Xuân Lộc", "Phan Rang", "Củ Chi", "Biên Hòa"],
      correct: 0,
      explanation: "Xuân Lộc là \"cánh cửa thép\" phía đông Sài Gòn; ngày 21/4/1975 quân đối phương phải rút chạy khỏi Xuân Lộc.",
    },
    {
      question: "Máy bay trong ảnh cùng loại với máy bay của Phi đội Quyết thắng. Chiều 28/4/1975, phi đội này ném bom mục tiêu nào?",
      image: MAY_BAY_A37,
      choices: ["Sân bay Tân Sơn Nhất", "Dinh Độc Lập", "Căn cứ Đồng Dù", "Sân bay Biên Hòa"],
      correct: 0,
      explanation: "Chiều 28/4/1975, Phi đội Quyết thắng dùng máy bay A-37 thu được của đối phương ném bom sân bay Tân Sơn Nhất. Dinh Độc Lập bị phi công Nguyễn Thành Trung ném bom trước đó, ngày 8/4/1975.",
    },
    {
      question: "Năm cánh quân của ta tiến vào Sài Gòn từ những hướng nào?",
      choices: [
        "Tây Bắc, Bắc, Đông, Đông Nam, Tây Nam",
        "Bắc, Nam, Đông, Tây, Trung tâm",
        "Chỉ từ hướng Bắc và hướng Đông",
        "Đông Bắc, Tây Bắc, Tây, Nam, Trung tâm",
      ],
      correct: 0,
      explanation: "Năm cánh quân áp sát và tiến công vào Sài Gòn từ năm hướng: Tây Bắc, Bắc, Đông, Đông Nam và Tây Nam, tạo thế bao vây, chia cắt đối phương.",
    },
    {
      question: "Chiếc xe tăng trong ảnh mang số hiệu gì — một trong hai số hiệu gắn với thời khắc tiến vào Dinh Độc Lập trưa 30/4/1975?",
      image: XE_TANG_843,
      choices: ["843", "390", "975", "304"],
      correct: 0,
      explanation: "Xe tăng trong ảnh mang số hiệu 843. Hai xe tăng 390 và 843 gắn với thời khắc tiến vào Dinh Độc Lập; hai xe nguyên bản nay lưu giữ tại Hà Nội, xe trong Dinh là xe cùng loại.",
    },
    {
      question: "Thời khắc nào đánh dấu Chiến dịch Hồ Chí Minh toàn thắng?",
      choices: [
        "11 giờ 30 phút ngày 30/4/1975, cờ cách mạng tung bay trên nóc Dinh Độc Lập",
        "17 giờ ngày 26/4/1975, quân ta nổ súng",
        "Chiều 28/4/1975, Phi đội Quyết thắng ném bom Tân Sơn Nhất",
        "Ngày 2/5/1975, Châu Đốc được giải phóng",
      ],
      correct: 0,
      explanation: "Trưa 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập, Dương Văn Minh tuyên bố đầu hàng không điều kiện — chiến dịch toàn thắng. Ngày 2/5, tỉnh cuối cùng ở miền Nam là Châu Đốc được giải phóng.",
    },
    {
      question: "Ý nào KHÔNG đúng về ý nghĩa thắng lợi của cuộc kháng chiến chống Mỹ, cứu nước?",
      choices: [
        "Mở đầu cho cuộc chiến tranh giải phóng dân tộc ở Việt Nam",
        "Kết thúc 21 năm kháng chiến chống Mỹ và 30 năm chiến tranh giải phóng (1945 – 1975)",
        "Hoàn thành cách mạng dân tộc dân chủ nhân dân trong cả nước, thống nhất đất nước",
        "Cổ vũ phong trào giải phóng dân tộc trên thế giới",
      ],
      correct: 0,
      explanation: "Thắng lợi năm 1975 KẾT THÚC (không phải mở đầu) cuộc chiến tranh giải phóng dân tộc kéo dài từ năm 1945. Ba ý còn lại đều là ý nghĩa của thắng lợi.",
    },
  ],
  today: [DINH_THONG_NHAT, {
    src: `${PHOTO}/dinh-doc-lap-2025.webp`,
    alt: "Dinh Độc Lập nhìn chéo từ bên hông, kiến trúc khối vuông với các thanh chắn nắng dọc",
    caption: "Dinh Độc Lập (Hội trường Thống Nhất) năm 2025 — Di tích quốc gia đặc biệt.",
    credit: "David Stanley, CC BY 4.0",
    sourceUrl: `${COMMONS}Independence_Palace.jpg`,
  }, XE_TANG_843, BAO_TANG, MAY_BAY_A37],
  toVerify: [
    "Số bài, số trang và cách SGK trình bày năm cánh quân (Quân đoàn 1, 2, 3, 4 và Đoàn 232) cùng hướng tiến công của từng cánh.",
    "Ngày Bộ Chính trị đặt tên Chiến dịch Hồ Chí Minh: 14/4/1975.",
    "Mốc 17 giờ ngày 26/4/1975 bắt đầu chiến dịch; khoảng 10 giờ 45 phút xe tăng vào Dinh Độc Lập; 11 giờ 30 phút cắm cờ.",
    "Xuân Lộc: quân ta tiến công từ 9/4, đối phương rút ngày 21/4/1975.",
    "Phi đội Quyết thắng ném bom sân bay Tân Sơn Nhất chiều 28/4/1975 (thành phần phi đội).",
    "Ngày 2/5/1975 Châu Đốc được giải phóng.",
    "Vai trò của Phạm Hùng (Chính ủy chiến dịch) và Lê Đức Thọ (đại diện Bộ Chính trị) — đối chiếu tài liệu chính thống.",
    "Vị trí các cánh quân trên bản đồ chỉ là sơ đồ hướng tiến công, không phải đường hành quân thật.",
  ],
};
