import { cachMangThangTam1945 } from "@/lib/battles/cach-mang-thang-tam-1945";
import type { Lesson, LessonImage } from "@/lib/lessons/types";

// Bài học tương tác: Cách mạng tháng Tám năm 1945 và Tuyên ngôn Độc lập (GĐ5.2). Nội dung VIẾT LẠI theo khung SGK Lịch sử 12
// (Kết nối tri thức), không chép nguyên văn sách. Ảnh đã kiểm tra giấy phép trên Wikimedia Commons (30/9/2026): ảnh và văn bản
// năm 1945 của Cục Văn thư và Lưu trữ nhà nước (PD-Vietnam: tác phẩm nhiếp ảnh hết 75 năm bảo hộ), ảnh ngày nay CC BY/CC BY-SA.
// Video: nhúng YouTube từ kênh chính thống, đã xác minh bằng oEmbed (cho phép nhúng) ngày 30/9/2026.

const PHOTO = "/lessons/cach-mang-thang-tam";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const HO_CHI_MINH_PORTRAIT: LessonImage = {
  src: `${PHOTO}/ho-chi-minh-1946.webp`,
  alt: "Chân dung Chủ tịch Hồ Chí Minh, ảnh đen trắng, mặc áo cổ đứng",
  caption: "Chủ tịch Hồ Chí Minh, khoảng năm 1946.",
  credit: "Không rõ tác giả, phạm vi công cộng",
  sourceUrl: `${COMMONS}Ho_Chi_Minh_1946.jpg`,
};

const TRUONG_CHINH_PORTRAIT: LessonImage = {
  src: `${PHOTO}/truong-chinh.webp`,
  alt: "Chân dung ông Trường Chinh, ảnh đen trắng, mặc áo sơ mi trắng",
  caption: "Ông Trường Chinh năm 1978.",
  credit: "Lưu trữ Quốc gia Romania, giấy phép Attribution (chỉ cần ghi công)",
  sourceUrl: `${COMMONS}Truong_Chinh,_Le_Duan,_Nicolae_og_Elena_Ceausescu_(cropped)(b).jpg`,
};

const VO_NGUYEN_GIAP_PORTRAIT: LessonImage = {
  src: "/lessons/dien-bien-phu/vo-nguyen-giap.webp",
  alt: "Đại tướng Võ Nguyên Giáp lúc tuổi cao, mặc quân phục trắng gắn huân chương",
  caption: "Đại tướng Võ Nguyên Giáp năm 2008.",
  credit: "Ricardo Stuckert (PR/ABr/Brazil), CC BY 3.0 br",
  sourceUrl: `${COMMONS}Vo_Nguyen_Giap_2008.jpg`,
};

const DINH_TAN_TRAO: LessonImage = {
  src: `${PHOTO}/dinh-tan-trao.webp`,
  alt: "Ngôi đình mái lá, cột gỗ, nằm giữa bãi cỏ xanh và hàng cây",
  caption: "Đình Tân Trào (Tuyên Quang) ngày nay, nơi họp Quốc dân Đại hội ngày 16/8/1945 (ảnh 2016).",
  credit: "Bùi Thụy Đào Nguyên, CC BY-SA 4.0",
  sourceUrl: `${COMMONS}%C4%90%C3%ACnh_T%C3%A2n_Tr%C3%A0o.jpg`,
};

const MIT_TINH_THAI_NGUYEN: LessonImage = {
  src: `${PHOTO}/mit-tinh-thai-nguyen.webp`,
  alt: "Ảnh đen trắng: đám đông đứng quanh một khoảng sân, giữa có cột cờ và bàn diễn giả",
  caption: "Lễ mít tinh thành lập chính quyền cách mạng tỉnh Thái Nguyên, ngày 20/8/1945.",
  credit: "Không rõ tác giả, Wikimedia Commons, phạm vi công cộng",
  sourceUrl: `${COMMONS}L%E1%BB%85_m%C3%ADt_tinh_th%C3%A0nh_l%E1%BA%ADp_Ch%C3%ADnh_quy%E1%BB%81n_c%C3%A1ch_m%E1%BA%A1ng_t%E1%BB%89nh_Th%C3%A1i_Nguy%C3%AAn_ng%C3%A0y_20-8-1945.png`,
};

