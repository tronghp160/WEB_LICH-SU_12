// Khung SGK Lịch sử 12 (bộ Kết nối tri thức với cuộc sống): 6 chủ đề, 17 bài — bộ khung để HỌC THEO BÀI
// (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 8.1). Viết tĩnh trong code, không cần migration.
//
// Chỉ dùng TÊN chủ đề/bài/mục (thông tin mục lục), không chép nội dung sách. Tên mục và yêu cầu cần đạt được diễn đạt
// lại theo chương trình môn Lịch sử 2018 và cần đối chiếu từng chữ với SGK in (xem docs/du-lieu-can-kiem-chung.md).
// Hàm thuần — dùng được ở server, client và unit test.

/** Khóa màu gáy sách của chủ đề (biến CSS --topic-<khóa> trong globals.css). */
export type SgkTopicColor = "than" | "luc-lam" | "son" | "o-liu" | "tim-than" | "dong";

export type SgkSection = {
  /** Neo trong trang Bài: /bai/7-khang-chien-chong-phap#muc-2. */
  id: string;
  /** Số thứ tự mục như SGK ("1", "2"…). */
  numeral: string;
  title: string;
  /** Sự kiện trong database thuộc mục này (slug của historical_events). Một sự kiện được thuộc nhiều bài. */
  eventSlugs?: string[];
  /** Chuyên đề tương tác (slug trong lib/lessons) học sâu cho mục này. */
  featureSlugs?: string[];
};

export type SgkLesson = {
  number: number;
  /** "7-khang-chien-chong-phap" → /bai/7-khang-chien-chong-phap. */
  slug: string;
  title: string;
  /** Tên gọn cho menu, thẻ nhỏ. */
  shortTitle: string;
  /** Số tiết theo phân phối chương trình. */
  periods: number;
  /** Yêu cầu cần đạt (diễn đạt lại theo chương trình 2018). */
  goals: string[];
  sections: SgkSection[];
};

export type SgkTopic = {
  number: number;
  /** "chu-de-3" → /muc-luc/chu-de-3. */
  slug: string;
  title: string;
  shortTitle: string;
  periods: number;
  color: SgkTopicColor;
  /** Giới thiệu 2–3 câu ở trang chủ đề. */
  summary: string;
  lessons: SgkLesson[];
};

/** Trạng thái nội dung của một bài trên web (không phải tiến độ của người học). */
export type SgkLessonStatus = "ready" | "partial" | "drafting";

export const SGK_SERIES = "Lịch sử 12 · Kết nối tri thức với cuộc sống";

