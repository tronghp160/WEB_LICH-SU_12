import type { BattleScenario, LatLng, StrongpointStatus, UnitState } from "@/lib/battles/types";

// Cách mạng tháng Tám 1945 — bản đồ "khởi nghĩa lan rộng theo ngày" (viết cứng, không lưu database).
// Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức), không chép nguyên văn; các chi tiết cần đối chiếu nằm ở
// `toVerify` trong lib/lessons/cach-mang-thang-tam.ts.
//
// Dùng lại bộ máy bản đồ diễn biến của Điện Biên Phủ với ý nghĩa mới: mỗi "cứ điểm" là một địa phương — xanh = chính quyền
// còn trong tay Nhật và chính quyền thân Nhật, viền đỏ nhấp nháy = đang khởi nghĩa, đỏ sao vàng = nhân dân đã giành chính quyền.
// Tọa độ: trung tâm các tỉnh lỵ năm 1945 (Hội An là tỉnh lỵ Quảng Nam, Di Linh là tỉnh lỵ Đồng Nai Thượng — gần đúng);
// vùng Khu giải phóng Việt Bắc chỉ vẽ phác theo sáu tỉnh, không theo ranh giới thật.

const PHOTO = "/lessons/cach-mang-thang-tam";

const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });
const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });

export const PLACES = {
  thaiNguyen: [21.594, 105.848],
  bacGiang: [21.273, 106.194],
  haiDuong: [20.94, 106.33],
  haNoi: [21.028, 105.854],
  haTinh: [18.343, 105.906],
  hue: [16.463, 107.59],
  quangNam: [15.88, 108.335],
  saiGon: [10.776, 106.701],
  dongNaiThuong: [11.583, 108.07],
  haTien: [10.383, 104.487],
} satisfies Record<string, LatLng>;

export const TAN_TRAO: LatLng = [21.783, 105.432];

type PlaceId = keyof typeof PLACES;

/** Mọi địa phương "còn trong tay Nhật" trừ những nơi ghi đè. */
function status(overrides: Partial<Record<PlaceId, StrongpointStatus>>): Record<string, StrongpointStatus> {
  const all = Object.fromEntries(Object.keys(PLACES).map((id) => [id, "held" as StrongpointStatus]));
  return { ...all, ...overrides };
}

const WHOLE_COUNTRY = { center: [16.0, 106.2] as LatLng, zoom: 5 };
const NORTH = { center: [21.25, 105.9] as LatLng, zoom: 7 };

const liberatedEarly = { bacGiang: "captured", haiDuong: "captured", haTinh: "captured", quangNam: "captured" } as const;