const NHA_HAT_LON_17_8: LessonImage = {
  src: `${PHOTO}/nha-hat-lon-17-8.webp`,
  alt: "Ảnh đen trắng: đám đông chen kín bậc thềm Nhà hát Lớn Hà Nội, trên ban công treo cờ",
  caption: "Cuộc mít tinh ở Nhà hát Lớn Hà Nội ngày 17/8/1945 biến thành cuộc biểu dương lực lượng ủng hộ Việt Minh.",
  credit: "Mặt trận Việt Minh (© VARCHIV), Wikimedia Commons, phạm vi công cộng",
  sourceUrl: `${COMMONS}Rencontre_au_Grand_Op%C3%A9ra_de_Hano%C3%AF_le_17_ao%C3%BBt_1945.jpg`,
};

const BAN_TUYEN_NGON: LessonImage = {
  src: `${PHOTO}/ban-tuyen-ngon.webp`,
  alt: "Ba trang giấy đánh máy đã ngả vàng đặt cạnh nhau",
  caption: "Bản Tuyên ngôn Độc lập lưu tại Trung tâm Lưu trữ quốc gia III (Phông Phủ Thủ tướng, hồ sơ 586).",
  credit: "Trung tâm Lưu trữ quốc gia III, Wikimedia Commons, phạm vi công cộng",
  sourceUrl: `${COMMONS}B%E1%BA%A3n_Tuy%C3%AAn_ng%C3%B4n_%C4%91%E1%BB%99c_l%E1%BA%ADp_c%E1%BB%A7a_n%C6%B0%E1%BB%9Bc_Vi%E1%BB%87t_Nam_D%C3%A2n_ch%E1%BB%A7_C%E1%BB%99ng_h%C3%B2a._-_Trung_t%C3%A2m_L%C6%B0u_tr%E1%BB%AF_qu%E1%BB%91c_gia_III._Ph%C3%B4ng_Ph%E1%BB%A7_Th%E1%BB%A7_t%C6%B0%E1%BB%9Bng,_h%E1%BB%93_s%C6%A1_586,_t%E1%BB%9D_s%E1%BB%91_1_%E2%80%93_3.jpg`,
};

const NGO_MON_NAY: LessonImage = {
  src: `${PHOTO}/ngo-mon-nay.webp`,
  alt: "Công trình gỗ mái ngói cổ trên nền thành đá bên mặt nước, một góc Ngọ Môn Huế",
  caption: "Ngọ Môn (Huế) ngày nay — nơi vua Bảo Đại thoái vị chiều 30/8/1945 (ảnh 2008).",
  credit: "Vyacheslav Argenberg, CC BY 4.0",
  sourceUrl: `${COMMONS}Vietnam,_Hue,_Imperial_City_of_Hue,_The_Meridian_Gate.jpg`,
};