export const SGK_12: SgkTopic[] = [
  {
    number: 1,
    slug: "chu-de-1",
    title: "Thế giới trong và sau Chiến tranh lạnh",
    shortTitle: "Thế giới trong và sau Chiến tranh lạnh",
    periods: 6,
    color: "than",
    summary:
      "Sự ra đời và vai trò của Liên hợp quốc, trật tự thế giới hai cực Ianta trong Chiến tranh lạnh và xu thế phát triển của thế giới sau khi Chiến tranh lạnh kết thúc.",
    lessons: [
      {
        number: 1,
        slug: "1-lien-hop-quoc",
        title: "Liên hợp quốc",
        shortTitle: "Liên hợp quốc",
        periods: 2,
        goals: [
          "Nêu được bối cảnh lịch sử và quá trình thành lập Liên hợp quốc.",
          "Trình bày được mục tiêu và nguyên tắc hoạt động của Liên hợp quốc.",
          "Đánh giá được vai trò của Liên hợp quốc trong việc duy trì hòa bình, an ninh và hợp tác quốc tế.",
        ],
        sections: [
          {
            id: "muc-1",
            numeral: "1",
            title: "Sự ra đời của Liên hợp quốc",
            eventSlugs: ["hoi-nghi-ianta-1945", "thanh-lap-lien-hop-quoc-1945"],
          },
          { id: "muc-2", numeral: "2", title: "Mục tiêu và nguyên tắc hoạt động" },
          { id: "muc-3", numeral: "3", title: "Vai trò của Liên hợp quốc" },
        ],
      },
      {
        number: 2,
        slug: "2-trat-tu-the-gioi-trong-chien-tranh-lanh",
        title: "Trật tự thế giới trong Chiến tranh lạnh",
        shortTitle: "Trật tự thế giới trong Chiến tranh lạnh",
        periods: 2,
        goals: [
          "Trình bày được sự hình thành và đặc trưng của trật tự thế giới hai cực Ianta.",
          "Giải thích được nguyên nhân và tác động của sự sụp đổ trật tự hai cực Ianta.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Sự hình thành trật tự thế giới hai cực Ianta", eventSlugs: ["hoi-nghi-ianta-1945"] },
          {
            id: "muc-2",
            numeral: "2",
            title: "Sự sụp đổ của trật tự thế giới hai cực Ianta",
            eventSlugs: ["hoi-nghi-manta-1989", "lien-xo-tan-ra-1991"],
          },
        ],
      },
      {
        number: 3,
        slug: "3-trat-tu-the-gioi-sau-chien-tranh-lanh",
        title: "Trật tự thế giới sau Chiến tranh lạnh",
        shortTitle: "Trật tự thế giới sau Chiến tranh lạnh",
        periods: 2,
        goals: [
          "Trình bày được xu thế phát triển của thế giới sau Chiến tranh lạnh.",
          "Phân tích được xu thế đa cực trong quan hệ quốc tế hiện nay.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Thế giới sau Chiến tranh lạnh", eventSlugs: ["lien-xo-tan-ra-1991"] },
          { id: "muc-2", numeral: "2", title: "Xu thế đa cực trong quan hệ quốc tế" },
        ],
      },
    ],
  },
  {
    number: 2,
    slug: "chu-de-2",
    title: "ASEAN: Những chặng đường lịch sử",
    shortTitle: "ASEAN: Những chặng đường lịch sử",
    periods: 4,
    color: "luc-lam",
    summary:
      "Hiệp hội các quốc gia Đông Nam Á từ khi ra đời năm 1967, mở rộng thành ASEAN 10, đến khi xây dựng Cộng đồng ASEAN với ba trụ cột.",
    lessons: [
      {
        number: 4,
        slug: "4-su-ra-doi-va-phat-trien-cua-asean",
        title: "Sự ra đời và phát triển của Hiệp hội các quốc gia Đông Nam Á (ASEAN)",
        shortTitle: "Sự ra đời và phát triển của ASEAN",
        periods: 2,
        goals: [
          "Nêu được bối cảnh lịch sử và quá trình thành lập ASEAN.",
          "Trình bày được các giai đoạn phát triển chính của ASEAN, từ ASEAN 5 đến ASEAN 10.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Sự ra đời của ASEAN", eventSlugs: ["thanh-lap-asean-1967"] },
          { id: "muc-2", numeral: "2", title: "Quá trình phát triển của ASEAN", eventSlugs: ["viet-nam-gia-nhap-asean-1995"] },
        ],
      },
      {
        number: 5,
        slug: "5-cong-dong-asean",
        title: "Cộng đồng ASEAN: Từ ý tưởng đến hiện thực",
        shortTitle: "Cộng đồng ASEAN",
        periods: 2,
        goals: [
          "Nêu được ý tưởng, mục tiêu và kế hoạch xây dựng Cộng đồng ASEAN.",
          "Trình bày được ba trụ cột của Cộng đồng ASEAN; nêu được thời cơ và thách thức.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Ý tưởng và mục tiêu xây dựng Cộng đồng ASEAN", eventSlugs: ["cong-dong-asean-2015"] },
          { id: "muc-2", numeral: "2", title: "Ba trụ cột của Cộng đồng ASEAN" },
          { id: "muc-3", numeral: "3", title: "Thời cơ và thách thức" },
        ],
      },
    ],
  },
  {
    number: 3,
    slug: "chu-de-3",
    title:
      "Cách mạng tháng Tám năm 1945, chiến tranh giải phóng dân tộc và chiến tranh bảo vệ Tổ quốc trong lịch sử Việt Nam (từ tháng 8/1945 đến nay)",
    shortTitle: "Cách mạng tháng Tám 1945 và các cuộc kháng chiến",
    periods: 9,
    color: "son",
    summary:
      "Từ Tổng khởi nghĩa tháng Tám năm 1945, qua hai cuộc kháng chiến chống Pháp và chống Mỹ, đến các cuộc đấu tranh bảo vệ biên giới và chủ quyền biển đảo sau năm 1975.",
    lessons: [
      {
        number: 6,
        slug: "6-cach-mang-thang-tam-nam-1945",
        title: "Cách mạng tháng Tám năm 1945",
        shortTitle: "Cách mạng tháng Tám năm 1945",
        periods: 2,
        goals: [
          "Nêu được bối cảnh lịch sử và diễn biến chính của Cách mạng tháng Tám năm 1945.",
          "Phân tích được nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học kinh nghiệm của cuộc cách mạng.",
        ],
        sections: [
          {
            id: "muc-1",
            numeral: "1",
            title: "Khái quát về Cách mạng tháng Tám năm 1945",
            eventSlugs: ["nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang", "tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi", "tuyen-ngon-doc-lap"],
            featureSlugs: ["cach-mang-thang-tam-1945"],
          },
          { id: "muc-2", numeral: "2", title: "Nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học kinh nghiệm" },
        ],
      },
      {
        number: 7,
        slug: "7-khang-chien-chong-phap",
        title: "Cuộc kháng chiến chống thực dân Pháp (1945–1954)",
        shortTitle: "Kháng chiến chống thực dân Pháp",
        periods: 2,
        goals: [
          "Nêu được những nét chính của cuộc kháng chiến chống thực dân Pháp qua các giai đoạn 1945–1954.",
          "Trình bày được diễn biến chính và ý nghĩa của chiến dịch Điện Biên Phủ năm 1954.",
          "Phân tích được nguyên nhân thắng lợi và ý nghĩa lịch sử của cuộc kháng chiến.",
        ],
        sections: [
          {
            id: "muc-1",
            numeral: "1",
            title: "Những năm đầu sau Cách mạng tháng Tám (1945–1946)",
            eventSlugs: ["hiep-dinh-so-bo-6-3-1946", "toan-quoc-khang-chien-19-12-1946"],
          },
          { id: "muc-2", numeral: "2", title: "Giai đoạn 1946–1950" },
          {
            id: "muc-3",
            numeral: "3",
            title: "Giai đoạn 1951–1954 và chiến dịch Điện Biên Phủ",
            eventSlugs: ["chien-dich-dien-bien-phu", "hiep-dinh-geneve-ve-dong-duong"],
            featureSlugs: ["chien-dich-dien-bien-phu"],
          },
          { id: "muc-4", numeral: "4", title: "Nguyên nhân thắng lợi và ý nghĩa lịch sử" },
        ],
      },
      {
        number: 8,
        slug: "8-khang-chien-chong-my-cuu-nuoc",
        title: "Cuộc kháng chiến chống Mỹ, cứu nước (1954–1975)",
        shortTitle: "Kháng chiến chống Mỹ, cứu nước",
        periods: 3,
        goals: [
          "Nêu được những nét chính của cuộc kháng chiến chống Mỹ, cứu nước qua các giai đoạn 1954–1975.",
          "Trình bày được các sự kiện tiêu biểu: Tết Mậu Thân 1968, Hiệp định Paris 1973, chiến dịch Hồ Chí Minh 1975.",
          "Phân tích được nguyên nhân thắng lợi và ý nghĩa lịch sử của cuộc kháng chiến.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Giai đoạn 1954–1965" },
          {
            id: "muc-2",
            numeral: "2",
            title: "Giai đoạn 1965–1973",
            eventSlugs: ["tong-tien-cong-va-noi-day-tet-mau-than-1968", "ha-noi-dien-bien-phu-tren-khong-1972", "hiep-dinh-paris-ve-viet-nam"],
            featureSlugs: ["tet-mau-than-1968"],
          },
          {
            id: "muc-3",
            numeral: "3",
            title: "Giai đoạn 1973–1975: giải phóng hoàn toàn miền Nam",
            eventSlugs: ["chien-dich-ho-chi-minh"],
            featureSlugs: ["chien-dich-ho-chi-minh-1975"],
          },
          { id: "muc-4", numeral: "4", title: "Nguyên nhân thắng lợi và ý nghĩa lịch sử" },
        ],
      },
      {
        number: 9,
        slug: "9-bao-ve-to-quoc-tu-sau-thang-4-1975",
        title: "Cuộc đấu tranh bảo vệ Tổ quốc từ sau tháng 4/1975 đến nay",
        shortTitle: "Bảo vệ Tổ quốc từ sau tháng 4/1975",
        periods: 2,
        goals: [
          "Nêu được nét chính về các cuộc đấu tranh bảo vệ biên giới Tây Nam, biên giới phía Bắc và chủ quyền ở Biển Đông.",
          "Rút ra được ý nghĩa và bài học của các cuộc đấu tranh bảo vệ Tổ quốc.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Đấu tranh bảo vệ biên giới Tây Nam", eventSlugs: ["chien-tranh-bao-ve-bien-gioi-tay-nam"] },
          { id: "muc-2", numeral: "2", title: "Đấu tranh bảo vệ biên giới phía Bắc", eventSlugs: ["chien-tranh-bao-ve-bien-gioi-phia-bac-1979"] },
          { id: "muc-3", numeral: "3", title: "Đấu tranh bảo vệ chủ quyền ở Biển Đông", eventSlugs: ["bao-ve-chu-quyen-gac-ma-1988"] },
          { id: "muc-4", numeral: "4", title: "Ý nghĩa và bài học" },
        ],
      },
    ],
  },
  {
    number: 4,
    slug: "chu-de-4",
    title: "Công cuộc Đổi mới ở Việt Nam từ năm 1986 đến nay",
    shortTitle: "Công cuộc Đổi mới từ năm 1986",
    periods: 6,
    color: "o-liu",
    summary:
      "Công cuộc Đổi mới toàn diện bắt đầu từ Đại hội VI của Đảng (1986): các giai đoạn chính, những thành tựu cơ bản và bài học kinh nghiệm.",
    lessons: [
      {
        number: 10,
        slug: "10-khai-quat-ve-cong-cuoc-doi-moi",
        title: "Khái quát về công cuộc Đổi mới từ năm 1986 đến nay",
        shortTitle: "Khái quát về công cuộc Đổi mới",
        periods: 3,
        goals: [
          "Nêu được bối cảnh và nét chính của công cuộc Đổi mới qua các giai đoạn từ năm 1986 đến nay.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Giai đoạn 1986–1995: khởi đầu công cuộc Đổi mới", eventSlugs: ["dai-hoi-dang-lan-thu-vi"] },
          { id: "muc-2", numeral: "2", title: "Giai đoạn 1996–2006: đẩy mạnh công nghiệp hóa, hiện đại hóa" },
          { id: "muc-3", numeral: "3", title: "Giai đoạn từ năm 2006 đến nay: hội nhập quốc tế sâu rộng", eventSlugs: ["viet-nam-gia-nhap-wto-2007"] },
        ],
      },
      {
        number: 11,
        slug: "11-thanh-tuu-va-bai-hoc-cua-cong-cuoc-doi-moi",
        title: "Thành tựu cơ bản và bài học của công cuộc Đổi mới",
        shortTitle: "Thành tựu và bài học của Đổi mới",
        periods: 3,
        goals: [
          "Trình bày được những thành tựu cơ bản của công cuộc Đổi mới trên các lĩnh vực.",
          "Rút ra được bài học kinh nghiệm của công cuộc Đổi mới.",
        ],
        sections: [
          { id: "muc-1", numeral: "1", title: "Thành tựu cơ bản" },
          { id: "muc-2", numeral: "2", title: "Bài học kinh nghiệm" },
        ],
      },
    ],
  },
  {
    number: 5,
    slug: "chu-de-5",
    title: "Lịch sử đối ngoại của Việt Nam thời cận – hiện đại",
    shortTitle: "Lịch sử đối ngoại của Việt Nam",
    periods: 5,
    color: "tim-than",
    summary:
      "Hoạt động đối ngoại trong đấu tranh giành độc lập đầu thế kỉ XX, trong hai cuộc kháng chiến chống Pháp và chống Mỹ, và từ năm 1975 đến nay.",
    lessons: [
      {
        number: 12,
        slug: "12-doi-ngoai-dau-the-ki-xx-den-1945",
        title: "Hoạt động đối ngoại của Việt Nam trong đấu tranh giành độc lập dân tộc (đầu thế kỉ XX – 1945)",
        shortTitle: "Đối ngoại đầu thế kỉ XX – 1945",
        periods: 1,
        goals: ["Nêu được những hoạt động đối ngoại chủ yếu của các nhà yêu nước và của Nguyễn Ái Quốc từ đầu thế kỉ XX đến năm 1945."],
        sections: [
          { id: "muc-1", numeral: "1", title: "Hoạt động đối ngoại của các nhà yêu nước đầu thế kỉ XX" },
          {
            id: "muc-2",
            numeral: "2",
            title: "Hoạt động đối ngoại của Nguyễn Ái Quốc",
            eventSlugs: ["nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc", "ban-yeu-sach-cua-nhan-dan-an-nam-1919"],
          },
        ],
      },
      {
        number: 13,
        slug: "13-doi-ngoai-trong-khang-chien-1945-1975",
        title: "Hoạt động đối ngoại của Việt Nam trong kháng chiến chống Pháp và chống Mỹ (1945–1975)",
        shortTitle: "Đối ngoại trong kháng chiến (1945–1975)",
        periods: 2,
        goals: ["Trình bày được những hoạt động đối ngoại chủ yếu trong hai cuộc kháng chiến, gắn với các hiệp định năm 1946, 1954 và 1973."],
        sections: [
          {
            id: "muc-1",
            numeral: "1",
            title: "Đối ngoại trong kháng chiến chống thực dân Pháp (1945–1954)",
            eventSlugs: ["hiep-dinh-so-bo-6-3-1946", "hiep-dinh-geneve-ve-dong-duong"],
          },
          { id: "muc-2", numeral: "2", title: "Đối ngoại trong kháng chiến chống Mỹ, cứu nước (1954–1975)", eventSlugs: ["hiep-dinh-paris-ve-viet-nam"] },
        ],
      },
      {
        number: 14,
        slug: "14-doi-ngoai-tu-nam-1975-den-nay",
        title: "Hoạt động đối ngoại của Việt Nam từ năm 1975 đến nay",
        shortTitle: "Đối ngoại từ năm 1975 đến nay",
        periods: 2,
        goals: ["Nêu được những thành tựu chủ yếu của hoạt động đối ngoại Việt Nam từ năm 1975 đến nay."],
        sections: [
          { id: "muc-1", numeral: "1", title: "Giai đoạn 1975–1985", eventSlugs: ["viet-nam-gia-nhap-lien-hop-quoc-1977"] },
          {
            id: "muc-2",
            numeral: "2",
            title: "Giai đoạn từ năm 1986 đến nay",
            eventSlugs: ["viet-nam-gia-nhap-asean-1995", "binh-thuong-hoa-quan-he-viet-my-1995", "viet-nam-gia-nhap-wto-2007"],
          },
        ],
      },
    ],
  },
  {
    number: 6,
    slug: "chu-de-6",
    title: "Hồ Chí Minh trong lịch sử Việt Nam",
    shortTitle: "Hồ Chí Minh trong lịch sử Việt Nam",
    periods: 7,
    color: "dong",
    summary:
      "Cuộc đời, sự nghiệp của Chủ tịch Hồ Chí Minh — anh hùng giải phóng dân tộc — và dấu ấn của Người trong lòng nhân dân Việt Nam và thế giới.",
    lessons: [
      {
        number: 15,
        slug: "15-khai-quat-cuoc-doi-va-su-nghiep-ho-chi-minh",
        title: "Khái quát về cuộc đời và sự nghiệp của Hồ Chí Minh",
        shortTitle: "Cuộc đời và sự nghiệp Hồ Chí Minh",
        periods: 2,
        goals: ["Nêu được những nét chính về tiểu sử và các giai đoạn hoạt động chủ yếu của Hồ Chí Minh."],
        sections: [
          { id: "muc-1", numeral: "1", title: "Tiểu sử" },
          { id: "muc-2", numeral: "2", title: "Các giai đoạn hoạt động chủ yếu", eventSlugs: ["nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc"] },
        ],
      },
      {
        number: 16,
        slug: "16-ho-chi-minh-anh-hung-giai-phong-dan-toc",
        title: "Hồ Chí Minh – Anh hùng giải phóng dân tộc",
        shortTitle: "Anh hùng giải phóng dân tộc",
        periods: 3,
        goals: [
          "Phân tích được vai trò của Hồ Chí Minh trong việc tìm đường cứu nước, thành lập Đảng và lãnh đạo Cách mạng tháng Tám.",
          "Trình bày được vai trò của Hồ Chí Minh trong các cuộc kháng chiến và xây dựng đất nước.",
        ],
        sections: [
          {
            id: "muc-1",
            numeral: "1",
            title: "Tìm đường cứu nước",
            eventSlugs: ["nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc", "ban-yeu-sach-cua-nhan-dan-an-nam-1919"],
          },
          {
            id: "muc-2",
            numeral: "2",
            title: "Lãnh đạo Cách mạng tháng Tám, khai sinh nước Việt Nam Dân chủ Cộng hòa",
            eventSlugs: ["nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang", "tuyen-ngon-doc-lap"],
          },
          { id: "muc-3", numeral: "3", title: "Lãnh đạo kháng chiến và xây dựng đất nước" },
        ],
      },
      {
        number: 17,
        slug: "17-dau-an-ho-chi-minh",
        title: "Dấu ấn Hồ Chí Minh trong lòng nhân dân thế giới và Việt Nam",
        shortTitle: "Dấu ấn Hồ Chí Minh",
        periods: 2,
        goals: ["Nêu được những dấu ấn của Hồ Chí Minh trong lòng nhân dân thế giới và nhân dân Việt Nam."],
        sections: [
          { id: "muc-1", numeral: "1", title: "Trong lòng nhân dân thế giới", eventSlugs: ["unesco-ton-vinh-ho-chi-minh-1987"] },
          { id: "muc-2", numeral: "2", title: "Trong lòng nhân dân Việt Nam" },
        ],
      },
    ],
  },
];

