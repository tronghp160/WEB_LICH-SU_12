// Chuyên đề kỹ năng làm bài (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8): ví dụ có lời giải chi tiết. Do nhóm phát triển
// web biên soạn để luyện tập (KHÔNG phải đề thi chính thức); chỉ dùng dữ kiện cơ bản trong SGK Lịch sử 12. Trích dẫn
// nguyên văn chỉ lấy từ văn kiện công khai (Tuyên ngôn độc lập 1945, Lời kêu gọi toàn quốc kháng chiến 1946, văn kiện
// Đại hội VI); đoạn ghi "tóm lược" là lời của web.

export type SkillStatement = { text: string; truth: boolean; why: string };

export type SkillExample =
  | { kind: "true_false"; id: string; passage?: { body: string; source: string }; stem: string; statements: SkillStatement[]; lesson: string }
  | { kind: "mcq"; id: string; passage?: { body: string; source: string }; stem: string; choices: [string, string, string, string]; correct: number; why: string; lesson: string };

/** Bẫy thường gặp trong câu Đúng/Sai — mỗi bẫy kèm dấu hiệu nhận biết. */
export const TRUE_FALSE_TRAPS: { title: string; sign: string }[] = [
  { title: "Từ tuyệt đối", sign: "“duy nhất”, “hoàn toàn”, “tất cả”, “luôn luôn”, “ngay từ đầu” — chỉ cần một phản ví dụ là ý sai." },
  { title: "Đánh tráo thời gian", sign: "Sự kiện đúng nhưng mốc năm / tháng bị đổi, hoặc đặt sự kiện vào giai đoạn khác." },
  { title: "Đánh tráo chủ thể, tên gọi", sign: "Đúng việc nhưng sai người, sai tổ chức, sai tên nước, tên hiệp định." },
  { title: "Nhầm nguyên nhân – kết quả", sign: "Lấy kết quả làm nguyên nhân, hoặc gán quan hệ nhân quả cho hai sự kiện chỉ xảy ra gần nhau." },
  { title: "Suy diễn quá tư liệu", sign: "Ý dùng “theo đoạn tư liệu”, “tư liệu chứng tỏ” nhưng nội dung không có trong tư liệu hoặc khẳng định mạnh hơn tư liệu." },
];

