import type { BattleScenario, LatLng, StrongpointStatus, UnitState } from "@/lib/battles/types";

// Tổng tiến công và nổi dậy Tết Mậu Thân 1968 — bản đồ "đồng loạt tiến công các đô thị" (viết cứng, không lưu database).
// Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức), Bài 8; không chép nguyên văn. Các chi tiết cần đối chiếu nằm ở
// `toVerify` trong lib/lessons/tet-mau-than.ts.
//
// Mỗi "cứ điểm" là một đô thị hoặc mục tiêu đầu não: xanh = đối phương kiểm soát, viền đỏ nhấp nháy = đang bị tiến công.
// Trong Tết Mậu Thân quân giải phóng KHÔNG giữ được lâu dài các đô thị, nên bản đồ không dùng trạng thái "đã giành được":
// sau các đợt tiến công, các đô thị trở lại màu xanh. Tọa độ gần đúng (trung tâm đô thị; các mục tiêu ở Sài Gòn theo OpenStreetMap).

const PHOTO = "/lessons/mau-than-1968";

const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });
const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });

export const CITIES = {
  quangTri: [16.75, 107.19],
  hue: [16.463, 107.59],
  daNang: [16.054, 108.202],
  buonMaThuot: [12.667, 108.038],
  nhaTrang: [12.238, 109.196],
  daLat: [11.94, 108.438],
  myTho: [10.36, 106.365],
  canTho: [10.033, 105.788],
  saiGon: [10.776, 106.701],
} satisfies Record<string, LatLng>;

/** Bốn mục tiêu đầu não ở Sài Gòn bị biệt động thành tiến công đêm giao thừa. */
export const SAIGON_TARGETS = {
  daiSuMy: [10.7828, 106.7012],
  dinhDocLap: [10.777, 106.6953],
  boTongThamMuu: [10.7975, 106.6625],
  daiPhatThanh: [10.7867, 106.7036],
} satisfies Record<string, LatLng>;

const KHE_SANH: LatLng = [16.65, 106.73];

type PointId = keyof typeof CITIES | keyof typeof SAIGON_TARGETS | "kheSanh";

function points(overrides: Partial<Record<PointId, StrongpointStatus>>): Record<string, StrongpointStatus> {
  const all = [...Object.keys(CITIES), ...Object.keys(SAIGON_TARGETS), "kheSanh"];
  return { ...Object.fromEntries(all.map((id) => [id, "held" as StrongpointStatus])), ...overrides };
}

const ALL_CITIES_ATTACKED = Object.fromEntries(Object.keys(CITIES).map((id) => [id, "attacked"])) as Record<keyof typeof CITIES, StrongpointStatus>;
const ALL_TARGETS_ATTACKED = Object.fromEntries(Object.keys(SAIGON_TARGETS).map((id) => [id, "attacked"])) as Record<keyof typeof SAIGON_TARGETS, StrongpointStatus>;

const SOUTH = { center: [13.4, 107.3] as LatLng, zoom: 6 };
const SAIGON = { center: [10.786, 106.688], zoom: 13 } as { center: LatLng; zoom: number };
const HUE = { center: [16.48, 107.45], zoom: 9 } as { center: LatLng; zoom: number };

const UNITS = {
  bietDong: { label: "Biệt động thành Sài Gòn (vị trí minh họa)", position: [10.79, 106.69] as LatLng },
  hue: { label: "Lực lượng tiến công Huế (vị trí minh họa)", position: [16.5, 107.5] as LatLng },
};

