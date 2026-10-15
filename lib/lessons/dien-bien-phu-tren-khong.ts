import { dienBienPhuTrenKhong1972 } from "@/lib/battles/dien-bien-phu-tren-khong-1972";
import type { Lesson, LessonImage } from "@/lib/lessons/types";

// Chuyên đề tương tác: Trận "Hà Nội – Điện Biên Phủ trên không" (12/1972) — GĐ5.2 (KE_HOACH_CAI_TIEN, bài thứ 3). Nội dung
// VIẾT LẠI theo khung SGK Lịch sử 12 (Kết nối tri thức), Bài 8, và nội dung sự kiện đã soạn ở
// supabase/content/su-kien/ha-noi-dien-bien-phu-tren-khong-1972.md; không chép nguyên văn sách. Các con số ghi "theo số liệu
// của ta" (tài liệu phía Mỹ công bố thấp hơn). Ảnh kiểm tra giấy phép trên Wikimedia Commons ngày 14/10/2026: ảnh Không quân
// Mỹ / Lưu trữ Quốc gia Mỹ (phạm vi công cộng), ảnh hiện vật và di tích ngày nay CC0 / CC BY / CC BY-SA.
// Video: kênh QPVN, Báo Quân đội nhân dân, Báo Nhân Dân — đã xác minh bằng oEmbed ngày 14/10/2026.

const PHOTO = "/lessons/dien-bien-phu-tren-khong";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const XAC_B52: LessonImage = {
  src: `${PHOTO}/xac-b52-ho-huu-tiep.webp`,
  alt: "Những mảnh thân máy bay kim loại cháy sém, cong vênh chất thành đống dưới tán cây, phía sau là nhà cao tầng của khu phố",
  caption: "Mảnh xác một chiếc B-52 bị bắn rơi tháng 12/1972, giữ lại giữa khu phố Hà Nội làm chứng tích (ảnh năm 2012).",
  credit: "calflier001, CC BY-SA 2.0",
  sourceUrl: `${COMMONS}B52_WRECKAGE_B52_VICTORY_CENTRE_HUU_TIEP_LAKE_BA_DINH_DISTRICT_HANOI_VIETNAM_FEB_2012_(6817995688).jpg`,
  width: 1200,
  height: 900,
};

const MANH_B52_1972: LessonImage = {
  src: `${PHOTO}/manh-b52-ha-noi-1972.webp`,
  alt: "Ảnh đen trắng: một nhóm người đứng quanh mảnh thân máy bay bằng kim loại nằm trên ruộng, phía sau có trẻ em",
  caption: "Mảnh xác một chiếc B-52 bị bắn rơi ở ngoại thành Hà Nội, ngày 23/12/1972.",
  credit: "Kho ảnh S. A. Varyukhin (Hội cựu chiến binh Nga từng làm nhiệm vụ ở Việt Nam), CC BY-SA 3.0",
  sourceUrl: `${COMMONS}СВС_у_обломков_сбитого_Б-52_в_окрестностях_Ханоя_23.12.1972_(1).jpg`,
};

const MIG21: LessonImage = {
  src: `${PHOTO}/mig21-5121.webp`,
  alt: "Máy bay tiêm kích MiG-21 màu bạc mang số hiệu 5121 sơn đỏ, đặt trên bệ trong sân bảo tàng",
  caption: "Chiếc MiG-21 số hiệu 5121 mà phi công Phạm Tuân lái đêm 27/12/1972, nay trưng bày ở Hà Nội (ảnh năm 2012).",
  credit: "Gary Todd, CC0",
  sourceUrl: `${COMMONS}Mikoyan-Gurevich_MiG-21MF-75_‘5121’_(9735510298).jpg`,
  title: "Máy bay MiG-21 số hiệu 5121",
};

const KHAM_THIEN: LessonImage = {
  src: `${PHOTO}/tuong-niem-kham-thien.webp`,
  alt: "Tượng đồng người mẹ bế đứa con đặt trước tấm bia trắng ghi \"Khâm Thiên khắc sâu căm thù giặc Mỹ 26-12-1972\", phía trước là bàn thờ đầy hoa",
  caption: "Đài tưởng niệm nạn nhân trận B-52 rải thảm phố Khâm Thiên đêm 26/12/1972 (ảnh năm 2020).",
  credit: "Arjunullas, CC BY-SA 4.0",
  sourceUrl: `${COMMONS}Khâm_Thiên_Memorial.jpg`,
};