/** Bài kèm chủ đề chứa nó, theo thứ tự 1 → 17. */
export type SgkLessonEntry = SgkLesson & { topic: SgkTopic };

/** Danh sách bài (kèm chủ đề) theo thứ tự 1 → 17 của một khung SGK. */
export function flattenLessons(topics: readonly SgkTopic[]): SgkLessonEntry[] {
  return topics.flatMap((topic) => topic.lessons.map((lesson) => ({ ...lesson, topic })));
}

export const sgkLessons: SgkLessonEntry[] = flattenLessons(SGK_12);

export const sgkPaths = {
  toc: "/muc-luc",
  topic: (slug: string) => `/muc-luc/${slug}`,
  lesson: (slug: string) => `/bai/${slug}`,
  section: (slug: string, sectionId: string) => `/bai/${slug}#${sectionId}`,
};

// Các hàm tra cứu nhận thêm danh sách chủ đề/bài để dùng được với khung đã áp cách gán sự kiện từ database
// (lib/queries/sgk.ts); mặc định là khung viết trong code.

export function getSgkTopic(slug: string, topics: readonly SgkTopic[] = SGK_12): SgkTopic | undefined {
  return topics.find((topic) => topic.slug === slug);
}

export function getSgkLesson(slug: string, lessons: readonly SgkLessonEntry[] = sgkLessons): SgkLessonEntry | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

