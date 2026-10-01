import { dienBienPhu1954 } from "@/lib/battles/dien-bien-phu-1954";
import type { Lesson, LessonScan3D } from "@/lib/lessons/types";

// Bài học tương tác: Chiến dịch Điện Biên Phủ 1954. Nội dung VIẾT LẠI theo khung SGK Lịch sử 12 (Kết nối tri thức),
// không chép nguyên văn sách. Ảnh đã kiểm tra giấy phép trên Wikimedia Commons (24/9/2026), tải về public/lessons/dien-bien-phu.
// Video: nhúng YouTube từ kênh truyền hình chính thống, đã xác minh bằng oEmbed (cho phép nhúng) ngày 24/9/2026.

const PHOTO = "/lessons/dien-bien-phu";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";
const commonsFile = (name: string) => `${COMMONS}${encodeURIComponent(name.replaceAll(" ", "_"))}`;
// Ảnh TTXVN 1953–1954: Commons gắn PD-Vietnam nhưng tới 2026 mới ~72–73 năm (< 75 năm bảo hộ) — ghi rõ để xem lại.
const TTXVN_CREDIT = "TTXVN, qua Wikimedia Commons (Commons ghi phạm vi công cộng tại Việt Nam; nhãn này đang được xem lại)";

// Mô hình quét 3D (xoay 360°) của hiện vật/di tích thật, nhúng trình xem Sketchfab — tác giả cho phép nhúng (kiểm tra oEmbed
// ngày 30/9/2026), không cho tải file. Ảnh xem trước lấy từ Sketchfab.
const sketchfabPoster = (id: string, path: string) => `https://media.sketchfab.com/models/${id}/thumbnails/${path}`;

const SCAN_PHAO_H6: LessonScan3D = {
  sketchfabId: "af9bce7582804769865dc9f8f549ed70",
  title: "Trận địa Pháo H6 | Artillery battle H6",
  author: "Atlantic Truong | Vietnam 3D",
  authorUrl: "https://sketchfab.com/atlantictruong19",
  poster: sketchfabPoster("af9bce7582804769865dc9f8f549ed70", "afebd7b68c2b4e4ea03e23efffc1da99/91ed5cde0976444f846b4564e56f9a60.jpeg"),
  note: "Khẩu pháo ở trận địa pháo H6, Điện Biên Phủ; theo mô tả của tác giả, pháo của Tiểu đoàn 224 ở đây bắn những loạt đạn đầu tiên vào phân khu Trung tâm.",
  sizeMb: 56,
};

const SCAN_MU_TRAN_CAN: LessonScan3D = {
  sketchfabId: "2e78e5054efb4b0e83914848226c529a",
  title: "Mũ Cối Anh Hùng Liệt Sĩ Trần Can năm 1954",
  author: "SEAP VR",
  authorUrl: "https://sketchfab.com/seapvisualization",
  poster: sketchfabPoster("2e78e5054efb4b0e83914848226c529a", "c45ccd30aeff4089834bfeb6327b51cd/ccb1b007b39f47b18dc327da97829d10.jpeg"),
  note: "Hiện vật thật được số hóa 3D; thông tin hiện vật theo mô tả của đơn vị số hóa.",
  sizeMb: 24,
};

const SCAN_DEP_CAO_SU: LessonScan3D = {
  sketchfabId: "443378d6d13c4aed8bf1b4fba09ee9e5",
  title: "Đôi Dép Cao Su Điện Biên Phủ",
  author: "SEAP VR",
  authorUrl: "https://sketchfab.com/seapvisualization",
  poster: sketchfabPoster("443378d6d13c4aed8bf1b4fba09ee9e5", "8dcaf8b038b14f2ba8426cff2f6d9d6d/8b885bd551f242ed9547e76e9c69b011.jpeg"),
  note: "Hiện vật thật được số hóa 3D; thông tin hiện vật theo mô tả của đơn vị số hóa.",
  sizeMb: 12,
};

const SCAN_CUM_TUONG: LessonScan3D = {
  sketchfabId: "050b006020fa4b9985b6cc352f49e1dc",
  title: "Cụm tượng chiến thắng Điện Biên Phủ",
  author: "MetaArt",
  authorUrl: "https://sketchfab.com/MetaArtVN",
  poster: sketchfabPoster("050b006020fa4b9985b6cc352f49e1dc", "d61f8f73843e4207b485e6352bdb81d2/f7ee4ab2e32042729dc0db73cbe817a0.jpeg"),
  note: "Mô hình quét 3D cụm tượng của nhà điêu khắc Nguyễn Hải (theo mô tả của tác giả mô hình).",
  sizeMb: 7,
};