export const cachMangThangTamLesson: Lesson = {
  slug: "cach-mang-thang-tam-1945",
  eventSlug: "tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi",
  relatedEventSlugs: ["tuyen-ngon-doc-lap"],
  title: "Cách mạng tháng Tám năm 1945",
  dateText: "14/8 – 2/9/1945",
  tagline: "Nắm đúng thời cơ \"ngàn năm có một\", nhân dân cả nước nổi dậy giành chính quyền chỉ trong nửa tháng — và nước Việt Nam Dân chủ Cộng hòa ra đời.",
  copy: {
    cardDescription: "Bản đồ khởi nghĩa lan rộng theo từng ngày, ảnh và văn bản gốc năm 1945, video Tuyên ngôn Độc lập và thẻ ghi nhớ.",
    mapTitle: "Xem khởi nghĩa lan rộng theo từng ngày",
    mapHint: "Bản đồ đi từ căn cứ Tân Trào ra cả nước; nơi nào giành được chính quyền sẽ chuyển từ ô xanh sang ô đỏ sao vàng.",
    videoTitle: "Video tư liệu",
    resultsTitle: "Vì sao Cách mạng tháng Tám mở ra một kỷ nguyên mới?",
    todayTitle: "Những địa danh lịch sử ngày nay",
  },
  hero: {
    src: `${PHOTO}/mit-tinh-nha-hat-lon.webp`,
    alt: "Ảnh đen trắng: biển người và đội ngũ Giải phóng quân trước Nhà hát Lớn Hà Nội, trên mặt tiền treo cờ đỏ sao vàng",
    caption: "Mít tinh mừng Cách mạng tháng Tám thành công trước Nhà hát Lớn Hà Nội, cuối tháng 8/1945.",
    credit: "Không rõ tác giả, phạm vi công cộng",
    sourceUrl: `${COMMONS}M%C3%ADt_tinh_ch%C3%A0o_m%E1%BB%ABng_C%C3%A1ch_m%E1%BA%A1ng_Th%C3%A1ng_T%C3%A1m_n%C4%83m_1945_th%C3%A0nh_c%C3%B4ng_t%E1%BA%A1i_Nh%C3%A0_h%C3%A1t_L%E1%BB%9Bn_H%C3%A0_N%E1%BB%99i.jpg`,
  },
  heroStats: [
    { value: 15, label: "ngày Tổng khởi nghĩa thành công trên cả nước (14 – 28/8)" },
    { value: 4, label: "tỉnh giành chính quyền ở tỉnh lỵ sớm nhất (đến 18/8)" },
    { value: 10, label: "chính sách lớn của Việt Minh được Quốc dân Đại hội thông qua" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài: Cách mạng tháng Tám năm 1945",
    objectives: [
      "Nêu được bối cảnh lịch sử và thời cơ của Tổng khởi nghĩa tháng Tám năm 1945.",
      "Trình bày được diễn biến chính: từ lệnh Tổng khởi nghĩa ở Tân Trào tới thắng lợi ở Hà Nội, Huế, Sài Gòn và cả nước.",
      "Nêu được nội dung chính và ý nghĩa của bản Tuyên ngôn Độc lập ngày 2/9/1945.",
      "Phân tích được nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học về nắm bắt thời cơ.",
    ],
  },
  keyDates: [
    { date: "9/3/1945", text: "Nhật đảo chính Pháp, độc chiếm Đông Dương" },
    { date: "4/6/1945", text: "Thành lập Khu giải phóng Việt Bắc" },
    { date: "13/8/1945", text: "Ủy ban Khởi nghĩa toàn quốc ra Quân lệnh số 1" },
    { date: "16/8/1945", text: "Quốc dân Đại hội Tân Trào; Giải phóng quân tiến về Thái Nguyên" },
    { date: "19/8/1945", text: "Khởi nghĩa thắng lợi ở Hà Nội" },
    { date: "25/8/1945", text: "Khởi nghĩa thắng lợi ở Sài Gòn (Huế: 23/8)" },
    { date: "30/8/1945", text: "Vua Bảo Đại thoái vị tại Ngọ Môn (Huế)" },
    { date: "2/9/1945", text: "Tuyên ngôn Độc lập — nước Việt Nam Dân chủ Cộng hòa ra đời" },
  ],
  battle: cachMangThangTam1945,
  videos: [
    {
      youtubeId: "09MR7I0p7Ns",
      title: "Cách mạng Tháng Tám năm 1945: Bước ngoặt lịch sử",
      channel: "VTV — Ấn tượng VTV",
      note: "Toàn cảnh cuộc cách mạng — xem sau khi học xong phần bản đồ.",
    },
    {
      youtubeId: "u7kjhRCfj2o",
      title: "Ngày 19-8-1945: Cách mạng Tháng Tám thành công",
      channel: "Báo Quân đội nhân dân",
      note: "Gắn với bước \"Hà Nội khởi nghĩa thắng lợi\".",
    },
    {
      youtubeId: "xRKUB3fUTJM",
      title: "Toàn văn: Bác Hồ đọc Tuyên ngôn Độc lập",
      channel: "VTV24",
      note: "Nghe toàn văn bản Tuyên ngôn — gắn với bước cuối cùng.",
    },
  ],
  results: [
    { value: 15, label: "ngày để giành chính quyền trong cả nước" },
    { value: 80, suffix: "+", label: "năm thống trị của thực dân Pháp bị lật đổ" },
    { value: 3, label: "trung tâm lớn giành chính quyền: Hà Nội, Huế, Sài Gòn" },
  ],
  significance: [
    {
      title: "Mở ra kỷ nguyên độc lập, tự do",
      text: "Cách mạng đập tan ách thống trị của thực dân Pháp hơn 80 năm và phát xít Nhật gần 5 năm, lật đổ chế độ quân chủ; nhân dân Việt Nam từ thân phận nô lệ trở thành người làm chủ đất nước.",
    },
    {
      title: "Nhà nước dân chủ nhân dân đầu tiên ở Đông Nam Á",
      text: "Nước Việt Nam Dân chủ Cộng hòa ra đời; Đảng Cộng sản Đông Dương trở thành đảng lãnh đạo chính quyền trong cả nước.",
    },
    {
      title: "Cổ vũ các dân tộc thuộc địa",
      text: "Lần đầu tiên một dân tộc thuộc địa tự đứng lên giải phóng mình, góp phần cổ vũ phong trào giải phóng dân tộc ở châu Á, châu Phi và Mỹ Latinh.",
    },
    {
      title: "Bài học: chuẩn bị lâu dài, chớp đúng thời cơ",
      text: "Thắng lợi nhờ truyền thống yêu nước, sự lãnh đạo của Đảng và Hồ Chí Minh, khối đoàn kết trong Mặt trận Việt Minh, quá trình chuẩn bị 15 năm và quyết định phát động Tổng khởi nghĩa đúng lúc Nhật đầu hàng.",
    },
  ],
  quote: {
    text: "Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do, độc lập.\nToàn thể dân Việt Nam quyết đem tất cả tinh thần và lực lượng, tính mạng và của cải để giữ vững quyền tự do, độc lập ấy.",
    author: "Hồ Chí Minh, Tuyên ngôn Độc lập (2/9/1945)",
  },
  figures: [
    {
      name: "Hồ Chí Minh",
      role: "Chủ tịch Chính phủ lâm thời",
      text: "Gửi thư kêu gọi đồng bào Tổng khởi nghĩa; được Quốc dân Đại hội Tân Trào bầu làm Chủ tịch Ủy ban Dân tộc giải phóng. Người soạn thảo và đọc bản Tuyên ngôn Độc lập ngày 2/9/1945.",
      href: "/nhan-vat/ho-chi-minh",
      image: HO_CHI_MINH_PORTRAIT,
    },
    {
      name: "Trường Chinh",
      role: "Tổng Bí thư Đảng (từ năm 1941)",
      text: "Cùng Trung ương Đảng lãnh đạo cao trào kháng Nhật cứu nước và Hội nghị toàn quốc của Đảng ở Tân Trào (14 – 15/8/1945) quyết định phát động Tổng khởi nghĩa.",
      href: "/nhan-vat/truong-chinh",
      image: TRUONG_CHINH_PORTRAIT,
    },
    {
      name: "Võ Nguyên Giáp",
      role: "Chỉ huy Giải phóng quân",
      text: "Chiều 16/8/1945 chỉ huy một đơn vị Giải phóng quân từ Tân Trào tiến về giải phóng thị xã Thái Nguyên, mở đầu Tổng khởi nghĩa; sau đó là Bộ trưởng Bộ Nội vụ của Chính phủ lâm thời.",
      href: "/nhan-vat/vo-nguyen-giap",
      image: VO_NGUYEN_GIAP_PORTRAIT,
    },
    {
      name: "Trần Huy Liệu",
      role: "Đại diện Chính phủ lâm thời",
      text: "Dẫn đầu phái đoàn của Chính phủ lâm thời vào Huế; chiều 30/8/1945 tại Ngọ Môn nhận ấn và kiếm từ vua Bảo Đại, đánh dấu sự sụp đổ của chế độ quân chủ.",
    },
  ],
  flashcards: [
    { question: "Ngày 9/3/1945 ở Đông Dương đã xảy ra sự kiện gì?", answer: "Nhật đảo chính lật đổ Pháp, độc chiếm Đông Dương." },
    { question: "Khu giải phóng Việt Bắc thành lập ngày nào, gồm mấy tỉnh?", answer: "Ngày 4/6/1945, gồm 6 tỉnh: Cao Bằng, Bắc Kạn, Lạng Sơn, Hà Giang, Tuyên Quang, Thái Nguyên." },
    { question: "Văn bản nào phát lệnh Tổng khởi nghĩa trong cả nước?", answer: "Quân lệnh số 1 của Ủy ban Khởi nghĩa toàn quốc, ra lúc 23 giờ ngày 13/8/1945." },
    { question: "Bốn tỉnh nào giành chính quyền ở tỉnh lỵ sớm nhất?", answer: "Bắc Giang, Hải Dương, Hà Tĩnh và Quảng Nam (đến ngày 18/8/1945)." },
    { question: "Khởi nghĩa thắng lợi ở Hà Nội, Huế, Sài Gòn vào những ngày nào?", answer: "Hà Nội 19/8, Huế 23/8, Sài Gòn 25/8/1945." },
    { question: "Tổng khởi nghĩa thành công trên cả nước trong bao lâu?", answer: "Khoảng 15 ngày, từ 14 đến 28/8/1945." },
    { question: "Tuyên ngôn Độc lập được đọc ở đâu, khi nào?", answer: "Tại Quảng trường Ba Đình (Hà Nội), chiều 2/9/1945, do Chủ tịch Hồ Chí Minh đọc." },
  ],
  quiz: [
    {
      question: "Văn bản trong ảnh do Ủy ban Khởi nghĩa toàn quốc ban hành đêm 13/8/1945 là gì?",
      image: {
        src: `${PHOTO}/quan-lenh-so-1.webp`,
        alt: "Văn bản đánh máy mực tím đã phai, dòng đầu có chữ khởi nghĩa",
        caption: "Quân lệnh số 1, 23 giờ ngày 13/8/1945.",
        credit: "Trung tâm Lưu trữ quốc gia III, Wikimedia Commons, phạm vi công cộng",
        sourceUrl: `${COMMONS}Qu%C3%A2n_l%E1%BB%87nh_s%E1%BB%91_1_c%E1%BB%A7a_%E1%BB%A6y_ban_Kh%E1%BB%9Fi_ngh%C4%A9a_to%C3%A0n_qu%E1%BB%91c,_ng%C3%A0y_13-08-1945.jpg`,
      },
      choices: ["Quân lệnh số 1", "Tuyên ngôn Độc lập", "Chỉ thị \"Nhật – Pháp bắn nhau và hành động của chúng ta\"", "Lời kêu gọi toàn quốc kháng chiến"],
      correct: 0,
      explanation: "Quân lệnh số 1 phát lệnh Tổng khởi nghĩa trong cả nước. Chỉ thị \"Nhật – Pháp bắn nhau…\" ra ngày 12/3/1945; Lời kêu gọi toàn quốc kháng chiến là của tháng 12/1946.",
    },
    {
      question: "Vì sao tháng 8/1945 được gọi là thời cơ \"ngàn năm có một\"?",
      choices: [
        "Nhật đầu hàng Đồng minh, chính quyền thân Nhật tê liệt, quân Đồng minh chưa vào Đông Dương",
        "Pháp quay lại Đông Dương nhưng lực lượng còn yếu",
        "Quân Đồng minh đã vào Đông Dương và ủng hộ Việt Minh",
        "Nhật đảo chính Pháp, độc chiếm Đông Dương",
      ],
      correct: 0,
      explanation: "Kẻ thù cũ (Pháp) đã bị Nhật lật đổ, kẻ thù mới (Nhật) vừa đầu hàng, quân Đồng minh chưa kịp vào — khoảng trống quyền lực ngắn ngủi mà cách mạng đã chuẩn bị 15 năm để chờ đón.",
    },
    {
      question: "Bốn tỉnh giành chính quyền ở tỉnh lỵ sớm nhất cả nước trong Cách mạng tháng Tám là:",
      choices: ["Bắc Giang, Hải Dương, Hà Tĩnh, Quảng Nam", "Hà Nội, Huế, Sài Gòn, Hải Phòng", "Cao Bằng, Bắc Kạn, Lạng Sơn, Hà Giang", "Thái Nguyên, Tuyên Quang, Hà Tĩnh, Nghệ An"],
      correct: 0,
      explanation: "Đến ngày 18/8/1945, Bắc Giang, Hải Dương, Hà Tĩnh và Quảng Nam giành chính quyền ở tỉnh lỵ sớm nhất. Cao Bằng, Bắc Kạn, Lạng Sơn, Hà Giang thuộc Khu giải phóng Việt Bắc lập từ tháng 6.",
    },
    {
      question: "Ảnh chụp lễ mít tinh thành lập chính quyền cách mạng ngày 20/8/1945 ở thị xã nào — nơi Giải phóng quân từ Tân Trào tiến về từ chiều 16/8?",
      image: MIT_TINH_THAI_NGUYEN,
      choices: ["Thái Nguyên", "Tuyên Quang", "Bắc Giang", "Lạng Sơn"],
      correct: 0,
      explanation: "Chiều 16/8/1945, đơn vị Giải phóng quân do Võ Nguyên Giáp chỉ huy từ Tân Trào tiến về giải phóng thị xã Thái Nguyên, mở đầu Tổng khởi nghĩa.",
    },
    {
      question: "Cuộc mít tinh trong ảnh, ngày 17/8/1945 ở Nhà hát Lớn Hà Nội, có gì đặc biệt?",
      image: NHA_HAT_LON_17_8,
      choices: [
        "Mít tinh của công chức ủng hộ chính phủ thân Nhật bị quần chúng biến thành cuộc biểu dương ủng hộ Việt Minh",
        "Đây là lễ đọc Tuyên ngôn Độc lập",
        "Đây là lễ vua Bảo Đại thoái vị",
        "Đây là lễ ra mắt Quốc hội khóa đầu tiên",
      ],
      correct: 0,
      explanation: "Ngày 17/8, quần chúng do Việt Minh tổ chức đã \"đổi chiều\" cuộc mít tinh của Tổng hội viên chức; hai ngày sau (19/8) Hà Nội tổng khởi nghĩa. Tuyên ngôn Độc lập được đọc ở Ba Đình ngày 2/9; Bảo Đại thoái vị ở Huế ngày 30/8.",
    },
    {
      question: "Vua Bảo Đại tuyên bố thoái vị ở đâu, vào ngày nào?",
      image: NGO_MON_NAY,
      choices: ["Ngọ Môn (Huế), 30/8/1945", "Nhà hát Lớn (Hà Nội), 19/8/1945", "Quảng trường Ba Đình (Hà Nội), 2/9/1945", "Dinh Độc Lập (Sài Gòn), 25/8/1945"],
      correct: 0,
      explanation: "Chiều 30/8/1945, tại Ngọ Môn, Bảo Đại thoái vị và trao ấn, kiếm cho đại diện Chính phủ lâm thời — chế độ quân chủ ở Việt Nam chấm dứt.",
    },
    {
      question: "Văn bản trong ảnh, lưu tại Trung tâm Lưu trữ quốc gia III, là văn kiện nào?",
      image: BAN_TUYEN_NGON,
      choices: ["Tuyên ngôn Độc lập (2/9/1945)", "Hiệp định Sơ bộ (6/3/1946)", "Hiến pháp năm 1946", "Chiếu thoái vị của Bảo Đại"],
      correct: 0,
      explanation: "Đây là bản Tuyên ngôn Độc lập của nước Việt Nam Dân chủ Cộng hòa, được Chủ tịch Hồ Chí Minh đọc tại Quảng trường Ba Đình chiều 2/9/1945.",
    },
    {
      question: "Tuyên ngôn Độc lập năm 1945 mở đầu bằng việc trích dẫn hai bản tuyên ngôn nào?",
      choices: [
        "Tuyên ngôn Độc lập của Mỹ (1776) và Tuyên ngôn Nhân quyền và Dân quyền của Pháp (1791)",
        "Tuyên ngôn của Đảng Cộng sản (1848) và Tuyên ngôn Độc lập của Mỹ (1776)",
        "Hiến chương Liên hợp quốc (1945) và Tuyên ngôn Nhân quyền của Pháp (1791)",
        "Tuyên ngôn Độc lập của Mỹ (1776) và Hiến chương Đại Tây Dương (1941)",
      ],
      correct: 0,
      explanation: "Hồ Chí Minh dẫn \"những lời bất hủ\" của Tuyên ngôn Độc lập Mỹ và Tuyên ngôn Nhân quyền và Dân quyền của Pháp, rồi dùng chính lẽ phải ấy để tố cáo tội ác của thực dân Pháp.",
    },
  ],
  today: [
    DINH_TAN_TRAO,
    {
      src: `${PHOTO}/cay-da-tan-trao.webp`,
      alt: "Cây đa cổ thụ rễ to xù xì đứng giữa khu đất trống",
      caption: "Cây đa Tân Trào, nơi Giải phóng quân làm lễ xuất quân chiều 16/8/1945 (ảnh 2008).",
      credit: "Liftold, CC BY-SA 3.0",
      sourceUrl: `${COMMONS}C%C3%A2y_%C4%90a_l%E1%BB%8Bch_s%E1%BB%AD_T%C3%A2n_Tr%C3%A0o.JPG`,
    },
    {
      src: `${PHOTO}/lan-na-lua.webp`,
      alt: "Căn lán nhỏ mái lá, sàn tre, trong rừng, có biển tên Lán Nà Lừa",
      caption: "Lán Nà Lừa (Tân Trào), nơi Hồ Chí Minh ở và làm việc trong những ngày trước Tổng khởi nghĩa (ảnh 2008).",
      credit: "Liftold, CC BY-SA 3.0",
      sourceUrl: `${COMMONS}L%C3%A1n_N%C3%A1_L%E1%BB%ABa.JPG`,
    },
    {
      src: `${PHOTO}/nha-hat-lon-nay.webp`,
      alt: "Nhà hát Lớn Hà Nội ngày nay, mặt tiền kiến trúc Pháp màu vàng nhạt",
      caption: "Nhà hát Lớn Hà Nội — nơi mở đầu cuộc khởi nghĩa ngày 19/8/1945 (ảnh 2009).",
      credit: "Dennis G. Jarvis, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}Hanoi_Opera_House_1.jpg`,
    },
    {
      src: `${PHOTO}/quang-truong-ba-dinh-nay.webp`,
      alt: "Quảng trường Ba Đình rộng với các ô cỏ, phía xa là Lăng Chủ tịch Hồ Chí Minh",
      caption: "Quảng trường Ba Đình — nơi đọc Tuyên ngôn Độc lập ngày 2/9/1945 (ảnh 2008).",
      credit: "Vyacheslav Argenberg, CC BY 4.0",
      sourceUrl: `${COMMONS}Hanoi,_Vietnam,_Ba_Dinh_Square_and_Ho_Chi_Minh_Mausoleum.jpg`,
    },
    NGO_MON_NAY,
  ],
  toVerify: [
    "Số bài và số trang trong SGK Lịch sử 12 Kết nối tri thức.",
    "Ngày họp Hội nghị toàn quốc của Đảng ở Tân Trào: 14 – 15/8/1945 (một số tài liệu ghi 13 – 15/8).",
    "Thời điểm ra Quân lệnh số 1: 23 giờ ngày 13/8/1945.",
    "Bốn tỉnh giành chính quyền ở tỉnh lỵ sớm nhất và mốc \"đến 18/8\".",
    "Đồng Nai Thượng và Hà Tiên giành chính quyền cuối cùng (28/8); vị trí tỉnh lỵ Đồng Nai Thượng trên bản đồ là gần đúng.",
    "Cây đa Tân Trào là nơi làm lễ xuất quân ngày 16/8 và Lán Nà Lừa là nơi Hồ Chí Minh ở — đối chiếu với tài liệu của Khu di tích Tân Trào.",
    "Con số khoảng 2 triệu người chết trong nạn đói năm 1945.",
  ],
};
