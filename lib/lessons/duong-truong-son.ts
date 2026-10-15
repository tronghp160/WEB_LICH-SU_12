import { duongTruongSon } from "@/lib/battles/duong-truong-son";
import type { Lesson, LessonImage } from "@/lib/lessons/types";

// Chuyên đề tương tác: Đường Trường Sơn – đường Hồ Chí Minh (1959 – 1975) — GĐ5.2 (KE_HOACH_CAI_TIEN, bài thứ 4). Nội dung
// VIẾT LẠI theo khung SGK Lịch sử 12 (Kết nối tri thức), Bài 8; không chép nguyên văn sách. Database CHƯA có sự kiện riêng cho
// đường Trường Sơn: `eventSlug` là slug dự kiến — nút "Xem trang sự kiện" tự ẩn khi sự kiện chưa tồn tại / chưa công bố.
// Ảnh kiểm tra giấy phép trên Wikimedia Commons ngày 15/10/2026 (phạm vi công cộng / CC BY / CC BY-SA). Video: Báo Nhân Dân,
// QPVN, VTV24 — xác minh bằng oEmbed ngày 15/10/2026.

const PHOTO = "/lessons/truong-son";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const DUONG_MON_1970: LessonImage = {
  src: `${PHOTO}/duong-mon-lao-1970.webp`,
  alt: "Ảnh đen trắng chụp từ trên cao: con đường đất uốn lượn giữa rừng, hai bên chi chít hố bom tròn, trên đường có vài chiếc xe tải",
  caption: "Ảnh trinh sát của Mỹ chụp một đoạn đường Trường Sơn ở Lào ngày 16/1/1970: xe tải ngụy trang trên đường, xung quanh chi chít hố bom.",
  credit: "Hải quân Mỹ (Lưu trữ Quốc gia Mỹ), phạm vi công cộng",
  sourceUrl: `${COMMONS}USN_1144308.jpg`,
  width: 1191,
  height: 925,
};

const NGHIA_TRANG: LessonImage = {
  src: `${PHOTO}/nghia-trang-truong-son.webp`,
  alt: "Hàng hàng ngôi mộ liệt sĩ xếp thẳng tắp trên các bậc đất, phía sau là đài tưởng niệm mái cong nhiều tầng giữa rừng thông",
  caption: "Nghĩa trang liệt sĩ quốc gia Trường Sơn (Quảng Trị) — nơi an nghỉ của hàng vạn liệt sĩ ngã xuống trên tuyến đường (ảnh năm 2010).",
  credit: "Gonzo Gooner, CC BY 3.0",
  sourceUrl: `${COMMONS}Truong_Son_National_Cemetery_-_panoramio.jpg`,
};

const DONG_LOC: LessonImage = {
  src: `${PHOTO}/nga-ba-dong-loc.webp`,
  alt: "Một người thắp hương giữa hai dãy mộ đá trắng có bình hoa cúc trắng, tại khu tưởng niệm",
  caption: "Khu mộ mười nữ thanh niên xung phong hi sinh ở Ngã ba Đồng Lộc (Hà Tĩnh) ngày 24/7/1968 (ảnh năm 2009).",
  credit: "Newone (Wikipedia tiếng Việt), CC BY-SA 3.0",
  sourceUrl: `${COMMONS}Lighting_incense_at_the_Dong_Loc_Junction_memorial.jpg`,
};

const TAU_KHONG_SO: LessonImage = {
  src: `${PHOTO}/tau-khong-so.webp`,
  alt: "Thân một con tàu cũ phủ rêu, hà bám, nằm sát chân núi đá vôi bên cầu tàu, giữa vịnh nước xanh",
  caption: "Một con tàu được giữ lại làm chứng tích về đoàn tàu không số, ở vịnh Cát Bà (Hải Phòng).",
  credit: "Goodmorninghpvn (Wikipedia tiếng Việt), CC BY-SA 3.0",
  sourceUrl: `${COMMONS}Tàu_không_số.jpg`,
  title: "Tàu không số",
};

const XE_ZIL: LessonImage = {
  src: `${PHOTO}/xe-zil-157.webp`,
  alt: "Xe tải quân sự ba cầu màu xanh rêu, thùng gỗ, đặt trên bệ trưng bày",
  caption: "Xe tải ZiL-157 do Liên Xô sản xuất — loại xe vận tải từng chạy trên đường Trường Sơn — trưng bày ở Hà Nội (ảnh năm 2025).",
  credit: "kitmasterbloke, CC BY 2.0",
  sourceUrl: `${COMMONS}Soviet_ZiL-157_Truck.jpg`,
  title: "Xe tải ZiL-157",
};