export const TRUE_FALSE_EXAMPLES: SkillExample[] = [
  {
    kind: "true_false",
    id: "ds-1",
    lesson: "6-cach-mang-thang-tam-nam-1945",
    stem: "Cho thông tin: “Ngày 2-9-1945, tại Quảng trường Ba Đình (Hà Nội), Chủ tịch Hồ Chí Minh đọc Tuyên ngôn độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.”",
    statements: [
      { text: "Tuyên ngôn độc lập được đọc sau khi cuộc Tổng khởi nghĩa tháng Tám năm 1945 giành thắng lợi.", truth: true, why: "Tổng khởi nghĩa diễn ra từ ngày 14 đến ngày 28-8-1945, giành chính quyền trong cả nước; ngày 2-9-1945 Tuyên ngôn độc lập mới được đọc." },
      { text: "Văn kiện này khai sinh nước Cộng hòa xã hội chủ nghĩa Việt Nam.", truth: false, why: "Bẫy đánh tráo tên gọi: văn kiện khai sinh nước Việt Nam Dân chủ Cộng hòa; tên nước Cộng hòa xã hội chủ nghĩa Việt Nam có từ năm 1976." },
      { text: "Tuyên ngôn độc lập là văn kiện duy nhất trong lịch sử Việt Nam khẳng định quyền độc lập của dân tộc.", truth: false, why: "Bẫy từ tuyệt đối “duy nhất”: trước đó đã có những áng văn khẳng định độc lập như “Nam quốc sơn hà”, “Bình Ngô đại cáo”." },
      { text: "Sự kiện diễn ra tại Quảng trường Ba Đình, Hà Nội.", truth: true, why: "Thông tin có ngay trong đề dẫn — ý dễ, đừng nghĩ phức tạp." },
    ],
  },
  {
    kind: "true_false",
    id: "ds-2",
    lesson: "7-khang-chien-chong-phap",
    stem: "Cho thông tin: “Chiến dịch Điện Biên Phủ (từ ngày 13-3 đến ngày 7-5-1954) kết thúc thắng lợi, toàn bộ tập đoàn cứ điểm Điện Biên Phủ bị tiêu diệt.”",
    statements: [
      { text: "Chiến dịch Điện Biên Phủ kéo dài 56 ngày đêm.", truth: true, why: "Từ 13-3 đến 7-5-1954: 19 ngày tháng 3 + 30 ngày tháng 4 + 7 ngày tháng 5 = 56 ngày đêm." },
      { text: "Thắng lợi ở Điện Biên Phủ buộc Pháp kí Hiệp định Pa-ri về chấm dứt chiến tranh ở Việt Nam.", truth: false, why: "Bẫy đánh tráo tên hiệp định: sau Điện Biên Phủ là Hiệp định Giơ-ne-vơ (21-7-1954); Hiệp định Pa-ri được kí năm 1973, trong kháng chiến chống Mỹ." },
      { text: "Chiến thắng Điện Biên Phủ góp phần quyết định vào thắng lợi của cuộc kháng chiến chống thực dân Pháp.", truth: true, why: "Đây là đánh giá về ý nghĩa của chiến dịch trong SGK." },
      { text: "Điện Biên Phủ là chiến thắng duy nhất của quân dân Việt Nam trong cuộc kháng chiến chống thực dân Pháp.", truth: false, why: "Bẫy từ tuyệt đối: trước đó còn có chiến dịch Việt Bắc thu – đông 1947, chiến dịch Biên giới thu – đông 1950…" },
    ],
  },
  {
    kind: "true_false",
    id: "ds-3",
    lesson: "4-su-ra-doi-va-phat-trien-cua-asean",
    stem: "Cho thông tin: “Hiệp hội các quốc gia Đông Nam Á (ASEAN) được thành lập ngày 8-8-1967 tại Băng Cốc (Thái Lan) với 5 nước thành viên đầu tiên.”",
    statements: [
      { text: "Việt Nam là một trong 5 nước sáng lập ASEAN.", truth: false, why: "Bẫy đánh tráo chủ thể: 5 nước sáng lập là In-đô-nê-xi-a, Ma-lai-xi-a, Phi-líp-pin, Xin-ga-po và Thái Lan. Việt Nam gia nhập ngày 28-7-1995." },
      { text: "ASEAN ra đời khi Chiến tranh lạnh vẫn đang diễn ra.", truth: true, why: "Năm 1967 Chiến tranh lạnh chưa kết thúc (kết thúc năm 1989–1991) — đặt sự kiện vào đúng bối cảnh." },
      { text: "Việt Nam gia nhập ASEAN năm 1995.", truth: true, why: "Ngày 28-7-1995 Việt Nam trở thành thành viên thứ bảy của ASEAN." },
      { text: "Ngay từ khi thành lập, ASEAN đã gồm tất cả các quốc gia Đông Nam Á.", truth: false, why: "Bẫy từ tuyệt đối “tất cả”, “ngay từ khi”: lúc thành lập chỉ có 5 nước, các nước khác gia nhập dần." },
    ],
  },
  {
    kind: "true_false",
    id: "ds-4",
    lesson: "1-lien-hop-quoc",
    stem: "Cho thông tin: “Liên hợp quốc chính thức ra đời ngày 24-10-1945, khi Hiến chương Liên hợp quốc có hiệu lực.”",
    statements: [
      { text: "Hội đồng Bảo an Liên hợp quốc có 5 ủy viên thường trực.", truth: true, why: "Gồm Mỹ, Anh, Pháp, Liên Xô (nay là Liên bang Nga) và Trung Quốc." },
      { text: "Duy trì hòa bình và an ninh quốc tế là một mục đích hàng đầu của Liên hợp quốc.", truth: true, why: "Đây là mục đích được nêu đầu tiên trong Hiến chương." },
      { text: "Việt Nam trở thành thành viên Liên hợp quốc ngay từ năm 1945.", truth: false, why: "Bẫy đánh tráo thời gian: Việt Nam gia nhập Liên hợp quốc ngày 20-9-1977." },
      { text: "Sự ra đời của Liên hợp quốc là nguyên nhân làm Chiến tranh thế giới thứ hai kết thúc.", truth: false, why: "Bẫy nhầm nguyên nhân – kết quả: Liên hợp quốc ra đời trong bối cảnh chiến tranh sắp / vừa kết thúc, không phải nguyên nhân kết thúc chiến tranh." },
    ],
  },
  {
    kind: "true_false",
    id: "ds-5",
    lesson: "10-khai-quat-ve-cong-cuoc-doi-moi",
    stem: "Cho thông tin: “Tháng 12-1986, Đại hội đại biểu toàn quốc lần thứ VI của Đảng Cộng sản Việt Nam đề ra đường lối đổi mới toàn diện đất nước.”",
    statements: [
      { text: "Đường lối đổi mới được đề ra tại Đại hội lần thứ VI của Đảng.", truth: true, why: "Thông tin có trong đề dẫn." },
      { text: "Trọng tâm của công cuộc đổi mới là đổi mới kinh tế.", truth: true, why: "Đổi mới toàn diện nhưng lấy đổi mới kinh tế làm trọng tâm." },
      { text: "Đổi mới là thay đổi mục tiêu đi lên chủ nghĩa xã hội.", truth: false, why: "Đổi mới không phải thay đổi mục tiêu chủ nghĩa xã hội mà là đổi mới cách làm để thực hiện mục tiêu ấy hiệu quả hơn." },
      { text: "Đường lối đổi mới được đề ra năm 1975, ngay sau khi đất nước thống nhất.", truth: false, why: "Bẫy đánh tráo thời gian: đường lối đổi mới được đề ra năm 1986." },
    ],
  },
];