const SCAN_LONG_CHAO: LessonScan3D = {
  sketchfabId: "2e04601c8dab45179b81e5478df2c6e8",
  title: "127 - Dien Bien Phu",
  author: "cdg",
  authorUrl: "https://sketchfab.com/cdg",
  poster: sketchfabPoster("2e04601c8dab45179b81e5478df2c6e8", "c3a4c20e0d1044aa91ab828cb404468d/3f75fba619c841f3a4c5e095a4c5449e.jpeg"),
  note: "Địa hình lòng chảo dựng từ dữ liệu độ cao, phủ ảnh; các chấm tròn trên mô hình mở ảnh chụp hàng không (chú thích tiếng Pháp). Giấy phép CC BY-NC.",
  sizeMb: 6,
};

const DE_CASTRIES_PORTRAIT = {
  src: `${PHOTO}/de-castries.webp`,
  alt: "Chân dung đại tá Christian de Castries năm 1954",
  caption: "Christian de Castries, 1954.",
  credit: "Không rõ tác giả, phạm vi công cộng",
  sourceUrl: `${COMMONS}Dien_Bien_Phu001.jpg`,
};

// Bản 400 px của ảnh trong kho ảnh GĐ1. Chưa có ảnh thời 1954 với giấy phép rõ ràng nên dùng ảnh 2008.
const VO_NGUYEN_GIAP_PORTRAIT = {
  src: `${PHOTO}/vo-nguyen-giap.webp`,
  alt: "Đại tướng Võ Nguyên Giáp lúc tuổi cao, mặc quân phục trắng gắn huân chương",
  caption: "Đại tướng Võ Nguyên Giáp năm 2008.",
  credit: "Ricardo Stuckert (PR/ABr/Brazil), CC BY 3.0 br",
  sourceUrl: `${COMMONS}Vo_Nguyen_Giap_2008.jpg`,
};

const HAM_DE_CASTRIES_NAY = {
  src: `${PHOTO}/ham-de-castries-nay.webp`,
  alt: "Hầm chỉ huy của De Castries được bảo tồn, có mái vòm bằng thép",
  caption: "Hầm chỉ huy tập đoàn cứ điểm ngày nay (2022).",
  credit: "Ioe2015, CC BY 4.0",
  sourceUrl: `${COMMONS}H%E1%BA%A7m_ch%E1%BB%89_huy_t%E1%BA%ADp_%C4%91o%C3%A0n_c%E1%BB%A9_%C4%91i%E1%BB%83m_%C4%90i%E1%BB%87n_Bi%C3%AAn_Ph%E1%BB%A7_(2022).jpg`,
  title: "Hầm De Castries",
  width: 1200,
  height: 900,
  depthSrc: `${PHOTO}/ham-de-castries-nay-depth.webp`,
  hotspots: [
    { label: "Mái vòm thép", text: "Mái hầm bằng thép lượn sóng, phủ bao cát chống pháo. Chiều 7/5/1954, tướng De Castries bị bắt sống trong hầm này.", x: 40, y: 57 },
    { label: "Bao cát", text: "Hàng bao cát xếp quanh hầm để chắn mảnh đạn.", x: 8, y: 62 },
    { label: "Mái che bảo tồn", text: "Mái che dựng thêm ngày nay để bảo vệ di tích khỏi mưa nắng.", x: 25, y: 22 },
  ],
};