/** Bài liền trước / liền sau (để làm nút "Bài trước / Bài sau"). */
export function adjacentLessons(slug: string): { previous?: SgkLessonEntry; next?: SgkLessonEntry } {
  const index = sgkLessons.findIndex((lesson) => lesson.slug === slug);
  if (index < 0) return {};
  return { previous: sgkLessons[index - 1], next: sgkLessons[index + 1] };
}

/** Mọi sự kiện của bài (không trùng, theo thứ tự mục). */
export function lessonEventSlugs(lesson: SgkLesson): string[] {
  return [...new Set(lesson.sections.flatMap((section) => section.eventSlugs ?? []))];
}

export function lessonFeatureSlugs(lesson: SgkLesson): string[] {
  return [...new Set(lesson.sections.flatMap((section) => section.featureSlugs ?? []))];
}

/** Có chuyên đề tương tác → "ready"; có sự kiện liên quan → "partial"; chưa có gì → "drafting". */
export function lessonStatus(lesson: SgkLesson): SgkLessonStatus {
  if (lessonFeatureSlugs(lesson).length > 0) return "ready";
  if (lessonEventSlugs(lesson).length > 0) return "partial";
  return "drafting";
}

export type SgkPlacement = { lesson: SgkLessonEntry; section: SgkSection };