export const tetMauThan1968: BattleScenario = {
  slug: "tet-mau-than-1968",
  title: "Tổng tiến công và nổi dậy Tết Mậu Thân 1968",
  dateText: "Tết Mậu Thân, 1968",
  summary: "Đêm giao thừa Tết Mậu Thân, quân dân miền Nam đồng loạt tiến công và nổi dậy ở hầu khắp các đô thị, đánh thẳng vào các cơ quan đầu não của Mỹ và chính quyền Sài Gòn.",
  center: SOUTH.center,
  zoom: SOUTH.zoom,
  minZoom: 5,
  maxZoom: 14,
  unitDefinitions: [
    { id: "bietDong", kind: "vn-infantry", label: UNITS.bietDong.label },
    { id: "hue", kind: "vn-infantry", label: UNITS.hue.label },
  ],
  strongpointDefinitions: [
    { id: "quangTri", label: "Quảng Trị", name: "Thị xã Quảng Trị", position: CITIES.quangTri, minorLabel: true },
    { id: "hue", label: "Huế", name: "Thành phố Huế", position: CITIES.hue },
    { id: "daNang", label: "Đà Nẵng", name: "Thành phố Đà Nẵng", position: CITIES.daNang },
    { id: "buonMaThuot", label: "Buôn Ma Thuột", name: "Thị xã Buôn Ma Thuột", position: CITIES.buonMaThuot, minorLabel: true },
    { id: "nhaTrang", label: "Nha Trang", name: "Thị xã Nha Trang", position: CITIES.nhaTrang, minorLabel: true },
    { id: "daLat", label: "Đà Lạt", name: "Thành phố Đà Lạt", position: CITIES.daLat, minorLabel: true },
    { id: "myTho", label: "Mỹ Tho", name: "Thị xã Mỹ Tho", position: CITIES.myTho, minorLabel: true },
    { id: "canTho", label: "Cần Thơ", name: "Thị xã Cần Thơ", position: CITIES.canTho, minorLabel: true },
    { id: "saiGon", label: "Sài Gòn", name: "Sài Gòn – Gia Định", position: CITIES.saiGon },
    { id: "daiSuMy", label: "Tòa Đại sứ Mỹ", name: "Tòa Đại sứ Mỹ", position: SAIGON_TARGETS.daiSuMy, minorLabel: true },
    { id: "dinhDocLap", label: "Dinh Độc Lập", name: "Dinh Độc Lập", position: SAIGON_TARGETS.dinhDocLap, minorLabel: true },
    { id: "boTongThamMuu", label: "Bộ Tổng tham mưu", name: "Bộ Tổng tham mưu quân đội Sài Gòn", position: SAIGON_TARGETS.boTongThamMuu, minorLabel: true },
    { id: "daiPhatThanh", label: "Đài phát thanh", name: "Đài phát thanh Sài Gòn", position: SAIGON_TARGETS.daiPhatThanh, minorLabel: true },
    { id: "kheSanh", label: "Khe Sanh", name: "Căn cứ Khe Sanh của Mỹ", position: KHE_SANH, minorLabel: true },
  ],
  legend: [
    { className: "battle-sp battle-sp--held", label: "Đô thị, mục tiêu do đối phương kiểm soát" },
    { className: "battle-sp battle-sp--attacked", label: "Đang bị tiến công" },
    { className: "battle-unit battle-unit--vn-infantry", label: "Lực lượng của ta (vị trí minh họa)" },
  ],
  steps: [
    {
      id: "boi-canh",
      title: "Bối cảnh: chủ trương tổng tiến công",
      dateText: "Cuối 1967 – đầu 1968",
      caption:
        "Sau hai mùa khô 1965 – 1966 và 1966 – 1967, chiến lược \"Chiến tranh cục bộ\" của Mỹ không đạt mục tiêu dù số quân Mỹ ở miền Nam đã lên tới gần nửa triệu. Năm 1968 lại là năm bầu cử tổng thống ở Mỹ. Nhận định so sánh lực lượng đã thay đổi có lợi cho ta, Bộ Chính trị chủ trương mở cuộc Tổng tiến công và nổi dậy trên toàn miền Nam, lấy các đô thị làm hướng tiến công chủ yếu, nhằm tiêu diệt một bộ phận quan trọng quân Mỹ và quân đội Sài Gòn, buộc Mỹ phải đàm phán và rút quân.",
      camera: SOUTH,
      units: { bietDong: hidden(UNITS.bietDong.position), hue: hidden(UNITS.hue.position) },
      strongpoints: points({}),
    },
    {
      id: "khe-sanh",
      title: "Khe Sanh: thu hút sự chú ý của Mỹ",
      dateText: "Từ 20/1/1968",
      caption:
        "Từ ngày 20/1/1968, quân ta mở chiến dịch tiến công khu vực Đường 9 – Khe Sanh ở miền tây Quảng Trị, bao vây căn cứ Khe Sanh của Mỹ. Bộ chỉ huy Mỹ tập trung chú ý và lực lượng ra vùng giới tuyến, lo ngại Khe Sanh trở thành \"một Điện Biên Phủ thứ hai\". Trong khi đó, các lực lượng của ta bí mật áp sát các thành phố, thị xã, chuẩn bị cho đòn tiến công bất ngờ vào dịp Tết.",
      camera: { center: [16.6, 106.95], zoom: 9 },
      units: { bietDong: hidden(UNITS.bietDong.position), hue: hidden(UNITS.hue.position) },
      strongpoints: points({ kheSanh: "attacked" }),
    },
    {
      id: "giao-thua",
      title: "Đêm giao thừa: đồng loạt tiến công các đô thị",
      dateText: "Đêm 30 rạng 31/1/1968",
      caption:
        "Đêm 30 rạng sáng 31/1/1968 (đêm giao thừa và mồng Một Tết Mậu Thân), quân dân miền Nam đồng loạt tiến công và nổi dậy ở hầu khắp các thành phố, thị xã trên toàn miền Nam — theo nhiều tài liệu là 37 trong 44 thị xã, 5 trong 6 thành phố — cùng nhiều quận lỵ và căn cứ quân sự. Đòn tiến công diễn ra đúng lúc đối phương đang nghỉ Tết, gây bất ngờ lớn. Trên bản đồ chỉ đánh dấu một số đô thị tiêu biểu.",
      camera: SOUTH,
      units: { bietDong: at(UNITS.bietDong.position), hue: at(UNITS.hue.position) },
      strongpoints: points({ ...ALL_CITIES_ATTACKED, kheSanh: "attacked" }),
      fact: {
        title: "Vì sao tiến công vào dịp Tết?",
        text: "Dịp Tết cổ truyền, nhiều binh lính đối phương được nghỉ phép, sự cảnh giác giảm; tiếng pháo Tết cũng che lấp tiếng súng trong những phút đầu — yếu tố bất ngờ được đẩy lên cao nhất.",
      },
    },
    {
      id: "sai-gon",
      title: "Sài Gòn: đánh vào bốn mục tiêu đầu não",
      dateText: "31/1/1968",
      caption:
        "Ở Sài Gòn, các đội biệt động thành cùng lực lượng vũ trang đồng loạt tiến công các mục tiêu đầu não: Tòa Đại sứ Mỹ, Dinh Độc Lập, Bộ Tổng tham mưu quân đội Sài Gòn và Đài phát thanh Sài Gòn, đồng thời đánh vào sân bay Tân Sơn Nhất và nhiều vị trí khác. Trận đánh vào Tòa Đại sứ Mỹ — biểu tượng của sự có mặt của Mỹ ở miền Nam — gây chấn động dư luận nước Mỹ và thế giới.",
      camera: SAIGON,
      units: { bietDong: at(UNITS.bietDong.position), hue: at(UNITS.hue.position) },
      strongpoints: points({ ...ALL_CITIES_ATTACKED, ...ALL_TARGETS_ATTACKED, kheSanh: "attacked" }),
      image: {
        src: `${PHOTO}/sai-gon-tet-1968.webp`,
        alt: "Ảnh đen trắng: một đường phố Sài Gòn vắng người, xe cộ đỗ dọc hai bên, ngày 1/2/1968",
        caption: "Một đường phố Sài Gòn vắng lặng trong những ngày giao tranh Tết Mậu Thân (1/2/1968).",
        credit: "SP5 James Newlin, Quân đội Mỹ, phạm vi công cộng",
      },
    },
    {
      id: "hue",
      title: "Huế: làm chủ thành phố gần một tháng",
      dateText: "31/1 – 25/2/1968",
      caption:
        "Ở Huế, quân giải phóng tiến công và làm chủ phần lớn thành phố, kể cả khu Kinh thành, chính quyền cách mạng được thành lập ở nhiều nơi. Mỹ và quân đội Sài Gòn phải huy động lực lượng lớn, dùng cả không quân, pháo binh và xe tăng phản kích; giao tranh diễn ra ác liệt từng đường phố, nhiều công trình bị tàn phá. Quân giải phóng chiến đấu kiên cường gần một tháng, đến cuối tháng 2/1968 mới rút khỏi thành phố.",
      camera: HUE,
      units: { bietDong: at(UNITS.bietDong.position), hue: at(UNITS.hue.position) },
      strongpoints: points({ ...ALL_CITIES_ATTACKED, ...ALL_TARGETS_ATTACKED, kheSanh: "attacked" }),
      image: {
        src: `${PHOTO}/cau-song-huong-1968.webp`,
        alt: "Ảnh đen trắng: một nhịp cầu bị gãy sập xuống mặt sông Hương",
        caption: "Một cây cầu qua sông Hương bị đánh sập trong trận chiến ở Huế, tháng 2/1968.",
        credit: "Thủy quân lục chiến Mỹ, phạm vi công cộng",
      },
    },
    {
      id: "dot-2-3",
      title: "Đợt 2 và đợt 3: gặp nhiều khó khăn",
      dateText: "5 – 6/1968 và 8 – 9/1968",
      caption:
        "Sau đợt 1, ta tiếp tục mở đợt 2 (tháng 5 – 6/1968) và đợt 3 (tháng 8 – 9/1968). Tuy nhiên, đối phương đã kịp phản kích và tăng cường phòng thủ các đô thị; lực lượng của ta bị tổn thất lớn, nhiều vùng nông thôn bị đối phương chiếm lại, gặp nhiều khó khăn trong những năm tiếp theo. Đây là bài học về việc đánh giá so sánh lực lượng và chỉ đạo chuyển hướng tiến công kịp thời.",
      camera: SOUTH,
      units: { bietDong: hidden(UNITS.bietDong.position), hue: hidden(UNITS.hue.position) },
      strongpoints: points({ saiGon: "attacked" }),
    },
    {
      id: "ket-qua",
      title: "Mỹ buộc phải xuống thang và đàm phán",
      dateText: "31/3 – 1/11/1968",
      caption:
        "Cuộc Tổng tiến công và nổi dậy làm lung lay ý chí xâm lược của Mỹ. Ngày 31/3/1968, Tổng thống Mỹ L. Giôn-xơn tuyên bố hạn chế ném bom miền Bắc, sẵn sàng đàm phán và không ra tranh cử nhiệm kì nữa. Ngày 13/5/1968, Hội nghị Pa-ri giữa đại diện Việt Nam Dân chủ Cộng hòa và Mỹ khai mạc. Ngày 1/11/1968, Mỹ phải tuyên bố ngừng hẳn ném bom miền Bắc. Chiến lược \"Chiến tranh cục bộ\" bị phá sản, Mỹ chuyển sang \"phi Mỹ hóa\" chiến tranh.",
      camera: SOUTH,
      units: { bietDong: hidden(UNITS.bietDong.position), hue: hidden(UNITS.hue.position) },
      strongpoints: points({}),
      fact: {
        title: "Bước ngoặt của cuộc kháng chiến",
        text: "Tết Mậu Thân mở ra bước ngoặt mới: buộc Mỹ từ chỗ leo thang phải \"xuống thang\" chiến tranh, chấp nhận ngồi vào bàn đàm phán — tiền đề cho Hiệp định Pa-ri năm 1973.",
      },
    },
  ],
  sources: [
    { title: "Sách giáo khoa Lịch sử 12 (Kết nối tri thức với cuộc sống)", note: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)" },
    { title: "OpenStreetMap", note: "tọa độ gần đúng của các đô thị và mục tiêu ở Sài Gòn" },
  ],
  disclaimer:
    "Bản đồ minh họa: chỉ đánh dấu một số đô thị tiêu biểu trong hàng chục đô thị bị tiến công; vị trí lực lượng của ta là minh họa. Màu \"đang bị tiến công\" không có nghĩa ta đã làm chủ đô thị đó.",
};