export const dienBienPhuLesson: Lesson = {
  slug: "chien-dich-dien-bien-phu",
  eventSlug: "chien-dich-dien-bien-phu",
  title: "Chiến dịch Điện Biên Phủ",
  dateText: "13/3 – 7/5/1954",
  tagline: "56 ngày đêm \"khoét núi, ngủ hầm, mưa dầm, cơm vắt\" làm nên chiến thắng \"lừng lẫy năm châu, chấn động địa cầu\".",
  copy: {
    cardDescription: "Bản đồ diễn biến 7 bước, bản đồ 3D, mô hình 3D, ảnh tư liệu, video và thẻ ghi nhớ.",
    mapTitle: "Xem chiến dịch diễn ra từng bước",
    mapHint: "Bản đồ sẽ bay từ toàn cảnh Đông Dương vào lòng chảo Mường Thanh; cứ điểm nào bị tiêu diệt sẽ đổi màu.",
    videoTitle: "Video về chiến dịch",
    resultsTitle: "Vì sao gọi là chiến thắng \"chấn động địa cầu\"?",
    todayTitle: "Chiến trường xưa bây giờ ra sao?",
  },
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
  // Mô hình 3D dựng bằng mã (sa bàn, tượng, hiện vật, di tích) đã thay bằng ảnh chụp thật theo yêu cầu (30/9/2026).
  resultsScan: SCAN_LONG_CHAO,
  resultsImage: {
    src: `${PHOTO}/canh-dong-dien-bien.webp`,
    alt: "Ảnh chụp từ trên cao: lòng chảo Điện Biên rộng, dòng sông uốn khúc giữa những cánh đồng",
    caption: "Toàn cảnh cánh đồng Mường Thanh — lòng chảo Điện Biên, chụp năm 1953.",
    credit: TTXVN_CREDIT,
    sourceUrl: commonsFile("Toàn cảnh cánh đồng Điện Biên.jpg"),
    title: "Lòng chảo Điện Biên",
    width: 854,
    height: 588,
    depthSrc: `${PHOTO}/canh-dong-dien-bien-depth.webp`,
    hotspots: [
      { label: "Sông Nậm Rốm", text: "Dòng sông uốn khúc chảy qua lòng chảo Mường Thanh.", x: 18, y: 62 },
      { label: "Cánh đồng Mường Thanh", text: "Lòng chảo dài khoảng 18 km, rộng 6–8 km, nơi Pháp xây dựng tập đoàn cứ điểm.", x: 65, y: 60 },
    ],
  },
  artifacts: [
    {
      title: "Lựu pháo 105 mm",
      text: "Pháo được tháo rời hoặc kéo bằng tay qua núi cao, vực sâu vào trận địa trên các sườn núi quanh lòng chảo, ngụy trang kín và chỉ đưa ra khi bắn. Chiếc lựu pháo trong ảnh từng dùng ở Điện Biên Phủ.",
      image: {
        src: `${PHOTO}/luu-phao-105-bao-tang.webp`,
        alt: "Khẩu lựu pháo 105 mm sơn xanh, nòng dài, đặt trên bệ trưng bày trước một tòa nhà",
        caption: "Lựu pháo 105 mm dùng ở Điện Biên Phủ, trưng bày tại Bảo tàng Lịch sử Quân sự Việt Nam (Hà Nội), 2012.",
        credit: "Gary Todd, CC0",
        sourceUrl: commonsFile("105mm Howitzer Used at Dienbienphu, 1954 (9732175909).jpg"),
        title: "Lựu pháo 105 mm",
        width: 1400,
        height: 933,
        depthSrc: `${PHOTO}/luu-phao-105-bao-tang-depth.webp`,
        hotspots: [
          { label: "Nòng pháo", text: "Nòng cỡ 105 mm bắn đạn nổ theo đường cong vòng qua núi, rơi xuống các cứ điểm trong lòng chảo.", x: 12, y: 18 },
          { label: "Lá chắn thép", text: "Tấm thép che cho kíp pháo khỏi mảnh đạn. Ở Điện Biên Phủ, pháo được đặt trong hầm, ngụy trang kín, chỉ đẩy ra khi bắn.", x: 55, y: 38 },
          { label: "Bánh xe", text: "Hai bánh xe lớn. Trên đường kéo pháo qua núi, bộ đội dùng dây tời và sức người kéo từng mét.", x: 57, y: 72 },
          { label: "Càng pháo", text: "Hai càng thép xòe ra, đầu cắm xuống đất để giữ pháo đứng vững khi bắn.", x: 88, y: 72 },
        ],
      },
      scan: SCAN_PHAO_H6,
    },
    {
      title: "Mũ nan của Anh hùng Trần Can",
      text: "Chiếc mũ Anh hùng liệt sĩ Trần Can tự làm: tre chẻ nhỏ, vuốt mỏng, đan thành mũ rồi bọc vải xanh, phủ lưới và buộc các dải vải màu lá cây để ngụy trang. Anh dùng chiếc mũ qua nhiều chiến dịch và hy sinh ngày 6/5/1954 ở khu trung tâm Điện Biên Phủ.",
      scan: SCAN_MU_TRAN_CAN,
    },
    {
      title: "Dép cao su",
      text: "Đôi dép cao su của cựu thanh niên xung phong Bùi Đức Tuệ (đội 34, C293), đi suốt đợt phục vụ chiến dịch Điện Biên Phủ. Bốn quai đan chéo ôm chặt bàn chân, đế đóng đinh nhỏ cho chắc — đủ bền để hành quân qua đường rừng núi.",
      scan: SCAN_DEP_CAO_SU,
    },
    {
      title: "Pháo cao xạ 37 mm",
      text: "Pháo cao xạ bắn máy bay địch, khống chế bầu trời lòng chảo. Khi sân bay bị khống chế, máy bay vận tải phải bay cao thả dù nên nhiều kiện hàng tiếp tế rơi lệch sang trận địa của ta.",
      image: {
        src: `${PHOTO}/phao-cao-xa-37.webp`,
        alt: "Khẩu pháo cao xạ 37 mm sơn xanh với nòng chĩa lên trời, đặt trên bãi cỏ",
        caption: "Pháo cao xạ 37 mm trưng bày tại Bảo tàng Lịch sử Quân sự Việt Nam (Hà Nội), 2012.",
        credit: "Gary Todd, CC0",
        sourceUrl: commonsFile("37mm Anti-aircraft Gun (9735273026).jpg"),
        title: "Pháo cao xạ 37 mm",
        width: 1400,
        height: 933,
        depthSrc: `${PHOTO}/phao-cao-xa-37-depth.webp`,
        hotspots: [
          { label: "Nòng pháo", text: "Nòng dài, bắn nhanh lên trời để bắn máy bay địch bay thấp trên lòng chảo.", x: 22, y: 18 },
          { label: "Chỗ ngồi pháo thủ", text: "Pháo thủ ngồi hai bên, quay tay quay để xoay pháo theo máy bay và nâng hạ nòng.", x: 73, y: 45 },
          { label: "Bánh xe", text: "Pháo có bánh xe để kéo đi; khi vào trận địa thì hạ chân chống, đặt vững trên mặt đất.", x: 43, y: 75 },
          { label: "Chân chống", text: "Các chân chống xòe ra bốn phía giữ pháo cân bằng khi xoay bắn.", x: 88, y: 78 },
        ],
      },
    },
    {
      title: "Xe đạp thồ",
      text: "Hàng chục vạn dân công dắt xe đạp thồ chở gạo, đạn qua đèo dốc, suối sâu ra mặt trận. Mỗi chiếc xe được gia cố thêm, có cần tre dài để lái và chở được nhiều lần sức một người gánh.",
      image: {
        src: `${PHOTO}/dan-cong-tho.webp`,
        alt: "Ảnh đen trắng: dân công dắt những chiếc xe đạp chất đầy bao hàng trên con đường đất",
        caption: "Dân công thồ lương thực ra mặt trận Điện Biên Phủ, 1954.",
        credit: TTXVN_CREDIT,
        sourceUrl: commonsFile("Dan cong tho luong thuc.jpg"),
        title: "Xe đạp thồ",
        width: 450,
        height: 309,
        depthSrc: `${PHOTO}/dan-cong-tho-depth.webp`,
        hotspots: [
          { label: "Đoàn xe thồ", text: "Dân công đi thành đoàn dài, nối nhau trên đường ra mặt trận.", x: 20, y: 25 },
          { label: "Cành lá ngụy trang", text: "Hàng và xe được phủ cành lá để tránh máy bay địch phát hiện.", x: 65, y: 52 },
          { label: "Bao hàng", text: "Gạo, muối, đạn… buộc chặt hai bên xe; mỗi chiếc chở được nhiều lần sức một người gánh.", x: 60, y: 72 },
          { label: "Người dắt xe", text: "Người dân công dắt bộ bên cạnh, giữ thăng bằng cho chiếc xe nặng trên đường dốc.", x: 76, y: 40 },
        ],
      },
    },
    {
      title: "Mở đường vào chiến dịch",
      text: "Bộ đội công binh và dân công phá đá, san dốc, mở những con đường mới xuyên rừng núi để kéo pháo và đưa hàng vào sát lòng chảo.",
      image: {
        src: `${PHOTO}/cong-binh-mo-duong.webp`,
        alt: "Ảnh đen trắng: bộ đội đội mũ nan dùng cuốc, xẻng mở đường bên vách núi",
        caption: "Công binh mở đường vào chiến dịch, 1953.",
        credit: TTXVN_CREDIT,
        sourceUrl: commonsFile("Công binh mở đường vào chiến dịch.jpg"),
        title: "Mở đường",
        width: 450,
        height: 338,
        depthSrc: `${PHOTO}/cong-binh-mo-duong-depth.webp`,
        hotspots: [
          { label: "Vách núi đá", text: "Đường vào chiến dịch phải xuyên qua núi đá, rừng rậm; nhiều đoạn phải phá đá, bạt núi bằng sức người.", x: 15, y: 30 },
          { label: "Mũ nan", text: "Mũ nan đan bằng tre, nhẹ, dễ cắm lá ngụy trang — hình ảnh quen thuộc của bộ đội thời chống Pháp.", x: 66, y: 35 },
        ],
      },
    },
    {
      title: "Bữa cơm trong chiến hào",
      text: "Nhờ hệ thống hào dài hàng trăm ki-lô-mét, bộ đội ăn, ở, chiến đấu ngay trong hào, tránh được pháo và máy bay địch, tiến sát từng cứ điểm.",
      image: {
        src: `${PHOTO}/chien-si-an-com.webp`,
        alt: "Ảnh đen trắng: các chiến sĩ đội mũ nan đứng ăn cơm trong lòng chiến hào hẹp",
        caption: "Bộ đội ăn cơm trong chiến hào ở mặt trận Điện Biên Phủ, 1954.",
        credit: TTXVN_CREDIT,
        sourceUrl: commonsFile("Bộ đội sinh hoạt trong chiến hào.jpg"),
        title: "Chiến hào",
        width: 709,
        height: 806,
        depthSrc: `${PHOTO}/chien-si-an-com-depth.webp`,
        hotspots: [
          { label: "Mũ nan", text: "Mũ nan đan bằng tre, cắm thêm lá để ngụy trang khi di chuyển trong hào.", x: 72, y: 22 },
          { label: "Vách chiến hào", text: "Hào đào sâu ngang người, đủ để di chuyển, ăn, ngủ mà không phải nhô lên mặt đất.", x: 85, y: 60 },
        ],
      },
    },
    {
      title: "Xe tăng M24 của Pháp",
      text: "Pháp tháo rời xe tăng M24, chở bằng máy bay vào sân bay Mường Thanh rồi lắp lại. Xe tăng dùng để phản kích, bắn yểm trợ bộ binh; xác một số chiếc vẫn còn ở Điện Biên Phủ ngày nay.",
      image: {
        src: `${PHOTO}/xe-tang-m24.webp`,
        alt: "Ảnh đen trắng: những chiếc xe tăng nhả khói trên cánh đồng cỏ cao, phía xa là đồi núi",
        caption: "Xe tăng M24 của Pháp bắn yểm trợ bộ binh ở Điện Biên Phủ, 1954.",
        credit: "Quân đội Hoa Kỳ (Donn A. Starry, \"Mounted Combat in Vietnam\"), phạm vi công cộng",
        sourceUrl: commonsFile("French M24s atr Dien Bien Phu.jpg"),
        title: "Xe tăng M24",
        width: 1048,
        height: 727,
        depthSrc: `${PHOTO}/xe-tang-m24-depth.webp`,
        hotspots: [
          { label: "Xe tăng M24", text: "Xe tăng hạng nhẹ của Pháp, được tháo rời chở bằng máy bay vào sân bay Mường Thanh rồi lắp lại.", x: 88, y: 45 },
          { label: "Khói đạn bắn", text: "Khói trắng: xe tăng đang bắn yểm trợ cho bộ binh Pháp.", x: 30, y: 46 },
          { label: "Núi bao quanh", text: "Đồi núi bao quanh lòng chảo — nơi ta đặt trận địa pháo nhìn xuống toàn bộ tập đoàn cứ điểm.", x: 65, y: 30 },
        ],
      },
    },
  ],
  // Mục "Phim 3D: Đồi A1" đã gỡ khỏi bài học theo yêu cầu (30/9/2026); phim vẫn xem được ở trang riêng /phim-3d/doi-a1.
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
      image: VO_NGUYEN_GIAP_PORTRAIT,
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
  todayScans: [
    {
      title: "Cụm tượng Chiến thắng",
      text: "Cụm tượng Chiến thắng Điện Biên Phủ của nhà điêu khắc Nguyễn Hải: các chiến sĩ tung cờ trên nóc hầm chỉ huy của địch.",
      scan: SCAN_CUM_TUONG,
    },
  ],
  today: [
    {
      src: `${PHOTO}/bao-tang-2022.webp`,
      alt: "Tòa nhà Bảo tàng Chiến thắng lịch sử Điện Biên Phủ hình nón cụt với khung đan chéo, phía trước là hoa vàng",
      caption: "Bảo tàng Chiến thắng lịch sử Điện Biên Phủ, nơi trưng bày hiện vật của chiến dịch (ảnh 2022).",
      credit: "Ioe2015, CC BY-SA 4.0",
      sourceUrl: commonsFile("The Museum of Dien Bien Phu Victory (front, 2022).jpg"),
      title: "Bảo tàng Chiến thắng",
      width: 1400,
      height: 1026,
      depthSrc: `${PHOTO}/bao-tang-2022-depth.webp`,
      hotspots: [
        { label: "Tòa bảo tàng", text: "Bảo tàng Chiến thắng lịch sử Điện Biên Phủ trưng bày hiện vật, ảnh và bản đồ về chiến dịch.", x: 45, y: 55 },
      ],
    },
    HAM_DE_CASTRIES_NAY,
    {
      src: `${PHOTO}/ho-boc-pha-a1.webp`,
      alt: "Hố sâu trên đồi A1 do khối bộc phá tạo ra",
      caption: "Hố bộc phá trên đồi A1 — dấu tích vụ nổ đêm 6/5/1954.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}Crater_Left_by_Vietminh_Dynamite_Blast_-_Hill_A1_(Eliane_2)_-_Dien_Bien_Phu_-_Vietnam_(48168795271).jpg`,
      title: "Hố bộc phá A1",
      width: 1000,
      height: 750,
      depthSrc: `${PHOTO}/ho-boc-pha-a1-depth.webp`,
      hotspots: [
        { label: "Miệng hố", text: "Hố sâu do khối bộc phá gần 1 tấn phát nổ đêm 6/5/1954 dưới lòng đồi A1.", x: 50, y: 45 },
        { label: "Cọc rào", text: "Cọc rào khoanh vùng bảo vệ di tích ngày nay.", x: 30, y: 70 },
      ],
    },
    {
      src: `${PHOTO}/chien-hao-a1.webp`,
      alt: "Chiến hào được bảo tồn trên đồi A1",
      caption: "Chiến hào trên đồi A1 được bảo tồn.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}French_Trenches_at_Hill_A1_(Eliane_2)_-_Dien_Bien_Phu_-_Vietnam_-_02_(48168793656).jpg`,
      title: "Chiến hào A1",
      width: 900,
      height: 675,
      depthSrc: `${PHOTO}/chien-hao-a1-depth.webp`,
      hotspots: [
        { label: "Lòng hào", text: "Chiến hào trên đồi A1 được giữ lại; hai bên giành giật từng đoạn hào suốt nhiều tuần.", x: 35, y: 70 },
        { label: "Mặt đồi A1", text: "Đồi A1 — cứ điểm then chốt ở phía đông phân khu Trung tâm (Pháp gọi là Éliane 2).", x: 80, y: 55 },
      ],
    },
    {
      src: `${PHOTO}/tuong-dai-d1.webp`,
      alt: "Phù điêu tại tượng đài Chiến thắng trên đồi D1",
      caption: "Phù điêu ở tượng đài Chiến thắng Điện Biên Phủ trên đồi D1.",
      credit: "Adam Jones, CC BY-SA 2.0",
      sourceUrl: `${COMMONS}Frieze_Showing_French_Surrender_in_May_1954_-_Hill_D1_(Victory_Monument)_-_Dien_Bien_Phu_-_Vietnam_(48168819157).jpg`,
      title: "Phù điêu đồi D1",
      width: 1000,
      height: 750,
      depthSrc: `${PHOTO}/tuong-dai-d1-depth.webp`,
      hotspots: [
        { label: "Lính Pháp giơ tay", text: "Phù điêu khắc cảnh quân Pháp giơ tay đầu hàng, ở tượng đài Chiến thắng trên đồi D1.", x: 45, y: 18 },
      ],
    },
  ],
  toVerify: [
    "Số bài và số trang trong SGK Lịch sử 12 Kết nối tri thức.",
    "49 cứ điểm, 3 phân khu; quân số lúc cao nhất 16.200.",
    "Kết quả: loại khỏi vòng chiến đấu 16.200 địch, bắn rơi và phá hủy 62 máy bay.",
    "Các ngày của ba đợt: 13/3–17/3, 30/3–26/4, 1/5–7/5/1954.",
    "Khối bộc phá ở đồi A1 \"gần 1 tấn\".",
    "Cách viết \"Giơnevơ\" hay \"Genève\" theo đúng bộ sách.",
    "Câu thơ Tố Hữu và tên bài thơ.",  ],
};