/** Sự kiện nằm ở bài/mục nào trong SGK (một sự kiện có thể thuộc nhiều bài, ví dụ Hiệp định Genève: Bài 7 và Bài 13). */
export function placementsForEvent(eventSlug: string, lessons: readonly SgkLessonEntry[] = sgkLessons): SgkPlacement[] {
  return lessons.flatMap((lesson) =>
    lesson.sections.filter((section) => section.eventSlugs?.includes(eventSlug)).map((section) => ({ lesson, section })),
  );
}

/** Chuyên đề tương tác (lib/lessons) thuộc bài/mục nào. */
export function placementForFeature(featureSlug: string): SgkPlacement | undefined {
  for (const lesson of sgkLessons) {
    const section = lesson.sections.find((item) => item.featureSlugs?.includes(featureSlug));
    if (section) return { lesson, section };
  }
  return undefined;
}

/**
 * Bài SGK → chủ đề cũ trong database (curriculum_topics, 7 chủ đề tự đặt) gần nhất với bài, để nối sang các trang
 * đang lọc theo chủ đề cũ (trắc nghiệm theo chủ đề, dòng thời gian). Bài 1–5 (thế giới, ASEAN) chưa có chủ đề tương ứng.
 */
export const LESSON_TO_LEGACY_TOPIC: Record<number, string> = {
  6: "cach-mang-thang-tam-1945",
  7: "khang-chien-chong-phap",
  8: "khang-chien-chong-my",
  9: "bao-ve-to-quoc-sau-1975",
  10: "cong-cuoc-doi-moi",
  11: "cong-cuoc-doi-moi",
  12: "doi-ngoai-viet-nam",
  13: "doi-ngoai-viet-nam",
  14: "doi-ngoai-viet-nam",
  15: "ho-chi-minh",
  16: "ho-chi-minh",
  17: "ho-chi-minh",
};

