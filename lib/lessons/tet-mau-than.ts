import { tetMauThan1968 } from "@/lib/battles/tet-mau-than-1968";
import type { Lesson, LessonImage } from "@/lib/lessons/types";

// Chuyên đề tương tác: Tổng tiến công và nổi dậy Tết Mậu Thân 1968 — GĐ7 nâng cấp giao diện. Nội dung VIẾT LẠI theo khung SGK
// Lịch sử 12 (Kết nối tri thức), Bài 8, không chép nguyên văn sách. Ảnh đã kiểm tra giấy phép trên Wikimedia Commons (2/10/2026):
// ảnh năm 1968 của Quân đội / Thủy quân lục chiến Mỹ (phạm vi công cộng hoặc CC BY 2.0), ảnh Huế ngày nay CC BY 4.0.
// Video: kênh Báo Quân đội nhân dân và Báo Nhân Dân, đã xác minh bằng oEmbed ngày 2/10/2026.

const PHOTO = "/lessons/mau-than-1968";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const TOA_DAI_SU: LessonImage = {
  src: `${PHOTO}/toa-dai-su-my-1968.webp`,
  alt: "Ảnh đen trắng: tòa nhà Đại sứ quán Mỹ ở Sài Gòn với mặt tiền ô gạch hoa, trên đường phía trước có lính Mỹ và xe jeep",
  caption: "Tòa Đại sứ Mỹ ở Sài Gòn ngày 31/1/1968, sau trận tiến công của biệt động thành đêm giao thừa — trên tường còn thấy vết thủng.",
  credit: "Viện Lịch sử Quân sự Lục quân Mỹ, phạm vi công cộng",
  sourceUrl: `${COMMONS}US_Embassy,_Saigon,_January_1968.jpg`,
};

const TOA_DAI_SU_HU_HAI: LessonImage = {
  src: `${PHOTO}/toa-dai-su-my-hu-hai.webp`,
  alt: "Ảnh đen trắng: mặt tiền Tòa Đại sứ Mỹ có nhiều lỗ thủng do bị bắn phá",
  caption: "Mặt tiền Tòa Đại sứ Mỹ bị thủng nhiều chỗ sau trận đánh rạng sáng 31/1/1968.",
  credit: "SP6 Samuel L. Swain, Quân đội Mỹ, phạm vi công cộng",
  sourceUrl: `${COMMONS}Embassy_exterior_showing_blast_damage.jpg`,
};

const HUE_1968: LessonImage = {
  src: `${PHOTO}/hue-kinh-thanh-1968.webp`,
  alt: "Ảnh đen trắng: xe tăng và lính thủy đánh bộ Mỹ giữa đống đổ nát trong Kinh thành Huế",
  caption: "Xe tăng Mỹ yểm trợ phản kích trong Kinh thành Huế ngày 12/2/1968 — giao tranh diễn ra ác liệt từng đường phố.",
  credit: "Trung sĩ J. L. Harlan, Thủy quân lục chiến Mỹ, CC BY 2.0",
  sourceUrl: `${COMMONS}Tank_supporting_1.5_Marines_in_the_citadel_of_Hue.jpg`,
};

const VO_NGUYEN_GIAP_PORTRAIT: LessonImage = {
  src: "/lessons/dien-bien-phu/vo-nguyen-giap.webp",
  alt: "Đại tướng Võ Nguyên Giáp lúc tuổi cao, mặc quân phục trắng gắn huân chương",
  caption: "Đại tướng Võ Nguyên Giáp năm 2008.",
  credit: "Ricardo Stuckert (PR/ABr/Brazil), CC BY 3.0 br",
  sourceUrl: `${COMMONS}Vo_Nguyen_Giap_2008.jpg`,
};