/** Các bước đọc một đoạn tư liệu. */
export const SOURCE_STEPS: { title: string; detail: string }[] = [
  { title: "Đọc dòng nguồn trước", detail: "Ai viết / nói, khi nào, loại văn kiện gì (tuyên ngôn, lời kêu gọi, hiệp định, bài báo…). Dòng nguồn thường đã trả lời một nửa câu hỏi về bối cảnh." },
  { title: "Tìm ý chính của từng câu", detail: "Gạch chân mốc thời gian, chủ thể, hành động, từ chỉ mức độ (“tạm thời”, “nhất định”, “càng… càng…”)." },
  { title: "Phân biệt “trong tư liệu” và “ngoài tư liệu”", detail: "Câu hỏi “theo đoạn tư liệu” chỉ chấp nhận điều tư liệu nói. Ý đúng về kiến thức nhưng tư liệu không nhắc tới vẫn có thể bị tính là sai." },
  { title: "Cẩn thận với suy luận quá mức", detail: "“Tư liệu chứng tỏ / khẳng định…” phải bám đúng mức độ tư liệu nêu, không thổi phồng, không gán thêm kết quả về sau." },
  { title: "Loại phương án bằng chính tư liệu", detail: "Với câu trắc nghiệm, đối chiếu từng phương án với từ ngữ trong đoạn; phương án có từ trái nghĩa với tư liệu (ví dụ “lâu dài” khi tư liệu nói “tạm thời”) bị loại ngay." },
];