const PHAM_TUAN: LessonImage = {
  src: `${PHOTO}/pham-tuan-2024-chan-dung.webp`,
  alt: "Trung tướng Phạm Tuân lúc tuổi cao, mặc quân phục xanh gắn huân chương, đang mỉm cười",
  caption: "Trung tướng Phạm Tuân tại Triển lãm Quốc phòng quốc tế Việt Nam năm 2024.",
  credit: "Đại úy Casey Bell, Không quân Mỹ, phạm vi công cộng",
  sourceUrl: `${COMMONS}DoD_participates_in_Vietnam_Defense_Expo_2024_(8816175).jpg`,
};

const NIXON: LessonImage = {
  src: `${PHOTO}/nixon-1972.webp`,
  alt: "Chân dung Tổng thống Mỹ Ních-xơn mặc com-lê xanh thẫm, phía sau là lá cờ Mỹ",
  caption: "Tổng thống Mỹ R. Ních-xơn năm 1972.",
  credit: "Lưu trữ Quốc gia Mỹ (NARA), phạm vi công cộng",
  sourceUrl: `${COMMONS}Richard-M-Nixon-NARA-1972.png`,
};

export const dienBienPhuTrenKhongLesson: Lesson = {
  slug: "dien-bien-phu-tren-khong-1972",
  eventSlug: "ha-noi-dien-bien-phu-tren-khong-1972",
  relatedEventSlugs: ["hiep-dinh-paris-ve-viet-nam"],
  title: "Hà Nội – Điện Biên Phủ trên không",
  dateText: "18 – 29/12/1972",
  tagline:
    "12 ngày đêm cuối năm 1972, quân dân Hà Nội và miền Bắc đánh bại cuộc tập kích bằng \"pháo đài bay\" B-52 — buộc Mỹ phải trở lại bàn đàm phán và kí Hiệp định Pa-ri.",
  copy: {
    cardDescription: "Bản đồ đường bay B-52 và 12 ngày đêm đánh trả, ảnh tư liệu năm 1972, xác B-52 giữa lòng Hà Nội, video và thẻ ghi nhớ.",
    mapTitle: "Xem 12 ngày đêm trên bản đồ",
    mapHint: "Bản đồ đi từ các căn cứ B-52 ở Guam, Thái Lan tới bầu trời Hà Nội; nơi của ta đang bị ném bom có viền vàng nhấp nháy, B-52 bị bắn rơi có dấu ✕.",
    videoTitle: "Video tư liệu",
    resultsTitle: "Vì sao gọi là \"Điện Biên Phủ trên không\"?",
    todayTitle: "Chứng tích 12 ngày đêm ngày nay",
  },
  hero: XAC_B52,
  heroStats: [
    { value: 12, label: "ngày đêm (18 – 29/12/1972)" },
    { value: 81, label: "máy bay Mỹ bị bắn rơi (theo số liệu của ta)" },
    { value: 34, label: "trong số đó là máy bay B-52" },
  ],
  textbook: {
    series: "SGK Lịch sử 12 — Kết nối tri thức với cuộc sống",
    lesson: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)",
    objectives: [
      "Nêu được bối cảnh và mục đích cuộc tập kích chiến lược bằng B-52 của Mỹ vào Hà Nội, Hải Phòng cuối năm 1972.",
      "Trình bày được diễn biến chính của 12 ngày đêm trên bản đồ và kết quả cuộc chiến đấu của quân dân miền Bắc.",
      "Giải thích được vì sao thắng lợi này được gọi là trận \"Điện Biên Phủ trên không\" và ý nghĩa của nó với việc kí Hiệp định Pa-ri.",
    ],
  },
  keyDates: [
    { date: "10/1972", text: "Văn bản Hiệp định Pa-ri cơ bản được thỏa thuận, nhưng Mỹ đòi sửa đổi" },
    { date: "14/12/1972", text: "Ních-xơn phê chuẩn kế hoạch tập kích bằng B-52" },
    { date: "18/12/1972", text: "B-52 bắt đầu ném bom Hà Nội; đêm đầu bắn rơi 3 chiếc" },
    { date: "22/12/1972", text: "Bệnh viện Bạch Mai bị bom tàn phá" },
    { date: "26/12/1972", text: "Rải thảm phố Khâm Thiên; đêm bắn rơi 8 chiếc B-52" },
    { date: "30/12/1972", text: "Mỹ tuyên bố ngừng ném bom từ vĩ tuyến 20 trở ra" },
    { date: "27/1/1973", text: "Hiệp định Pa-ri được kí chính thức" },
  ],
  battle: dienBienPhuTrenKhong1972,
  videos: [
    {
      youtubeId: "XKYIzBrTFIk",
      title: "Giải mã Điện Biên Phủ trên không: Trận chiến làm thay đổi cục diện chiến tranh",
      channel: "QPVN — Truyền hình Quốc phòng Việt Nam",
      note: "Toàn cảnh 12 ngày đêm — xem sau phần bản đồ.",
    },
    {
      youtubeId: "d_9tGGeWFVA",
      title: "Hà Nội – Điện Biên Phủ trên không: Ký ức không quên",
      channel: "Báo Quân đội nhân dân",
      note: "Ký ức của người trong cuộc — gắn với bước \"Rải thảm Bạch Mai, Khâm Thiên\".",
    },
    {
      youtubeId: "dae9UobuUtQ",
      title: "Chiến thắng Hà Nội – Điện Biên Phủ trên không: Đỉnh cao của nghệ thuật quân sự",
      channel: "Báo Nhân Dân",
      note: "Liên hệ với phần ý nghĩa của chiến thắng.",
    },
  ],
  results: [
    { value: 81, label: "máy bay Mỹ bị bắn rơi" },
    { value: 34, label: "máy bay B-52" },
    { value: 5, label: "máy bay F-111" },
    { value: 43, label: "phi công Mỹ bị bắt sống" },
  ],
  resultsImage: MANH_B52_1972,
  significance: [
    {
      title: "Đập tan cố gắng quân sự cao nhất của Mỹ",
      text: "Cuộc tập kích bằng B-52 là cố gắng quân sự cao nhất, cuối cùng của Mỹ nhằm ép ta kí hiệp định theo điều kiện của Mỹ. Sau 12 ngày đêm, Mỹ thất bại hoàn toàn.",
    },
    {
      title: "Buộc Mỹ kí Hiệp định Pa-ri",
      text: "Ngày 30/12/1972, Mỹ phải tuyên bố ngừng ném bom miền Bắc từ vĩ tuyến 20 trở ra, trở lại đàm phán và kí Hiệp định Pa-ri ngày 27/1/1973, cam kết rút hết quân khỏi miền Nam.",
    },
    {
      title: "Tạo thời cơ giải phóng miền Nam",
      text: "Quân Mỹ rút khỏi miền Nam, so sánh lực lượng thay đổi có lợi cho ta — tiền đề để tiến tới giải phóng hoàn toàn miền Nam mùa xuân năm 1975.",
    },
    {
      title: "Kì tích của bộ đội phòng không và nhân dân",
      text: "Trước \"pháo đài bay\" hiện đại nhất của Mỹ, bộ đội phòng không – không quân cùng nhân dân miền Bắc đã tìm ra cách đánh, bắn rơi B-52 ngay trên bầu trời Thủ đô — biểu hiện của trí tuệ và bản lĩnh Việt Nam.",
    },
  ],
  quote: {
    text: "Sớm muộn đế quốc Mỹ cũng sẽ đưa B-52 ra đánh Hà Nội rồi có thua mới chịu thua.",
    author: "Chủ tịch Hồ Chí Minh (năm 1968)",
  },
  figures: [
    {
      name: "Hồ Chí Minh",
      role: "Chủ tịch nước Việt Nam Dân chủ Cộng hòa",
      text: "Từ năm 1968 đã dự báo Mỹ sẽ đưa B-52 ra đánh Hà Nội và căn dặn quân đội phải chuẩn bị trước cách đánh B-52.",
      href: "/nhan-vat/ho-chi-minh",
    },
    {
      name: "Phạm Tuân",
      role: "Phi công Quân chủng Phòng không – Không quân",
      text: "Đêm 27/12/1972 lái MiG-21 bắn rơi một chiếc B-52. Năm 1980, ông trở thành người Việt Nam đầu tiên bay vào vũ trụ.",
      image: PHAM_TUAN,
    },
    {
      name: "Vũ Xuân Thiều",
      role: "Phi công Quân chủng Phòng không – Không quân",
      text: "Đêm 28/12/1972 lái MiG-21 tiếp cận B-52 ở cự li rất gần để tiêu diệt và anh dũng hi sinh; được truy tặng danh hiệu Anh hùng Lực lượng vũ trang nhân dân.",
    },
    {
      name: "R. Ních-xơn",
      role: "Tổng thống Mỹ (1969 – 1974)",
      text: "Phê chuẩn cuộc tập kích bằng B-52 vào Hà Nội, Hải Phòng nhằm ép ta nhân nhượng; ngày 30/12/1972 phải tuyên bố ngừng ném bom và trở lại đàm phán.",
      image: NIXON,
    },
  ],
  flashcards: [
    { question: "Cuộc tập kích chiến lược bằng B-52 vào Hà Nội, Hải Phòng diễn ra trong thời gian nào?", answer: "12 ngày đêm, từ 18 đến 29/12/1972." },
    { question: "Mỹ mở cuộc tập kích bằng B-52 cuối năm 1972 nhằm mục đích gì?", answer: "Ép Việt Nam nhân nhượng, kí hiệp định theo những điều khoản có lợi cho Mỹ." },
    { question: "Theo số liệu của ta, trong 12 ngày đêm quân dân miền Bắc bắn rơi bao nhiêu máy bay?", answer: "81 máy bay, trong đó có 34 máy bay B-52 và 5 máy bay F-111." },
    { question: "Đêm nào ta bắn rơi nhiều B-52 nhất?", answer: "Đêm 26/12/1972 — 8 chiếc B-52 (theo số liệu của ta)." },
    { question: "Xác chiếc B-52 nào vẫn còn nằm giữa một hồ nhỏ ở Hà Nội?", answer: "Chiếc B-52 bị bắn rơi đêm 27/12/1972, rơi xuống hồ Hữu Tiệp (khu Ngọc Hà)." },
    { question: "Vì sao chiến thắng này được gọi là \"Điện Biên Phủ trên không\"?", answer: "Vì giống Điện Biên Phủ 1954, đây là thắng lợi quyết định buộc đối phương phải kí hiệp định — lần này là Hiệp định Pa-ri năm 1973." },
  ],
  quiz: [
    {
      question: "Những mảnh xác trong ảnh là của loại máy bay Mỹ nào, bị bắn rơi trên bầu trời Hà Nội tháng 12/1972?",
      image: XAC_B52,
      choices: ["B-52", "MiG-21", "C-47", "Trực thăng UH-1"],
      correct: 0,
      explanation: "Đây là mảnh xác máy bay ném bom chiến lược B-52 — \"pháo đài bay\" mà Mỹ dùng để tập kích Hà Nội, Hải Phòng 12 ngày đêm cuối năm 1972. MiG-21 là máy bay của ta.",
    },
    {
      question: "Cuộc tập kích chiến lược bằng B-52 vào Hà Nội, Hải Phòng kéo dài bao lâu?",
      choices: ["12 ngày đêm (18 – 29/12/1972)", "56 ngày đêm", "30 ngày đêm", "7 ngày đêm"],
      correct: 0,
      explanation: "Cuộc tập kích kéo dài 12 ngày đêm, từ tối 18 đến 29/12/1972. 56 ngày đêm là thời gian chiến dịch Điện Biên Phủ năm 1954.",
    },
    {
      question: "Mỹ mở cuộc tập kích bằng B-52 vào Hà Nội, Hải Phòng cuối năm 1972 nhằm mục đích gì?",
      choices: [
        "Ép ta nhân nhượng, kí hiệp định theo điều kiện của Mỹ",
        "Chiếm đóng miền Bắc bằng quân bộ",
        "Mở đầu chiến lược \"Chiến tranh cục bộ\"",
        "Ủng hộ quân đội Sài Gòn phản công ở Quảng Trị",
      ],
      correct: 0,
      explanation: "Văn bản hiệp định đã được thỏa thuận từ tháng 10/1972, nhưng Mỹ lật lọng và dùng B-52 hòng ép ta nhân nhượng. \"Chiến tranh cục bộ\" là chiến lược của những năm 1965 – 1968.",
    },
    {
      question: "Theo số liệu của ta, trong 12 ngày đêm quân dân miền Bắc bắn rơi bao nhiêu máy bay B-52?",
      choices: ["34 chiếc", "81 chiếc", "8 chiếc", "100 chiếc"],
      correct: 0,
      explanation: "Ta bắn rơi 81 máy bay, trong đó 34 chiếc là B-52. Riêng đêm 26/12/1972 bắn rơi 8 chiếc B-52.",
    },
    {
      question: "Phi công nào đã lái chiếc MiG-21 trong ảnh bắn rơi một máy bay B-52 đêm 27/12/1972?",
      image: MIG21,
      choices: ["Phạm Tuân", "Vũ Xuân Thiều", "Nguyễn Văn Cốc", "Võ Nguyên Giáp"],
      correct: 0,
      explanation: "Phạm Tuân lái chiếc MiG-21 số hiệu 5121 bắn rơi B-52 đêm 27/12/1972; năm 1980 ông là người Việt Nam đầu tiên bay vào vũ trụ. Vũ Xuân Thiều hi sinh đêm 28/12/1972 khi tiêu diệt B-52.",
    },
    {
      question: "Ngày 30/12/1972, Tổng thống Mỹ Ních-xơn phải tuyên bố điều gì?",
      choices: [
        "Ngừng ném bom miền Bắc từ vĩ tuyến 20 trở ra",
        "Rút hết quân Mỹ khỏi miền Nam ngay lập tức",
        "Kí Hiệp định Pa-ri",
        "Mở rộng ném bom ra cả Hải Phòng",
      ],
      correct: 0,
      explanation: "Ngày 30/12/1972, Mỹ phải ngừng ném bom từ vĩ tuyến 20 trở ra và đề nghị nối lại đàm phán. Hiệp định Pa-ri được kí ngày 27/1/1973; Mỹ rút quân trong 60 ngày sau đó.",
    },
    {
      question: "Đài tưởng niệm trong ảnh ghi nhớ nạn nhân trận B-52 rải thảm đêm 26/12/1972 ở phố nào của Hà Nội?",
      image: KHAM_THIEN,
      choices: ["Khâm Thiên", "Hàng Bài", "Hoàng Hoa Thám", "Đội Cấn"],
      correct: 0,
      explanation: "Đêm 26/12/1972, B-52 rải thảm phố Khâm Thiên, nhiều dãy nhà bị san phẳng, hàng trăm người dân thiệt mạng. Tấm bia trong ảnh ghi \"Khâm Thiên khắc sâu căm thù giặc Mỹ 26-12-1972\".",
    },
    {
      question: "Vì sao thắng lợi tháng 12/1972 được gọi là trận \"Điện Biên Phủ trên không\"?",
      choices: [
        "Như Điện Biên Phủ 1954, đây là thắng lợi quyết định buộc đối phương phải kí hiệp định",
        "Vì trận đánh diễn ra ở tỉnh Điện Biên",
        "Vì quân ta dùng lại vũ khí của chiến dịch Điện Biên Phủ",
        "Vì trận đánh cũng kéo dài 56 ngày đêm",
      ],
      correct: 0,
      explanation: "Điện Biên Phủ 1954 buộc Pháp kí Hiệp định Giơ-ne-vơ; thắng lợi trên bầu trời Hà Nội năm 1972 buộc Mỹ kí Hiệp định Pa-ri. Trận đánh diễn ra trên bầu trời Hà Nội, Hải Phòng chứ không ở Điện Biên.",
    },
  ],
  artifacts: [
    {
      title: "Tên lửa SAM-2 và đài điều khiển",
      text: "Bộ đội tên lửa phòng không dùng tên lửa SAM-2 (S-75) do Liên Xô viện trợ, cùng ra-đa điều khiển, để bắn hạ B-52 bay ở độ cao khoảng 10 km — điều mà súng pháo cao xạ không với tới.",
      image: {
        src: `${PHOTO}/ten-lua-sam2.webp`,
        alt: "Tên lửa màu xanh rằn ri chĩa chéo lên trời trên bệ phóng, bên cạnh là xe ra-đa có ăng-ten hình đĩa, dưới mái che kính xanh",
        caption: "Bệ phóng, tên lửa SAM-2 và xe ra-đa điều khiển tại Bảo tàng Phòng không – Không quân, Hà Nội (ảnh năm 2025).",
        credit: "kitmasterbloke, CC BY 2.0",
        sourceUrl: `${COMMONS}SAM2_DVNIA_Rocket_launch_system_shot_down_a_B-52_over_Hanoi_during_the_Tet_Offensive,_181272.jpg`,
        title: "Tên lửa SAM-2",
      },
    },
    {
      title: "Máy bay MiG-21 số hiệu 5121",
      text: "Chiếc tiêm kích do Liên Xô chế tạo mà phi công Phạm Tuân lái đêm 27/12/1972, vượt qua hàng rào máy bay hộ tống để bắn rơi một chiếc B-52.",
      image: MIG21,
    },
    {
      title: "Kính buồng lái B-52 trúng mảnh tên lửa",
      text: "Ô kính buồng lái một chiếc B-52 bị mảnh tên lửa SAM-2 xuyên thủng, vỡ toác — nay được Bảo tàng Quốc gia Không quân Mỹ lưu giữ. Hiện vật cho thấy B-52 không phải là \"bất khả xâm phạm\".",
      image: {
        src: `${PHOTO}/kinh-b52-trung-manh-sam2.webp`,
        alt: "Ô kính buồng lái máy bay nhìn từ bên trong, vỡ nứt chi chít quanh một lỗ thủng tròn",
        caption: "Kính buồng lái máy bay B-52 bị mảnh tên lửa SA-2 (SAM-2) xuyên thủng, năm 1972.",
        credit: "Bảo tàng Quốc gia Không quân Mỹ, phạm vi công cộng",
        sourceUrl: `${COMMONS}B-52_pilot’s_window_damaged_by_a_SA-2_missile_fragment.jpg`,
        title: "Kính buồng lái B-52",
      },
    },
  ],
  today: [
    KHAM_THIEN,
    {
      src: `${PHOTO}/bao-tang-chien-thang-b52.webp`,
      alt: "Tòa nhà bảo tàng màu trắng có dòng chữ \"Bảo tàng Chiến thắng B.52\", phía trước là hai tên lửa trên bệ phóng và hàng cờ đỏ",
      caption: "Bảo tàng Chiến thắng B-52 trên phố Đội Cấn, Hà Nội — nơi trưng bày xác B-52 và tên lửa SAM-2 (ảnh năm 2013).",
      credit: "David Berkowitz, CC BY 2.0",
      sourceUrl: `${COMMONS}B52_Victory_Museum_in_Hanoi.jpg`,
    },
  ],
  toVerify: [
    "Số liệu \"81 máy bay, 34 B-52, 5 F-111, bắt sống 43 phi công\" — đối chiếu với SGK (tài liệu phía Mỹ công bố thấp hơn, ví dụ 15 B-52).",
    "Ngày Ních-xơn phê chuẩn kế hoạch tập kích: 14/12/1972.",
    "Đêm 18/12: bắn rơi 3 B-52, một chiếc rơi tại chỗ ở cánh đồng Chuôm (Phù Lỗ, Sóc Sơn) — vị trí trên bản đồ là gần đúng.",
    "Số B-52 bắn rơi đêm 20/12 (7 chiếc) và đêm 26/12 (8 chiếc).",
    "Ngày Bệnh viện Bạch Mai bị tàn phá nặng nhất (22/12/1972) và số người thiệt mạng ở Khâm Thiên (\"hàng trăm\").",
    "Chiếc MiG-21 số hiệu 5121 là máy bay Phạm Tuân lái đêm 27/12/1972; chiếc B-52 rơi xuống hồ Hữu Tiệp cũng đêm 27/12.",
    "Vũ Xuân Thiều hi sinh đêm 28/12/1972 khi tiêu diệt B-52; danh hiệu Anh hùng LLVTND được truy tặng.",
    "Ảnh bìa: theo tên tệp gốc chụp ở khu \"B52 Victory Centre / hồ Hữu Tiệp\" (Ba Đình) — chú thích chỉ ghi \"giữa khu phố Hà Nội\" vì ảnh không thấy mặt hồ.",
    "Ảnh tên lửa SAM-2: người chụp ghi bệ phóng này từng bắn rơi B-52 đêm 18/12/1972 — chưa kiểm chứng nên không đưa vào chú thích.",
  ],
};