export const tetMauThanLesson: Lesson = {
  slug: "tet-mau-than-1968",
  eventSlug: "tong-tien-cong-va-noi-day-tet-mau-than-1968",
  title: "Tổng tiến công và nổi dậy Tết Mậu Thân 1968",
  dateText: "Xuân Mậu Thân, 1968",
  tagline: "Đêm giao thừa Tết Mậu Thân, quân dân miền Nam đồng loạt tiến công hầu khắp các đô thị, đánh thẳng vào Tòa Đại sứ Mỹ — làm lung lay ý chí xâm lược của Mỹ.",
  copy: {
    cardDescription: "Bản đồ các đô thị bị tiến công đêm giao thừa, trận Sài Gòn và Huế, ảnh tư liệu năm 1968, video và thẻ ghi nhớ.",
    mapTitle: "Xem cuộc tổng tiến công lan khắp miền Nam",
    mapHint: "Bản đồ đi từ Khe Sanh tới các đô thị đêm giao thừa, rồi vào Sài Gòn và Huế; nơi đang bị tiến công có viền đỏ nhấp nháy.",
    videoTitle: "Video tư liệu",
    resultsTitle: "Vì sao Tết Mậu Thân là bước ngoặt của cuộc kháng chiến?",
    todayTitle: "Những địa danh lịch sử ngày nay",
  },
  hero: TOA_DAI_SU,
  heroStats: [
    { value: 4, label: "mục tiêu đầu não ở Sài Gòn bị tiến công đêm giao thừa" },
    { value: 3, label: "đợt tiến công trong năm 1968" },
    { value: 25, suffix: "+", label: "ngày giao tranh ác liệt ở Huế (31/1 – cuối tháng 2/1968)" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)",
    objectives: [
      "Nêu được bối cảnh và chủ trương mở cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968.",
      "Trình bày được diễn biến chính trên bản đồ: tiến công đồng loạt các đô thị, trận Sài Gòn và Huế, các đợt 2 và 3.",
      "Đánh giá được ý nghĩa (bước ngoặt buộc Mỹ xuống thang, đàm phán) và hạn chế của cuộc tổng tiến công.",
    ],
  },
  keyDates: [
    { date: "20/1/1968", text: "Mở đầu chiến dịch Đường 9 – Khe Sanh" },
    { date: "30 – 31/1/1968", text: "Đêm giao thừa: đồng loạt tiến công các đô thị" },
    { date: "31/1/1968", text: "Biệt động thành đánh Tòa Đại sứ Mỹ ở Sài Gòn" },
    { date: "2/1968", text: "Giao tranh ác liệt ở Huế gần một tháng" },
    { date: "31/3/1968", text: "Giôn-xơn tuyên bố hạn chế ném bom miền Bắc" },
    { date: "13/5/1968", text: "Hội nghị Pa-ri khai mạc" },
    { date: "1/11/1968", text: "Mỹ ngừng hẳn ném bom miền Bắc" },
  ],
  battle: tetMauThan1968,
  videos: [
    {
      youtubeId: "4Ns3quhYoKQ",
      title: "Chiến dịch Tết Mậu Thân 1968 — Bước ngoặt của cuộc kháng chiến chống Mỹ",
      channel: "Báo Quân đội nhân dân",
      note: "Toàn cảnh cuộc tổng tiến công — xem sau phần bản đồ.",
    },
    {
      youtubeId: "CZuV7SMxgG4",
      title: "Ký ức Mậu Thân 1968 (Phần 3): Đánh chiếm Đài phát thanh Sài Gòn",
      channel: "Báo Nhân Dân",
      note: "Gắn với bước \"Sài Gòn: đánh vào bốn mục tiêu đầu não\".",
    },
    {
      youtubeId: "WG1hm6iDJ-s",
      title: "Cuộc Tổng tiến công và nổi dậy Xuân Mậu Thân 1968 — Nguyên nhân thắng lợi và bài học lịch sử",
      channel: "Báo Nhân Dân",
      note: "Liên hệ với phần ý nghĩa và bài học.",
    },
  ],
  // Kết quả của Tết Mậu Thân là các mốc chính trị (xem phần mốc thời gian và ý nghĩa), không có con số tổng kết nên không dùng lưới số liệu.
  results: [],
  resultsImage: TOA_DAI_SU_HU_HAI,
  significance: [
    {
      title: "Làm lung lay ý chí xâm lược của Mỹ",
      text: "Đòn tiến công bất ngờ vào hầu khắp các đô thị, kể cả Tòa Đại sứ Mỹ, làm dư luận Mỹ bàng hoàng, phong trào phản chiến ở Mỹ lên cao; chiến lược \"Chiến tranh cục bộ\" bị phá sản.",
    },
    {
      title: "Buộc Mỹ xuống thang chiến tranh",
      text: "Mỹ phải tuyên bố \"phi Mỹ hóa\" chiến tranh, hạn chế rồi ngừng hẳn ném bom miền Bắc (1/11/1968).",
    },
    {
      title: "Buộc Mỹ ngồi vào bàn đàm phán",
      text: "Mỹ phải chấp nhận đàm phán với Việt Nam Dân chủ Cộng hòa tại Pa-ri (từ 13/5/1968) — mở ra cục diện \"vừa đánh vừa đàm\", tiền đề của Hiệp định Pa-ri năm 1973.",
    },
    {
      title: "Hạn chế và bài học",
      text: "Ở đợt 2 và đợt 3, ta chậm đánh giá lại tình hình, tiếp tục tiến công vào đô thị khi đối phương đã phản kích mạnh, nên lực lượng bị tổn thất lớn, gặp nhiều khó khăn trong những năm 1969 – 1970.",
    },
  ],
  figures: [
    {
      name: "Lê Duẩn",
      role: "Bí thư thứ nhất Ban Chấp hành Trung ương Đảng",
      text: "Cùng Bộ Chính trị đề ra chủ trương mở cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968 trên toàn miền Nam.",
      href: "/nhan-vat/le-duan",
    },
    {
      name: "Võ Nguyên Giáp",
      role: "Đại tướng, Bộ trưởng Bộ Quốc phòng",
      text: "Tổng tư lệnh Quân đội nhân dân Việt Nam; cùng Quân ủy Trung ương chỉ đạo chuẩn bị lực lượng và chiến dịch Đường 9 – Khe Sanh phối hợp với tổng tiến công.",
      href: "/nhan-vat/vo-nguyen-giap",
      image: VO_NGUYEN_GIAP_PORTRAIT,
    },
    {
      name: "Trần Văn Trà",
      role: "Tư lệnh Quân giải phóng miền Nam",
      text: "Trực tiếp chỉ huy các lực lượng tiến công trên chiến trường Sài Gòn – Gia Định và miền Đông Nam Bộ trong Tết Mậu Thân.",
    },
    {
      name: "L. B. Giôn-xơn",
      role: "Tổng thống Mỹ (1963 – 1969)",
      text: "Ngày 31/3/1968 tuyên bố hạn chế ném bom miền Bắc, sẵn sàng đàm phán và không ra tranh cử nhiệm kì tiếp theo — dấu hiệu Mỹ phải xuống thang chiến tranh.",
    },
  ],
  flashcards: [
    { question: "Cuộc Tổng tiến công và nổi dậy Tết Mậu Thân bắt đầu khi nào?", answer: "Đêm 30 rạng sáng 31/1/1968 — đêm giao thừa Tết Mậu Thân." },
    { question: "Bốn mục tiêu đầu não ở Sài Gòn bị tiến công đêm giao thừa là gì?", answer: "Tòa Đại sứ Mỹ, Dinh Độc Lập, Bộ Tổng tham mưu quân đội Sài Gòn và Đài phát thanh Sài Gòn." },
    { question: "Ở thành phố nào quân giải phóng làm chủ phần lớn thành phố gần một tháng?", answer: "Huế (từ 31/1 đến cuối tháng 2/1968)." },
    { question: "Chiến dịch nào được mở trước đó để thu hút sự chú ý của Mỹ?", answer: "Chiến dịch Đường 9 – Khe Sanh, từ ngày 20/1/1968." },
    { question: "Hội nghị Pa-ri giữa Việt Nam Dân chủ Cộng hòa và Mỹ khai mạc ngày nào?", answer: "Ngày 13/5/1968." },
    { question: "Hạn chế lớn nhất của cuộc tổng tiến công năm 1968 là gì?", answer: "Ở đợt 2 và 3, ta chậm chuyển hướng tiến công nên bị tổn thất lớn, gặp khó khăn trong những năm 1969 – 1970." },
  ],
  quiz: [
    {
      question: "Tòa nhà trong ảnh, bị biệt động thành tiến công rạng sáng 31/1/1968, là gì?",
      image: TOA_DAI_SU,
      choices: ["Tòa Đại sứ Mỹ ở Sài Gòn", "Dinh Độc Lập", "Bộ Tổng tham mưu quân đội Sài Gòn", "Đài phát thanh Sài Gòn"],
      correct: 0,
      explanation: "Đây là Tòa Đại sứ Mỹ ở Sài Gòn với mặt tiền ô gạch hoa đặc trưng. Trận đánh vào biểu tượng của sự có mặt của Mỹ ở miền Nam gây chấn động dư luận nước Mỹ.",
    },
    {
      question: "Vì sao năm 1968 được chọn để mở cuộc Tổng tiến công và nổi dậy?",
      choices: [
        "Chiến lược \"Chiến tranh cục bộ\" của Mỹ bế tắc và năm 1968 là năm bầu cử tổng thống Mỹ",
        "Mỹ đã rút hết quân khỏi miền Nam",
        "Hiệp định Pa-ri vừa được kí kết",
        "Quân đội Sài Gòn tan rã hoàn toàn",
      ],
      correct: 0,
      explanation: "Sau hai mùa khô, \"Chiến tranh cục bộ\" không đạt mục tiêu; năm 1968 lại là năm bầu cử ở Mỹ — thời điểm đòn tiến công có thể tác động mạnh nhất tới ý chí của Mỹ. Hiệp định Pa-ri chỉ được kí năm 1973.",
    },
    {
      question: "Chiến dịch nào bắt đầu từ ngày 20/1/1968, thu hút sự chú ý của Mỹ ra vùng giới tuyến?",
      choices: ["Đường 9 – Khe Sanh", "Đường 9 – Nam Lào", "Tây Nguyên", "Quảng Trị 1972"],
      correct: 0,
      explanation: "Chiến dịch Đường 9 – Khe Sanh (từ 20/1/1968) khiến Mỹ dồn chú ý ra vùng giới tuyến. Đường 9 – Nam Lào là năm 1971; Tây Nguyên là năm 1975.",
    },
    {
      question: "Trận chiến trong ảnh (tháng 2/1968) diễn ra ở thành phố nào — nơi quân giải phóng làm chủ phần lớn thành phố gần một tháng?",
      image: HUE_1968,
      choices: ["Huế", "Đà Nẵng", "Sài Gòn", "Quảng Trị"],
      correct: 0,
      explanation: "Ở Huế, quân giải phóng làm chủ phần lớn thành phố, kể cả khu Kinh thành, từ 31/1 tới cuối tháng 2/1968; Mỹ phải dùng xe tăng, pháo binh, không quân phản kích.",
    },
    {
      question: "Ngày 31/3/1968, Tổng thống Mỹ Giôn-xơn tuyên bố điều gì?",
      choices: [
        "Hạn chế ném bom miền Bắc, sẵn sàng đàm phán và không ra tranh cử nhiệm kì nữa",
        "Ngừng hẳn ném bom miền Bắc",
        "Rút toàn bộ quân Mỹ khỏi miền Nam",
        "Kí Hiệp định Pa-ri",
      ],
      correct: 0,
      explanation: "Ngày 31/3/1968 Mỹ mới hạn chế ném bom; đến 1/11/1968 mới ngừng hẳn. Hiệp định Pa-ri kí ngày 27/1/1973.",
    },
    {
      question: "Hội nghị Pa-ri giữa Việt Nam Dân chủ Cộng hòa và Mỹ khai mạc ngày nào?",
      choices: ["13/5/1968", "31/1/1968", "1/11/1968", "27/1/1973"],
      correct: 0,
      explanation: "Hội nghị Pa-ri khai mạc ngày 13/5/1968 — một kết quả trực tiếp của cuộc tổng tiến công. Ngày 27/1/1973 là ngày kí Hiệp định Pa-ri.",
    },
    {
      question: "Ý nghĩa quan trọng nhất của cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968 là:",
      choices: [
        "Mở ra bước ngoặt: buộc Mỹ xuống thang chiến tranh và ngồi vào bàn đàm phán",
        "Giải phóng hoàn toàn miền Nam",
        "Buộc Mỹ rút hết quân khỏi Việt Nam ngay trong năm 1968",
        "Đánh bại chiến lược \"Việt Nam hóa chiến tranh\"",
      ],
      correct: 0,
      explanation: "Tết Mậu Thân làm phá sản \"Chiến tranh cục bộ\", buộc Mỹ xuống thang và đàm phán. Miền Nam được giải phóng năm 1975; \"Việt Nam hóa chiến tranh\" là chiến lược Mỹ dùng SAU năm 1968.",
    },
    {
      question: "Hạn chế của cuộc tổng tiến công năm 1968 là gì?",
      choices: [
        "Ở đợt 2 và 3, ta chậm chuyển hướng nên bị tổn thất lớn",
        "Không đánh được vào Sài Gòn",
        "Không gây được bất ngờ cho đối phương",
        "Không tác động gì tới dư luận nước Mỹ",
      ],
      correct: 0,
      explanation: "Đợt 1 gây bất ngờ lớn, đánh vào cả Sài Gòn và tác động mạnh tới dư luận Mỹ; hạn chế nằm ở đợt 2, 3 khi đối phương đã phản kích mạnh mà ta vẫn tiến công vào đô thị.",
    },
  ],
  today: [
    {
      src: `${PHOTO}/kinh-thanh-hue-nay.webp`,
      alt: "Lối đi lát gạch dọc hào nước và tường thành cổ rêu phong, phía xa là Ngọ Môn Huế",
      caption: "Hào nước và tường thành trong Kinh thành Huế ngày nay, phía xa là Ngọ Môn (ảnh năm 2008).",
      credit: "Vyacheslav Argenberg, CC BY 4.0",
      sourceUrl: `${COMMONS}Vietnam,_Hue,_Imperial_City_of_Hue,_Enclosure.jpg`,
    },
    {
      src: `${PHOTO}/cua-kinh-thanh-hue.webp`,
      alt: "Cổng gỗ sơn đỏ trong một vòm tường vàng trang trí hoa văn sứ, mái nhiều tầng uốn cong",
      caption: "Một cổng trong Hoàng thành Huế ngày nay — quần thể di tích được trùng tu sau những tàn phá của chiến tranh (ảnh năm 2008).",
      credit: "Vyacheslav Argenberg, CC BY 4.0",
      sourceUrl: `${COMMONS}Vietnam,_Hue,_Imperial_City_of_Hue,_Gate.jpg`,
    },
  ],
  toVerify: [
    "Số liệu \"37 trong 44 thị xã, 5 trong 6 thành phố\" bị tiến công đêm giao thừa — đối chiếu với SGK.",
    "Ngày mở đầu chiến dịch Đường 9 – Khe Sanh: 20/1/1968 (một số tài liệu ghi 21/1).",
    "Thời gian quân giải phóng làm chủ Huế (31/1 – khoảng 24, 25/2/1968).",
    "Thời gian các đợt 2 (tháng 5 – 6) và 3 (tháng 8 – 9/1968).",
    "Vai trò của Trần Văn Trà trong chỉ huy chiến trường Sài Gòn – Gia Định.",
    "Cách SGK đánh giá hạn chế của cuộc tổng tiến công.",
  ],
};