export const SOURCE_EXAMPLES: SkillExample[] = [
  {
    kind: "mcq",
    id: "tl-1",
    lesson: "6-cach-mang-thang-tam-nam-1945",
    passage: {
      body: "“Tất cả mọi người đều sinh ra có quyền bình đẳng. Tạo hóa cho họ những quyền không ai có thể xâm phạm được; trong những quyền ấy, có quyền được sống, quyền tự do và quyền mưu cầu hạnh phúc.”",
      source: "Trích Tuyên ngôn độc lập, Chủ tịch Hồ Chí Minh đọc ngày 2-9-1945",
    },
    stem: "Lời trên được Chủ tịch Hồ Chí Minh trích dẫn từ văn kiện nào?",
    choices: ["Tuyên ngôn Độc lập năm 1776 của nước Mỹ", "Tuyên ngôn Nhân quyền và Dân quyền năm 1791 của Cách mạng Pháp", "Hiến chương Liên hợp quốc năm 1945", "Tuyên ngôn của Đảng Cộng sản năm 1848"],
    correct: 0,
    why: "Ngay sau đoạn này, Tuyên ngôn độc lập viết: “Lời bất hủ ấy ở trong bản Tuyên ngôn Độc lập năm 1776 của nước Mỹ”. Tuyên ngôn năm 1791 của Pháp được trích ở đoạn tiếp theo (“Người ta sinh ra tự do và bình đẳng về quyền lợi…”) — nhiễu dễ nhầm nhất.",
  },
  {
    kind: "true_false",
    id: "tl-2",
    lesson: "7-khang-chien-chong-phap",
    passage: {
      body: "“Chúng ta muốn hòa bình, chúng ta phải nhân nhượng. Nhưng chúng ta càng nhân nhượng, thực dân Pháp càng lấn tới, vì chúng quyết tâm cướp nước ta lần nữa! Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ.”",
      source: "Trích Lời kêu gọi toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh, tháng 12-1946",
    },
    stem: "Đọc đoạn tư liệu và cho biết mỗi ý sau đúng hay sai.",
    statements: [
      { text: "Đoạn tư liệu cho thấy Việt Nam đã nhân nhượng để giữ hòa bình trước khi bước vào kháng chiến.", truth: true, why: "Tư liệu nói rõ: “Chúng ta muốn hòa bình, chúng ta phải nhân nhượng”." },
      { text: "Theo đoạn tư liệu, Việt Nam phải kháng chiến vì thực dân Pháp càng lấn tới, quyết tâm cướp nước ta lần nữa.", truth: true, why: "Đúng nguyên nhân tư liệu nêu." },
      { text: "Đoạn tư liệu chứng tỏ Việt Nam chủ trương dùng chiến tranh ngay từ đầu, không muốn hòa bình.", truth: false, why: "Trái với tư liệu (“muốn hòa bình”, “phải nhân nhượng”)." },
      { text: "Đoạn tư liệu khẳng định cuộc kháng chiến sẽ kết thúc bằng chiến dịch Điện Biên Phủ.", truth: false, why: "Suy diễn ngoài tư liệu: năm 1946 chưa có Điện Biên Phủ (1954); tư liệu không nhắc tới." },
    ],
  },
  {
    kind: "mcq",
    id: "tl-3",
    lesson: "7-khang-chien-chong-phap",
    passage: {
      body: "Các nước tham dự hội nghị cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam, Lào và Cam-pu-chia. Ở Việt Nam, vĩ tuyến 17 được lấy làm giới tuyến quân sự tạm thời; tổng tuyển cử tự do trong cả nước sẽ được tiến hành vào tháng 7-1956.",
      source: "Tóm lược nội dung Hiệp định Giơ-ne-vơ về Đông Dương (21-7-1954)",
    },
    stem: "Theo đoạn tư liệu, vĩ tuyến 17 có tính chất gì?",
    choices: ["Giới tuyến quân sự tạm thời", "Biên giới quốc gia lâu dài giữa hai nước", "Ranh giới hành chính giữa các tỉnh", "Đường phân chia chính trị vĩnh viễn"],
    correct: 0,
    why: "Từ khóa “tạm thời” và “tổng tuyển cử … trong cả nước” cho thấy đây chỉ là giới tuyến quân sự tạm thời, Việt Nam vẫn là một nước thống nhất. Các phương án “lâu dài”, “vĩnh viễn” trái với tư liệu.",
  },
  {
    kind: "mcq",
    id: "tl-4",
    lesson: "4-su-ra-doi-va-phat-trien-cua-asean",
    passage: {
      body: "Tuyên bố thành lập ASEAN nêu mục đích: thúc đẩy tăng trưởng kinh tế, tiến bộ xã hội và phát triển văn hóa trong khu vực thông qua hợp tác; thúc đẩy hòa bình và ổn định khu vực.",
      source: "Tóm lược Tuyên bố Băng Cốc (8-8-1967)",
    },
    stem: "Đoạn tư liệu cho biết mục đích của ASEAN khi thành lập là gì?",
    choices: [
      "Hợp tác phát triển kinh tế, xã hội, văn hóa; giữ hòa bình, ổn định khu vực",
      "Lập liên minh quân sự để đối đầu với một nước lớn",
      "Sử dụng một đồng tiền chung cho cả khu vực",
      "Hợp nhất các nước thành viên thành một quốc gia",
    ],
    correct: 0,
    why: "Phương án đúng gần như diễn đạt lại tư liệu. Ba phương án còn lại không có trong tư liệu — câu hỏi “đoạn tư liệu cho biết” chỉ cần đối chiếu từ ngữ.",
  },
  {
    kind: "true_false",
    id: "tl-5",
    lesson: "10-khai-quat-ve-cong-cuoc-doi-moi",
    passage: {
      body: "“Nhìn thẳng vào sự thật, đánh giá đúng sự thật, nói rõ sự thật.”",
      source: "Văn kiện Đại hội đại biểu toàn quốc lần thứ VI của Đảng Cộng sản Việt Nam (12-1986)",
    },
    stem: "Đọc đoạn tư liệu và cho biết mỗi ý sau đúng hay sai.",
    statements: [
      { text: "Câu trên thể hiện tinh thần đổi mới tư duy của Đại hội VI.", truth: true, why: "Đây là phương châm nổi tiếng của Đại hội VI khi mở đầu công cuộc đổi mới." },
      { text: "Câu trên gắn với việc Đại hội VI thẳng thắn nhìn nhận những sai lầm, khuyết điểm trước đó.", truth: true, why: "Đại hội VI nghiêm túc tự phê bình, chỉ rõ sai lầm — tinh thần “nói rõ sự thật”." },
      { text: "Câu trên được nêu tại Hội nghị thành lập Đảng năm 1930.", truth: false, why: "Đánh tráo thời gian: dòng nguồn ghi rõ Đại hội VI (12-1986)." },
      { text: "Từ đoạn tư liệu có thể khẳng định công cuộc đổi mới đã hoàn thành ngay trong năm 1986.", truth: false, why: "Suy diễn quá mức: tư liệu chỉ nêu phương châm; năm 1986 là lúc bắt đầu đổi mới." },
    ],
  },
];