export const duongTruongSonLesson: Lesson = {
  slug: "duong-truong-son",
  eventSlug: "duong-truong-son-duong-ho-chi-minh",
  title: "Đường Trường Sơn – đường Hồ Chí Minh",
  dateText: "1959 – 1975",
  tagline:
    "Mười sáu năm \"xẻ dọc Trường Sơn\": hai tuyến chi viện trên bộ và trên biển đưa người, vũ khí từ hậu phương miền Bắc vào tiền tuyến miền Nam, góp phần làm nên Đại thắng mùa xuân 1975.",
  copy: {
    cardDescription: "Bản đồ hai tuyến chi viện trên bộ và trên biển, ảnh trinh sát năm 1970, Ngã ba Đồng Lộc, tàu không số, video và thẻ ghi nhớ.",
    mapTitle: "Xem tuyến chi viện hình thành trên bản đồ",
    mapHint: "Bản đồ đi từ lối mòn của Đoàn 559 năm 1959, tuyến tàu không số trên biển, tới mạng đường Đông – Tây Trường Sơn năm 1975; trọng điểm bị đánh phá có viền vàng nhấp nháy.",
    videoTitle: "Video tư liệu",
    resultsTitle: "Vì sao đường Trường Sơn được gọi là \"con đường huyền thoại\"?",
    todayTitle: "Đường Trường Sơn ngày nay",
  },
  hero: DUONG_MON_1970,
  heroStats: [
    { value: 16, label: "năm mở và giữ tuyến chi viện (1959 – 1975)" },
    { value: 2, label: "tuyến chiến lược: trên bộ dọc Trường Sơn và trên biển" },
    { value: 10, label: "cô gái thanh niên xung phong hi sinh ở Ngã ba Đồng Lộc" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)",
    objectives: [
      "Nêu được sự ra đời của đường Trường Sơn (1959) và đường Hồ Chí Minh trên biển (1961).",
      "Trình bày được quá trình phát triển và bảo vệ tuyến chi viện trong chiến tranh trên bản đồ.",
      "Đánh giá được vai trò của hậu phương miền Bắc và của tuyến chi viện chiến lược đối với thắng lợi năm 1975.",
    ],
  },
  keyDates: [
    { date: "19/5/1959", text: "Thành lập Đoàn 559, mở đường Trường Sơn" },
    { date: "23/10/1961", text: "Thành lập Đoàn 759, mở đường Hồ Chí Minh trên biển" },
    { date: "1965 – 1968", text: "Mỹ đánh phá ác liệt; đường xe cơ giới phát triển sang phía tây Trường Sơn" },
    { date: "24/7/1968", text: "Mười nữ thanh niên xung phong hi sinh ở Ngã ba Đồng Lộc" },
    { date: "2 – 3/1971", text: "Đánh bại cuộc hành quân \"Lam Sơn 719\" ở Đường 9 – Nam Lào" },
    { date: "1973 – 1975", text: "Mở đường Đông Trường Sơn, kéo dài đường ống xăng dầu" },
    { date: "30/4/1975", text: "Chiến dịch Hồ Chí Minh toàn thắng" },
  ],
  battle: duongTruongSon,
  videos: [
    {
      youtubeId: "ktcRodHW6os",
      title: "Đường Trường Sơn — Kỳ tích của thế kỷ 20",
      channel: "Báo Nhân Dân",
      note: "Toàn cảnh con đường — xem sau phần bản đồ.",
    },
    {
      youtubeId: "A5kF_m5ivDI",
      title: "Nhiệm vụ đặc biệt của những con tàu không số — Huyền thoại đường Hồ Chí Minh trên biển",
      channel: "QPVN — Truyền hình Quốc phòng Việt Nam",
      note: "Gắn với bước \"Đường Hồ Chí Minh trên biển\".",
    },
    {
      youtubeId: "bI019fwnWSI",
      title: "Hành trình xây dựng đường ống xăng dầu từ Bắc vào Nam của bộ đội Trường Sơn",
      channel: "VTV24",
      note: "Gắn với bước \"Đông Trường Sơn và đường ống xăng dầu\".",
    },
  ],
  // Tuyến chi viện không có "con số tổng kết" chung được SGK nêu; các số liệu chi tiết rất khác nhau giữa các tài liệu nên không
  // dùng lưới số liệu (xem toVerify).
  results: [],
  resultsImage: NGHIA_TRANG,
  significance: [
    {
      title: "Mạch máu nối hậu phương với tiền tuyến",
      text: "Đường Trường Sơn và đường Hồ Chí Minh trên biển đưa người, vũ khí, lương thực từ hậu phương miền Bắc vào chiến trường — điều kiện để cách mạng miền Nam đứng vững và phát triển.",
    },
    {
      title: "Góp phần quyết định thắng lợi năm 1975",
      text: "Những năm 1973 – 1975, tuyến đường được mở rộng đã đưa các binh đoàn chủ lực, vũ khí, xăng dầu vào chiến trường đúng lúc, làm nên Cuộc Tổng tiến công và nổi dậy mùa xuân 1975.",
    },
    {
      title: "Biểu tượng của ý chí thống nhất",
      text: "Hàng chục vạn bộ đội, thanh niên xung phong, dân công từ mọi miền đất nước đã mở đường, giữ đường dưới mưa bom — nhiều người đã nằm lại mãi mãi trên tuyến đường.",
    },
    {
      title: "Tình đoàn kết Đông Dương",
      text: "Tuyến đường đi qua đất Lào, Cam-pu-chia; nhân dân Lào, Cam-pu-chia đã cùng bảo vệ con đường — biểu hiện của liên minh chiến đấu ba nước Đông Dương.",
    },
  ],
  quote: {
    text: "Xẻ dọc Trường Sơn đi cứu nước / Mà lòng phơi phới dậy tương lai.",
    author: "Nhà thơ Tố Hữu",
  },
  figures: [
    {
      name: "Võ Bẩm",
      role: "Đoàn trưởng đầu tiên của Đoàn 559",
      text: "Được giao chỉ huy Đoàn 559 ngày đầu thành lập (1959), tổ chức mở những lối mòn đầu tiên xuyên dãy Trường Sơn — được gọi là \"người mở đường\".",
    },
    {
      name: "Đồng Sỹ Nguyên",
      role: "Tư lệnh Bộ đội Trường Sơn (1967 – 1975)",
      text: "Chỉ huy bộ đội Trường Sơn trong những năm ác liệt nhất, tổ chức xây dựng mạng đường xe cơ giới, đường ống xăng dầu, chi viện cho Cuộc Tổng tiến công năm 1975.",
    },
    {
      name: "Võ Thị Tần",
      role: "Tiểu đội trưởng Tiểu đội 4, Đại đội 552 thanh niên xung phong",
      text: "Cùng chín đồng đội hi sinh ở Ngã ba Đồng Lộc ngày 24/7/1968 khi đang san lấp hố bom thông đường. Mười cô gái được truy tặng danh hiệu Anh hùng Lực lượng vũ trang nhân dân.",
    },
  ],
  flashcards: [
    { question: "Đoàn 559 — đơn vị mở đường Trường Sơn — được thành lập ngày nào?", answer: "Ngày 19/5/1959 — đúng ngày sinh nhật Chủ tịch Hồ Chí Minh." },
    { question: "Đường Hồ Chí Minh trên biển do đơn vị nào mở, từ khi nào?", answer: "Đoàn 759 (sau là Đoàn 125 Hải quân), thành lập ngày 23/10/1961." },
    { question: "Vì sao gọi là \"tàu không số\"?", answer: "Vì tàu không mang số hiệu, ngụy trang thành tàu đánh cá để giữ bí mật khi chở vũ khí vào miền Nam." },
    { question: "Sự kiện bi tráng nào xảy ra ở Ngã ba Đồng Lộc ngày 24/7/1968?", answer: "Mười nữ thanh niên xung phong Tiểu đội 4, Đại đội 552 hi sinh khi san lấp hố bom thông đường." },
    { question: "Cuộc hành quân nào của đối phương năm 1971 nhằm cắt đường Trường Sơn và bị đánh bại?", answer: "Cuộc hành quân \"Lam Sơn 719\" ở Đường 9 – Nam Lào." },
    { question: "Sau Hiệp định Pa-ri (1973), ta mở rộng tuyến chi viện như thế nào?", answer: "Xây dựng đường ô tô chiến lược Đông Trường Sơn, kéo dài đường ống xăng dầu vào tới miền Đông Nam Bộ." },
  ],
  quiz: [
    {
      question: "Ảnh trinh sát năm 1970 cho thấy một đoạn của tuyến đường nào, xung quanh chi chít hố bom?",
      image: DUONG_MON_1970,
      choices: ["Đường Trường Sơn", "Đường số 1", "Đường sắt Thống Nhất", "Đường 5 Hà Nội – Hải Phòng"],
      correct: 0,
      explanation: "Đây là một đoạn đường Trường Sơn ở Lào. Mỹ ném bom ác liệt để cắt tuyến chi viện, nhưng xe vẫn qua — trên đường vẫn thấy những chiếc xe tải ngụy trang.",
    },
    {
      question: "Đoàn 559 được thành lập vào ngày tháng năm nào?",
      choices: ["19/5/1959", "23/10/1961", "19/5/1969", "30/4/1975"],
      correct: 0,
      explanation: "Đoàn 559 ra đời ngày 19/5/1959 (tên gọi lấy từ tháng 5/1959). Ngày 23/10/1961 là ngày thành lập Đoàn 759 — đường Hồ Chí Minh trên biển.",
    },
    {
      question: "Mục đích chính của việc mở đường Trường Sơn là gì?",
      choices: [
        "Chi viện sức người, sức của từ miền Bắc cho cách mạng miền Nam",
        "Phát triển du lịch vùng núi",
        "Vận chuyển hàng hóa buôn bán với Lào",
        "Di dân lên vùng Tây Nguyên",
      ],
      correct: 0,
      explanation: "Đường Trường Sơn là tuyến vận tải chiến lược đưa người, vũ khí, lương thực từ hậu phương miền Bắc vào tiền tuyến miền Nam.",
    },
    {
      question: "Con tàu trong ảnh gợi nhớ về đoàn tàu đặc biệt nào trên đường Hồ Chí Minh trên biển?",
      image: TAU_KHONG_SO,
      choices: ["Tàu không số", "Tàu Phương Đông", "Tàu Bến Thành", "Tàu Hoàng Sa"],
      correct: 0,
      explanation: "Những \"tàu không số\" không mang số hiệu, ngụy trang thành tàu đánh cá, chở vũ khí vào các bến bí mật ở miền Nam.",
    },
    {
      question: "Ngày 24/7/1968, mười nữ thanh niên xung phong hi sinh ở đâu?",
      choices: ["Ngã ba Đồng Lộc (Hà Tĩnh)", "Đèo Mụ Giạ (Quảng Bình)", "Cầu Hiền Lương (Quảng Trị)", "Đường 9 – Khe Sanh"],
      correct: 0,
      explanation: "Mười cô gái Tiểu đội 4, Đại đội 552 hi sinh ở Ngã ba Đồng Lộc (Hà Tĩnh) khi đang san lấp hố bom thông đường.",
    },
    {
      question: "Cuộc hành quân \"Lam Sơn 719\" (đầu năm 1971) của Mỹ và quân đội Sài Gòn nhằm mục đích gì?",
      choices: [
        "Cắt đứt đường Trường Sơn ở khu vực Đường 9 – Nam Lào",
        "Tiến công ra miền Bắc",
        "Giải tỏa cho Sài Gòn",
        "Chiếm lại Tây Nguyên",
      ],
      correct: 0,
      explanation: "\"Lam Sơn 719\" đánh sang Đường 9 – Nam Lào hòng cắt tuyến chi viện; quân ta phối hợp với quân dân Lào đánh bại cuộc hành quân.",
    },
    {
      question: "Chiếc xe trong ảnh là loại xe gì từng chạy trên đường Trường Sơn?",
      image: XE_ZIL,
      choices: ["Xe tải vận tải quân sự", "Xe tăng", "Xe bọc thép chở quân", "Xe chở khách"],
      correct: 0,
      explanation: "Đây là xe tải ZiL-157 do Liên Xô sản xuất. Những đoàn xe vận tải như vậy chạy suốt đêm dưới mưa bom để đưa hàng vào chiến trường.",
    },
    {
      question: "Vai trò lớn nhất của đường Trường Sơn đối với thắng lợi năm 1975 là:",
      choices: [
        "Đưa các binh đoàn chủ lực, vũ khí, xăng dầu vào chiến trường đúng lúc cho Tổng tiến công",
        "Là nơi kí Hiệp định Pa-ri",
        "Là căn cứ không quân của ta",
        "Là nơi diễn ra trận quyết chiến cuối cùng",
      ],
      correct: 0,
      explanation: "Tuyến chi viện được mở rộng những năm 1973 – 1975 đã đưa lực lượng, vật chất vào chiến trường, làm nên Đại thắng mùa xuân 1975. Hiệp định Pa-ri kí ở Pháp; trận quyết chiến cuối cùng là chiến dịch Hồ Chí Minh ở Sài Gòn.",
    },
  ],
  artifacts: [
    {
      title: "Xe tải ZiL-157",
      text: "Xe tải ba cầu do Liên Xô sản xuất, vượt được đường rừng lầy lội. Lái xe Trường Sơn thường chạy đêm, tắt đèn pha, ngụy trang xe bằng cành lá để tránh máy bay Mỹ.",
      image: XE_ZIL,
    },
    {
      title: "Tàu không số",
      text: "Tàu vỏ sắt, vỏ gỗ không mang số hiệu, ngụy trang thành tàu đánh cá, chở vũ khí theo đường biển vào miền Nam. Khi bị phát hiện, thủy thủ sẵn sàng hủy tàu để giữ bí mật tuyến đường.",
      image: TAU_KHONG_SO,
    },
    {
      title: "Máy bay thả thiết bị cảm ứng",
      text: "Mỹ dùng máy bay thả hàng nghìn thiết bị cảm ứng (ta gọi là \"cây nhiệt đới\") dọc đường Trường Sơn để dò tiếng động, rung chấn của xe rồi gọi máy bay đến ném bom. Bộ đội ta tìm cách phát hiện và đánh lừa các thiết bị này.",
      image: {
        src: `${PHOTO}/op2e-tha-cam-bien.webp`,
        alt: "Ảnh đen trắng: máy bay hai động cơ cánh quạt của Hải quân Mỹ bay trên vùng rừng",
        caption: "Máy bay OP-2E của Hải quân Mỹ bay trên đất Lào (1967 – 1968), làm nhiệm vụ thả thiết bị cảm ứng dọc đường Trường Sơn.",
        credit: "Hải quân Mỹ, phạm vi công cộng",
        sourceUrl: `${COMMONS}Lockheed_OP-2E_Neptune_of_VO-67_in_flight_on_a_mission_over_Laos,_circa_in_1967.jpg`,
        title: "Máy bay OP-2E",
      },
    },
  ],
  today: [
    NGHIA_TRANG,
    DONG_LOC,
    {
      src: `${PHOTO}/duong-ho-chi-minh-nay.webp`,
      alt: "Biển báo màu xanh ghi \"Đường Hồ Chí Minh\" bên một con đường nhựa có hàng cây, một người đi xe máy chở hàng dừng bên lề",
      caption: "Đường Hồ Chí Minh ngày nay — tuyến đường bộ xuyên Việt được xây dựng từ năm 2000, phần lớn đi theo tuyến đường Trường Sơn năm xưa (ảnh năm 2018).",
      credit: "Vinnie Cartabiano, CC BY 2.0",
      sourceUrl: `${COMMONS}Đường_Hồ_Chí_Minh_(39269576495).jpg`,
    },
  ],
  toVerify: [
    "Quyết định mở đường của Bộ Chính trị (Hội nghị Trung ương 15, 1/1959) và ngày thành lập Đoàn 559 (19/5/1959) — đối chiếu SGK.",
    "Ngày thành lập Đoàn 759 (23/10/1961) và tên gọi sau này (Đoàn 125 Hải quân).",
    "Các bến của tàu không số được nêu (Vũng Rô — Phú Yên; Cà Mau) và đường đi trên bản đồ là vẽ phác.",
    "Mười cô gái Ngã ba Đồng Lộc: Tiểu đội 4, Đại đội 552; người lớn tuổi nhất 24, trẻ nhất 17 tuổi; danh hiệu Anh hùng LLVTND.",
    "Cuộc hành quân \"Lam Sơn 719\" (khoảng 2 – 3/1971) và cách SGK gọi chiến thắng Đường 9 – Nam Lào.",
    "Độ dài đường ống xăng dầu (nhiều tài liệu nêu khoảng 5.000 km) và tổng chiều dài mạng đường — chưa đưa con số vào bài.",
    "Võ Bẩm là đoàn trưởng đầu tiên của Đoàn 559; Đồng Sỹ Nguyên làm Tư lệnh từ 1967 đến 1975.",
    "Ảnh tàu không số ở vịnh Cát Bà: chỉ theo tên tệp của người chụp — cần xác minh đây là tàu gì, thuộc di tích nào.",
    "Câu thơ \"Xẻ dọc Trường Sơn đi cứu nước / Mà lòng phơi phới dậy tương lai\" — xác minh tên bài thơ của Tố Hữu.",
  ],
};