export function lessonByNumber(number: number): SgkLessonEntry | undefined {
  return sgkLessons.find((lesson) => lesson.number === number);
}

/**
 * Chủ đề thêm ở GĐ7 (supabase/content/chu-de-gd7.json, đang ở trạng thái nháp) → bài đầu tiên của chủ đề SGK tương ứng.
 * Chưa đưa vào LESSON_TO_LEGACY_TOPIC vì chủ đề nháp chưa có trang trắc nghiệm/lọc công khai; khi đã công bố thì chuyển.
 */
const DRAFT_TOPIC_FIRST_LESSON: Record<string, number> = {
  "the-gioi-trong-va-sau-chien-tranh-lanh": 1,
  "asean-nhung-chang-duong-lich-su": 4,
};

/** Chủ đề trong database → màu gáy của chủ đề SGK chứa bài đầu tiên ánh xạ tới nó (chấm màu ở bộ lọc chủ đề). */
export function legacyTopicColor(legacySlug: string): SgkTopicColor | undefined {
  const number = Object.entries(LESSON_TO_LEGACY_TOPIC).find(([, slug]) => slug === legacySlug)?.[0] ?? DRAFT_TOPIC_FIRST_LESSON[legacySlug];
  return number ? lessonByNumber(Number(number))?.topic.color : undefined;
}