export const cachMangThangTam1945: BattleScenario = {
  slug: "cach-mang-thang-tam-1945",
  title: "Tổng khởi nghĩa tháng Tám năm 1945",
  dateText: "14 – 28/8/1945",
  summary: "Chỉ trong khoảng nửa tháng, nhân dân cả nước nổi dậy giành chính quyền, dẫn tới sự ra đời của nước Việt Nam Dân chủ Cộng hòa.",
  center: WHOLE_COUNTRY.center,
  zoom: WHOLE_COUNTRY.zoom,
  minZoom: 4,
  maxZoom: 13,
  unitDefinitions: [
    { id: "hq", kind: "vn-hq", label: "Tân Trào — nơi đặt cơ quan lãnh đạo Tổng khởi nghĩa" },
    { id: "gpq", kind: "vn-infantry", label: "Đơn vị Giải phóng quân do Võ Nguyên Giáp chỉ huy" },
  ],
  strongpointDefinitions: [
    { id: "thaiNguyen", label: "Thái Nguyên", name: "Thị xã Thái Nguyên", position: PLACES.thaiNguyen, minorLabel: true },
    { id: "bacGiang", label: "Bắc Giang", name: "Tỉnh lỵ Bắc Giang", position: PLACES.bacGiang, minorLabel: true },
    { id: "haiDuong", label: "Hải Dương", name: "Tỉnh lỵ Hải Dương", position: PLACES.haiDuong, minorLabel: true },
    { id: "haNoi", label: "Hà Nội", name: "Hà Nội", position: PLACES.haNoi },
    { id: "haTinh", label: "Hà Tĩnh", name: "Tỉnh lỵ Hà Tĩnh", position: PLACES.haTinh },
    { id: "hue", label: "Huế", name: "Huế", position: PLACES.hue },
    { id: "quangNam", label: "Quảng Nam", name: "Tỉnh lỵ Quảng Nam (Hội An)", position: PLACES.quangNam },
    { id: "saiGon", label: "Sài Gòn", name: "Sài Gòn – Chợ Lớn", position: PLACES.saiGon },
    { id: "dongNaiThuong", label: "Đồng Nai Thượng", name: "Tỉnh Đồng Nai Thượng (vị trí gần đúng)", position: PLACES.dongNaiThuong },
    { id: "haTien", label: "Hà Tiên", name: "Hà Tiên", position: PLACES.haTien },
  ],
  arrowDefinitions: [
    { id: "tan-trao-thai-nguyen", kind: "attack", path: [TAN_TRAO, [21.72, 105.6], [21.63, 105.78]] },
    { id: "thai-nguyen-ha-noi", kind: "supply", path: [PLACES.thaiNguyen, [21.35, 105.86], [21.07, 105.855]] },
  ],
  zoneDefinitions: [
    {
      id: "viet-bac",
      kind: "siege",
      label: "Khu giải phóng Việt Bắc",
      // Phác theo sáu tỉnh Cao Bằng, Bắc Kạn, Lạng Sơn, Hà Giang, Tuyên Quang, Thái Nguyên (không phải ranh giới thật).
      path: [
        [23.35, 104.9],
        [23.1, 105.9],
        [22.85, 106.75],
        [22.3, 106.95],
        [21.75, 106.85],
        [21.45, 106.2],
        [21.42, 105.75],
        [21.55, 105.25],
        [22.05, 104.85],
        [22.7, 104.5],
      ],
    },
  ],
  legend: [
    { className: "battle-sp battle-sp--held", label: "Chính quyền còn trong tay Nhật và tay sai" },
    { className: "battle-sp battle-sp--attacked", label: "Đang nổi dậy khởi nghĩa" },
    { className: "battle-sp battle-sp--captured", label: "Nhân dân đã giành chính quyền" },
    { className: "battle-unit battle-unit--vn-hq", label: "Tân Trào — cơ quan lãnh đạo" },
    { className: "battle-unit battle-unit--vn-infantry", label: "Giải phóng quân" },
    { className: "battle-legend-arrow", label: "Hướng tiến quân" },
    { className: "battle-legend-siege", label: "Khu giải phóng Việt Bắc (vẽ phác)" },
  ],
  steps: [
    {
      id: "boi-canh",
      title: "Thời cơ đến gần",
      dateText: "3 – 7/1945",
      caption:
        "Chiến tranh thế giới thứ hai bước vào giai đoạn cuối. Đêm 9/3/1945, Nhật đảo chính lật đổ Pháp, độc chiếm Đông Dương. Ngày 12/3, Ban Thường vụ Trung ương Đảng ra chỉ thị \"Nhật – Pháp bắn nhau và hành động của chúng ta\", xác định kẻ thù chính trước mắt là phát xít Nhật và phát động cao trào kháng Nhật cứu nước. Tháng 5/1945 các lực lượng vũ trang hợp nhất thành Việt Nam Giải phóng quân. Ngày 4/6/1945, Khu giải phóng Việt Bắc được thành lập gồm sáu tỉnh Cao Bằng, Bắc Kạn, Lạng Sơn, Hà Giang, Tuyên Quang, Thái Nguyên, lấy Tân Trào làm trung tâm.",
      camera: { center: [22.2, 105.8], zoom: 7 },
      units: { hq: at(TAN_TRAO), gpq: at([21.74, 105.47]) },
      strongpoints: { thaiNguyen: "held", bacGiang: "held", haiDuong: "held", haNoi: "held" },
      zones: ["viet-bac"],
      fact: {
        title: "Nạn đói năm Ất Dậu",
        text: "Chính sách vơ vét thóc gạo của Nhật và Pháp gây ra nạn đói cuối 1944 – đầu 1945 làm khoảng 2 triệu đồng bào ta chết đói. Khẩu hiệu \"Phá kho thóc, giải quyết nạn đói\" của Việt Minh đã kéo hàng triệu người vào cao trào cách mạng.",
      },
    },
    {
      id: "lenh-tong-khoi-nghia",
      title: "Nhật đầu hàng — lệnh Tổng khởi nghĩa",
      dateText: "13 – 16/8/1945",
      caption:
        "Tin phát xít Nhật sắp đầu hàng, ngày 13/8/1945 Trung ương Đảng và Tổng bộ Việt Minh thành lập Ủy ban Khởi nghĩa toàn quốc; 23 giờ cùng ngày ra Quân lệnh số 1 phát lệnh Tổng khởi nghĩa. Ngày 15/8, Nhật đầu hàng Đồng minh không điều kiện. Từ 14 đến 15/8, Hội nghị toàn quốc của Đảng họp ở Tân Trào quyết định phát động Tổng khởi nghĩa, giành chính quyền trước khi quân Đồng minh vào Đông Dương. Ngày 16/8, Quốc dân Đại hội Tân Trào tán thành chủ trương đó, thông qua 10 chính sách lớn của Việt Minh và cử ra Ủy ban Dân tộc giải phóng Việt Nam do Hồ Chí Minh làm Chủ tịch.",
      camera: { center: [21.6, 105.6], zoom: 8 },
      units: { hq: at(TAN_TRAO), gpq: at([21.74, 105.47]) },
      strongpoints: { thaiNguyen: "held", bacGiang: "held", haiDuong: "held", haNoi: "held" },
      zones: ["viet-bac"],
      fact: {
        title: "Quốc kỳ và Quốc ca",
        text: "Quốc dân Đại hội Tân Trào cũng quyết định lấy lá cờ đỏ sao vàng làm Quốc kỳ và bài \"Tiến quân ca\" làm Quốc ca. Hồ Chí Minh gửi thư kêu gọi: \"Giờ quyết định cho vận mệnh dân tộc ta đã đến. Toàn quốc đồng bào hãy đứng dậy đem sức ta mà tự giải phóng cho ta.\"",
      },
      image: {
        src: `${PHOTO}/quan-lenh-so-1.webp`,
        alt: "Văn bản đánh máy Quân lệnh số 1 của Ủy ban Khởi nghĩa, mực tím đã phai",
        caption: "Quân lệnh số 1 của Ủy ban Khởi nghĩa toàn quốc, 23 giờ ngày 13/8/1945.",
        credit: "Trung tâm Lưu trữ quốc gia III, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "khoi-nghia-lan-rong",
      title: "Khởi nghĩa lan rộng — bốn tỉnh giành chính quyền sớm nhất",
      dateText: "16 – 18/8/1945",
      caption:
        "Chiều 16/8, một đơn vị Giải phóng quân do Võ Nguyên Giáp chỉ huy từ Tân Trào tiến về giải phóng thị xã Thái Nguyên, mở đầu Tổng khởi nghĩa. Ở khắp nơi, quần chúng theo lời kêu gọi của Việt Minh nổi dậy chiếm công sở, lập chính quyền cách mạng. Đến ngày 18/8, nhân dân bốn tỉnh Bắc Giang, Hải Dương, Hà Tĩnh và Quảng Nam đã giành được chính quyền ở tỉnh lỵ — sớm nhất cả nước.",
      camera: { center: [18.3, 106.6], zoom: 6 },
      units: { hq: at(TAN_TRAO), gpq: at([21.63, 105.78]) },
      strongpoints: status({ ...liberatedEarly, thaiNguyen: "attacked" }),
      arrows: ["tan-trao-thai-nguyen"],
      zones: ["viet-bac"],
      fact: {
        title: "Vì sao gọi là thời cơ \"ngàn năm có một\"?",
        text: "Pháp đã bị Nhật lật đổ, Nhật lại vừa đầu hàng Đồng minh, chính quyền thân Nhật hoang mang cực độ, còn quân Đồng minh chưa kịp vào Đông Dương. Trong khi đó, lực lượng cách mạng đã được chuẩn bị suốt 15 năm (1930–1945). Chậm trễ là bỏ lỡ thời cơ.",
      },
    },
    {
      id: "ha-noi",
      title: "Hà Nội khởi nghĩa thắng lợi",
      dateText: "19/8/1945",
      caption:
        "Ngày 17/8, cuộc mít tinh do Tổng hội viên chức tổ chức ở Nhà hát Lớn bị quần chúng biến thành cuộc biểu dương lực lượng ủng hộ Việt Minh; cờ đỏ sao vàng xuất hiện khắp phố phường. Sáng 19/8, hàng chục vạn quần chúng nội thành và ngoại thành dự mít tinh ở quảng trường Nhà hát Lớn, rồi chia thành nhiều đoàn chiếm Phủ Khâm sai, Sở Cảnh sát, Sở Bưu điện và các công sở khác. Chính quyền ở Hà Nội về tay nhân dân ngay trong ngày, cổ vũ mạnh mẽ các địa phương trong cả nước.",
      camera: NORTH,
      units: { hq: at(TAN_TRAO), gpq: at([21.63, 105.78]) },
      strongpoints: status({ ...liberatedEarly, thaiNguyen: "attacked", haNoi: "captured" }),
      zones: ["viet-bac"],
      fact: {
        title: "Mít tinh ngày 17/8 ở Nhà hát Lớn",
        text: "Hai ngày trước khởi nghĩa, một cuộc mít tinh của công chức ủng hộ chính phủ thân Nhật đã bị quần chúng \"đổi chiều\": cờ Việt Minh được giương lên, truyền đơn được tung ra, và đoàn người tuần hành qua các phố hô khẩu hiệu ủng hộ Việt Minh.",
      },
      image: {
        src: `${PHOTO}/bac-bo-phu-19-8.webp`,
        alt: "Ảnh đen trắng: đông đảo quần chúng cầm cờ tụ tập trước Bắc Bộ phủ ở Hà Nội",
        caption: "Quần chúng khởi nghĩa trước Bắc Bộ phủ (Phủ Khâm sai cũ), Hà Nội, ngày 19/8/1945. Ảnh: Vũ Năng An.",
        credit: "Vũ Năng An, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "hue-sai-gon",
      title: "Huế và Sài Gòn giành chính quyền",
      dateText: "23 – 25/8/1945",
      caption:
        "Ngày 23/8, hàng vạn nhân dân Huế và các vùng lân cận biểu tình thị uy, giành chính quyền ở kinh đô của triều Nguyễn. Ngày 25/8, quần chúng Sài Gòn – Chợ Lớn và các tỉnh lân cận xuống đường, chiếm các công sở; khởi nghĩa thắng lợi ở Sài Gòn. Thắng lợi ở ba trung tâm lớn Hà Nội, Huế, Sài Gòn có ý nghĩa quyết định, làm cho chính quyền thân Nhật tê liệt trên cả nước.",
      camera: WHOLE_COUNTRY,
      units: { hq: at(TAN_TRAO), gpq: at([21.63, 105.78]) },
      strongpoints: status({ ...liberatedEarly, thaiNguyen: "captured", haNoi: "captured", hue: "captured", saiGon: "captured" }),
      fact: {
        title: "Ba trung tâm lớn",
        text: "Hà Nội là trung tâm chính trị của Bắc Kỳ, Huế là kinh đô của triều Nguyễn và chính phủ thân Nhật, Sài Gòn là trung tâm kinh tế của Nam Kỳ. Giành được ba nơi này, cách mạng làm chủ những đầu mối quan trọng nhất của đất nước.",
      },
    },
    {
      id: "ca-nuoc",
      title: "Cả nước giành chính quyền — vua Bảo Đại thoái vị",
      dateText: "28 – 30/8/1945",
      caption:
        "Ngày 28/8, Đồng Nai Thượng và Hà Tiên là những địa phương giành chính quyền cuối cùng. Chỉ trong khoảng 15 ngày (từ 14 đến 28/8/1945), Tổng khởi nghĩa đã thành công trên cả nước. Cũng ngày 28/8, Ủy ban Dân tộc giải phóng Việt Nam cải tổ thành Chính phủ lâm thời nước Việt Nam Dân chủ Cộng hòa. Chiều 30/8, tại Ngọ Môn (Huế), vua Bảo Đại tuyên bố thoái vị, trao ấn và kiếm cho đại diện Chính phủ lâm thời; chế độ quân chủ ở Việt Nam sụp đổ.",
      camera: WHOLE_COUNTRY,
      units: { hq: at(TAN_TRAO), gpq: at([21.07, 105.855]) },
      strongpoints: status({
        ...liberatedEarly,
        thaiNguyen: "captured",
        haNoi: "captured",
        hue: "captured",
        saiGon: "captured",
        dongNaiThuong: "captured",
        haTien: "captured",
      }),
      arrows: ["thai-nguyen-ha-noi"],
      fact: {
        title: "\"Làm dân một nước tự do\"",
        text: "Trong chiếu thoái vị, Bảo Đại viết: \"Trẫm muốn được làm dân một nước tự do hơn làm vua một nước bị trị\". Sau đó ông nhận làm Cố vấn tối cao của Chính phủ lâm thời với tên Vĩnh Thụy.",
      },
      image: {
        src: `${PHOTO}/dien-van-thoai-vi.webp`,
        alt: "Trang văn bản đánh máy bài diễn văn chấp nhận sự thoái vị của vua Bảo Đại",
        caption: "Diễn văn thay mặt Chính phủ chấp nhận sự thoái vị của vua Bảo Đại, do Trần Huy Liệu đọc ngày 30/8/1945.",
        credit: "Trung tâm Lưu trữ quốc gia III, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "tuyen-ngon",
      title: "Tuyên ngôn Độc lập — nước Việt Nam Dân chủ Cộng hòa ra đời",
      dateText: "2/9/1945",
      caption:
        "Tại căn nhà số 48 phố Hàng Ngang (Hà Nội), Chủ tịch Hồ Chí Minh soạn thảo bản Tuyên ngôn Độc lập. Chiều 2/9/1945, tại Quảng trường Ba Đình, trước hàng chục vạn nhân dân Thủ đô và các vùng lân cận, Người thay mặt Chính phủ lâm thời đọc bản Tuyên ngôn, tuyên bố với quốc dân và thế giới: nước Việt Nam Dân chủ Cộng hòa ra đời. Bản Tuyên ngôn khẳng định quyền độc lập, tự do của dân tộc Việt Nam và quyết tâm giữ vững quyền ấy.",
      camera: { center: [21.1, 105.85], zoom: 8 },
      units: { hq: hidden(TAN_TRAO), gpq: at([21.07, 105.855]) },
      strongpoints: status({
        ...liberatedEarly,
        thaiNguyen: "captured",
        haNoi: "captured",
        hue: "captured",
        saiGon: "captured",
        dongNaiThuong: "captured",
        haTien: "captured",
      }),
      fact: {
        title: "Mở đầu bằng hai bản tuyên ngôn nổi tiếng",
        text: "Tuyên ngôn Độc lập mở đầu bằng những câu bất hủ trong Tuyên ngôn Độc lập của Mỹ (1776) và Tuyên ngôn Nhân quyền và Dân quyền của Pháp (1791): \"Tất cả mọi người đều sinh ra có quyền bình đẳng…\" — rồi dùng chính lẽ phải ấy để tố cáo tội ác của thực dân Pháp.",
      },
      image: {
        src: `${PHOTO}/doc-tuyen-ngon.webp`,
        alt: "Ảnh đen trắng: Chủ tịch Hồ Chí Minh đứng trên lễ đài đọc Tuyên ngôn Độc lập trước đông đảo quần chúng",
        caption: "Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình, ngày 2/9/1945.",
        credit: "Mặt trận Việt Minh (© VARCHIV), Wikimedia Commons, CC BY-SA 4.0",
      },
    },
  ],
  sources: [
    { title: "SGK Lịch sử 12 (Kết nối tri thức với cuộc sống) — bài về Cách mạng tháng Tám năm 1945", note: "khung nội dung; số bài, số trang cần đối chiếu" },
    { title: "Cục Văn thư và Lưu trữ nhà nước (Trung tâm Lưu trữ quốc gia III)", note: "Quân lệnh số 1, văn bản về việc vua Bảo Đại thoái vị, ảnh ngày 2/9/1945" },
    { title: "OpenStreetMap", note: "tọa độ trung tâm các tỉnh lỵ, Tân Trào (tra ngày 30/9/2026)" },
  ],
  disclaimer:
    "Bản đồ là sơ đồ minh họa: chỉ đánh dấu một số địa phương tiêu biểu được nhắc trong bài, không phải mọi nơi khởi nghĩa. Vùng Khu giải phóng Việt Bắc vẽ phác, không theo ranh giới hành chính; vị trí tỉnh lỵ Đồng Nai Thượng là gần đúng.",
};