/** Một dòng gán sự kiện vào bài/mục (bảng sgk_lesson_events). */
export type SgkAssignment = { lessonSlug: string; sectionId: string; eventSlug: string; sortOrder: number };

/**
 * Áp cách gán sự kiện từ database lên khung SGK: mỗi mục lấy đúng danh sách sự kiện đã gán (theo sort_order); dòng gán
 * vào bài/mục không có trong khung thì bỏ qua. Chuyên đề tương tác (featureSlugs) giữ nguyên vì viết trong code.
 */
export function applyAssignments(topics: readonly SgkTopic[], assignments: readonly SgkAssignment[]): SgkTopic[] {
  const bySection = new Map<string, SgkAssignment[]>();
  for (const item of assignments) {
    const key = `${item.lessonSlug}#${item.sectionId}`;
    bySection.set(key, [...(bySection.get(key) ?? []), item]);
  }
  return topics.map((topic) => ({
    ...topic,
    lessons: topic.lessons.map((lesson) => ({
      ...lesson,
      sections: lesson.sections.map((section) => {
        const items = (bySection.get(`${lesson.slug}#${section.id}`) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...section, eventSlugs: [...new Set(items.map((item) => item.eventSlug))] };
      }),
    })),
  }));
}

/** Cách gán viết sẵn trong code → các dòng gán (dữ liệu ban đầu cho bảng sgk_lesson_events). */
export function staticAssignments(topics: readonly SgkTopic[] = SGK_12): SgkAssignment[] {
  return flattenLessons(topics).flatMap((lesson) =>
    lesson.sections.flatMap((section) =>
      (section.eventSlugs ?? []).map((eventSlug, index) => ({ lessonSlug: lesson.slug, sectionId: section.id, eventSlug, sortOrder: index + 1 })),
    ),
  );
}

/** Trạng thái nội dung của mọi bài trong một khung (để truyền từ server xuống component chạy ở trình duyệt). */
export function lessonStatuses(topics: readonly SgkTopic[]): Record<string, SgkLessonStatus> {
  return Object.fromEntries(flattenLessons(topics).map((lesson) => [lesson.slug, lessonStatus(lesson)]));
}
