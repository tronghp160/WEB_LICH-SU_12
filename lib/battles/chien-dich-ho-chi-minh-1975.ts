import type { BattleScenario, LatLng, StrongpointStatus, UnitState } from "@/lib/battles/types";

// Chiến dịch Hồ Chí Minh (26 – 30/4/1975) — bản đồ "5 cánh quân tiến vào Sài Gòn" (viết cứng, không lưu database).
// Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức), Bài 8; không chép nguyên văn. Các chi tiết cần đối chiếu nằm ở
// `toVerify` trong lib/lessons/chien-dich-ho-chi-minh.ts.
//
// Dùng lại bộ máy bản đồ diễn biến: mỗi "cứ điểm" là một mục tiêu then chốt của đối phương — xanh = còn trong tay đối phương,
// viền đỏ nhấp nháy = đang bị tiến công, đỏ sao vàng = quân ta đã làm chủ. Vị trí các cánh quân và mũi tên là SƠ ĐỒ MINH HỌA
// hướng tiến công (Tây Bắc, Bắc, Đông, Đông Nam, Tây Nam), không phải đường hành quân thật.

const PHOTO = "/lessons/chien-dich-ho-chi-minh";

const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });
const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });

/** Mục tiêu then chốt — tọa độ gần đúng theo OpenStreetMap. */
export const TARGETS = {
  xuanLoc: [10.935, 107.243],
  bienHoa: [10.957, 106.843],
  dongDu: [11.0, 106.49],
  tanSonNhat: [10.8188, 106.6519],
  boTongThamMuu: [10.7975, 106.6625],
  dinhDocLap: [10.777, 106.6953],
} satisfies Record<string, LatLng>;

type TargetId = keyof typeof TARGETS;

/** Vị trí sơ đồ của 5 cánh quân ở các thời điểm: bao vây (25/4), áp sát (29/4), vào trung tâm (30/4). */
const WINGS = {
  tayBac: { label: "Cánh quân hướng Tây Bắc (Quân đoàn 3)", start: [11.03, 106.42], near: [10.86, 106.6], end: [10.8, 106.665] },
  bac: { label: "Cánh quân hướng Bắc (Quân đoàn 1)", start: [11.1, 106.66], near: [10.9, 106.68], end: [10.792, 106.69] },
  dong: { label: "Cánh quân hướng Đông (Quân đoàn 4)", start: [10.98, 106.98], near: [10.9, 106.8], end: [10.785, 106.705] },
  dongNam: { label: "Cánh quân hướng Đông Nam (Quân đoàn 2)", start: [10.76, 106.98], near: [10.79, 106.78], end: [10.777, 106.7] },
  tayNam: { label: "Cánh quân hướng Tây Nam (Đoàn 232)", start: [10.62, 106.5], near: [10.71, 106.6], end: [10.765, 106.685] },
} satisfies Record<string, { label: string; start: LatLng; near: LatLng; end: LatLng }>;

type WingId = keyof typeof WINGS;

function wings(stage: "start" | "near" | "end" | "hidden"): Record<WingId, UnitState> {
  return Object.fromEntries(
    (Object.keys(WINGS) as WingId[]).map((id) => [id, stage === "hidden" ? hidden(WINGS[id].start) : at(WINGS[id][stage])]),
  ) as Record<WingId, UnitState>;
}

function targets(overrides: Partial<Record<TargetId, StrongpointStatus>>): Record<string, StrongpointStatus> {
  return { ...Object.fromEntries(Object.keys(TARGETS).map((id) => [id, "held" as StrongpointStatus])), ...overrides };
}

const SOUTH = { center: [11.6, 107.3] as LatLng, zoom: 6 };
const SAIGON = { center: [10.86, 106.72] as LatLng, zoom: 10 };

export const chienDichHoChiMinh1975: BattleScenario = {
  slug: "chien-dich-ho-chi-minh-1975",
  title: "Chiến dịch Hồ Chí Minh",
  dateText: "26 – 30/4/1975",
  summary: "Năm cánh quân đồng loạt tiến công vào Sài Gòn; trưa 30/4/1975 lá cờ cách mạng tung bay trên nóc Dinh Độc Lập, chính quyền Sài Gòn đầu hàng.",
  center: SAIGON.center,
  zoom: SAIGON.zoom,
  minZoom: 5,
  maxZoom: 13,
  unitDefinitions: (Object.keys(WINGS) as WingId[]).map((id) => ({ id, kind: "vn-infantry" as const, label: WINGS[id].label })),
  strongpointDefinitions: [
    { id: "xuanLoc", label: "Xuân Lộc", name: "Tuyến phòng thủ Xuân Lộc", position: TARGETS.xuanLoc },
    { id: "bienHoa", label: "Biên Hòa", name: "Biên Hòa (căn cứ quân sự, sân bay)", position: TARGETS.bienHoa, minorLabel: true },
    { id: "dongDu", label: "Đồng Dù", name: "Căn cứ Đồng Dù (Củ Chi)", position: TARGETS.dongDu, minorLabel: true },
    { id: "tanSonNhat", label: "Tân Sơn Nhất", name: "Sân bay Tân Sơn Nhất", position: TARGETS.tanSonNhat, minorLabel: true },
    { id: "boTongThamMuu", label: "Bộ Tổng tham mưu", name: "Bộ Tổng tham mưu quân đội Sài Gòn", position: TARGETS.boTongThamMuu, minorLabel: true },
    { id: "dinhDocLap", label: "Dinh Độc Lập", name: "Dinh Độc Lập — cơ quan đầu não của chính quyền Sài Gòn", position: TARGETS.dinhDocLap },
  ],
  arrowDefinitions: (Object.keys(WINGS) as WingId[]).flatMap((id) => [
    { id: `${id}-ap-sat`, kind: "attack" as const, path: [WINGS[id].start, WINGS[id].near] },
    { id: `${id}-trung-tam`, kind: "attack" as const, path: [WINGS[id].near, WINGS[id].end] },
  ]),
  zoneDefinitions: [
    {
      id: "vong-vay",
      kind: "siege",
      label: "Thế bao vây Sài Gòn (vẽ phác)",
      path: [
        [11.12, 106.4],
        [11.15, 106.75],
        [11.02, 107.02],
        [10.75, 107.02],
        [10.56, 106.78],
        [10.56, 106.45],
        [10.8, 106.32],
      ],
    },
  ],
  legend: [
    { className: "battle-sp battle-sp--held", label: "Mục tiêu còn trong tay đối phương" },
    { className: "battle-sp battle-sp--attacked", label: "Đang bị tiến công" },
    { className: "battle-sp battle-sp--captured", label: "Quân ta đã làm chủ" },
    { className: "battle-unit battle-unit--vn-infantry", label: "Cánh quân của ta (vị trí sơ đồ)" },
    { className: "battle-legend-arrow", label: "Hướng tiến công" },
    { className: "battle-legend-siege", label: "Thế bao vây Sài Gòn (vẽ phác)" },
  ],
  steps: [
    {
      id: "thoi-co",
      title: "Thời cơ chiến lược",
      dateText: "3/1975",
      caption:
        "Đầu năm 1975, Bộ Chính trị đề ra kế hoạch giải phóng miền Nam trong hai năm 1975 – 1976, nhưng nhấn mạnh: nếu thời cơ đến vào đầu hoặc cuối năm 1975 thì lập tức giải phóng miền Nam trong năm 1975. Chiến dịch Tây Nguyên mở màn bằng trận đánh Buôn Ma Thuột ngày 10/3, buộc đối phương rút chạy khỏi Tây Nguyên. Tiếp đó, chiến dịch Huế – Đà Nẵng giải phóng Huế (26/3) và Đà Nẵng (29/3). Thời cơ chiến lược đã đến: Bộ Chính trị quyết định giải phóng Sài Gòn trước mùa mưa.",
      camera: SOUTH,
      units: wings("hidden"),
      strongpoints: targets({}),
      fact: {
        title: "Ba chiến dịch lớn",
        text: "Cuộc Tổng tiến công và nổi dậy mùa Xuân 1975 gồm ba chiến dịch lớn nối tiếp nhau: Tây Nguyên, Huế – Đà Nẵng và Hồ Chí Minh — chiến dịch cuối cùng, quyết định.",
      },
    },
    {
      id: "xuan-loc",
      title: "Xuân Lộc — \"cánh cửa thép\" bị phá",
      dateText: "9 – 21/4/1975",
      caption:
        "Xuân Lộc là tuyến phòng thủ then chốt phía đông Sài Gòn, được đối phương coi là \"cánh cửa thép\" bảo vệ Sài Gòn từ phía đông. Từ ngày 9/4/1975, quân ta tiến công Xuân Lộc; sau nhiều ngày chiến đấu quyết liệt, ngày 21/4 quân đối phương phải rút chạy khỏi Xuân Lộc. Tuyến phòng thủ phía đông bị phá vỡ, Sài Gòn rung chuyển. Cùng ngày 21/4, Nguyễn Văn Thiệu tuyên bố từ chức tổng thống chính quyền Sài Gòn.",
      camera: { center: [10.95, 107.05], zoom: 9 },
      units: { ...wings("hidden"), dong: at(WINGS.dong.start) },
      strongpoints: targets({ xuanLoc: "captured" }),
      image: {
        src: `${PHOTO}/tuong-dai-xuan-loc.webp`,
        alt: "Tượng đài chiến thắng ở Xuân Lộc: tượng chiến sĩ cầm súng trên bệ cao, phía sau là cây xanh",
        caption: "Tượng đài chiến thắng Xuân Lộc (ảnh năm 2004).",
        credit: "Mztourist, CC BY-SA 3.0",
      },
    },
    {
      id: "bao-vay",
      title: "Năm cánh quân bao vây Sài Gòn",
      dateText: "14 – 25/4/1975",
      caption:
        "Ngày 14/4/1975, Bộ Chính trị đồng ý đặt tên cho chiến dịch giải phóng Sài Gòn – Gia Định là \"Chiến dịch Hồ Chí Minh\". Lực lượng của ta được tổ chức thành năm cánh quân, áp sát Sài Gòn từ năm hướng: Tây Bắc, Bắc, Đông, Đông Nam và Tây Nam, hình thành thế bao vây, chia cắt. Cùng với các lực lượng vũ trang, quần chúng nhân dân trong thành phố được chuẩn bị để nổi dậy phối hợp. Trên bản đồ, vị trí các cánh quân chỉ là sơ đồ minh họa hướng tiến công.",
      camera: SAIGON,
      units: wings("start"),
      strongpoints: targets({ xuanLoc: "captured" }),
      zones: ["vong-vay"],
      fact: {
        title: "Tên chiến dịch",
        text: "Chiến dịch được mang tên Chủ tịch Hồ Chí Minh, thể hiện quyết tâm hoàn thành tâm nguyện của Người: giải phóng miền Nam, thống nhất đất nước.",
      },
    },
    {
      id: "no-sung",
      title: "17 giờ ngày 26/4: chiến dịch bắt đầu",
      dateText: "26 – 27/4/1975",
      caption:
        "Đúng 17 giờ ngày 26/4/1975, quân ta nổ súng mở đầu Chiến dịch Hồ Chí Minh. Các cánh quân tiến công tiêu diệt các lực lượng bảo vệ vòng ngoài, đánh chiếm các căn cứ, vị trí then chốt quanh Sài Gòn như Biên Hòa và căn cứ Đồng Dù ở Củ Chi, đồng thời đánh chiếm các cầu quan trọng, mở đường cho các binh đoàn cơ giới tiến vào nội đô. Đối phương bị dồn vào thế bị động, tuyến phòng thủ vòng ngoài lần lượt bị chọc thủng.",
      camera: SAIGON,
      units: wings("start"),
      strongpoints: targets({ xuanLoc: "captured", bienHoa: "attacked", dongDu: "attacked" }),
      arrows: (Object.keys(WINGS) as WingId[]).map((id) => `${id}-ap-sat`),
      zones: ["vong-vay"],
    },
    {
      id: "tan-son-nhat",
      title: "Không quân ném bom sân bay Tân Sơn Nhất",
      dateText: "28/4/1975",
      caption:
        "Chiều 28/4/1975, Dương Văn Minh lên làm tổng thống chính quyền Sài Gòn, mong tìm cách thương lượng. Cùng chiều hôm đó, Phi đội Quyết thắng của không quân nhân dân Việt Nam dùng máy bay A-37 thu được của đối phương ném bom sân bay Tân Sơn Nhất, phá hủy nhiều máy bay, gây hoảng loạn cho đối phương. Pháo binh của ta cũng bắn phá sân bay, làm tê liệt đường di tản bằng máy bay cánh cố định.",
      camera: { center: [10.83, 106.68], zoom: 11 },
      units: wings("near"),
      strongpoints: targets({ xuanLoc: "captured", bienHoa: "captured", dongDu: "captured", tanSonNhat: "attacked" }),
      arrows: (Object.keys(WINGS) as WingId[]).map((id) => `${id}-ap-sat`),
      zones: ["vong-vay"],
      fact: {
        title: "Phi đội Quyết thắng",
        text: "Phi đội gồm các phi công của ta và phi công Nguyễn Thành Trung — người trước đó đã lái máy bay ném bom Dinh Độc Lập ngày 8/4/1975 rồi bay về vùng giải phóng.",
      },
    },
    {
      id: "tong-cong-kich",
      title: "Tổng công kích, Mỹ di tản khỏi Sài Gòn",
      dateText: "29/4/1975",
      caption:
        "Rạng sáng 29/4/1975, quân ta mở đợt tổng công kích vào trung tâm Sài Gòn từ mọi hướng; nhiều nơi quần chúng nổi dậy giành chính quyền. Không còn đường bằng máy bay cánh cố định, Mỹ phải di tản người Mỹ và một số người Việt bằng trực thăng từ Sài Gòn ra các tàu chiến ngoài khơi; trên tàu quá chật chỗ, nhiều trực thăng bị đẩy xuống biển. Các cánh quân tiến sát các mục tiêu đầu não: sân bay Tân Sơn Nhất, Bộ Tổng tham mưu, Dinh Độc Lập.",
      camera: SAIGON,
      units: wings("near"),
      strongpoints: targets({ xuanLoc: "captured", bienHoa: "captured", dongDu: "captured", tanSonNhat: "attacked", boTongThamMuu: "attacked" }),
      arrows: (Object.keys(WINGS) as WingId[]).map((id) => `${id}-trung-tam`),
      zones: ["vong-vay"],
      image: {
        src: `${PHOTO}/truc-thang-uss-okinawa.webp`,
        alt: "Thủy thủ Mỹ đẩy một chiếc trực thăng nghiêng xuống biển từ boong tàu sân bay",
        caption: "Trực thăng bị đẩy xuống biển từ tàu USS Okinawa để lấy chỗ đỗ trong cuộc di tản cuối tháng 4/1975.",
        credit: "Thủy quân lục chiến Mỹ, phạm vi công cộng",
      },
    },
    {
      id: "dinh-doc-lap",
      title: "11 giờ 30 phút ngày 30/4: Sài Gòn giải phóng",
      dateText: "30/4/1975",
      caption:
        "Sáng 30/4/1975, các cánh quân đánh chiếm các mục tiêu đầu não. Khoảng 10 giờ 45 phút, xe tăng của ta húc đổ cổng chính, tiến vào Dinh Độc Lập; Dương Văn Minh và nội các chính quyền Sài Gòn bị bắt. 11 giờ 30 phút, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập. Dương Văn Minh phải tuyên bố đầu hàng không điều kiện. Chiến dịch Hồ Chí Minh toàn thắng. Đến ngày 2/5/1975, Châu Đốc — tỉnh cuối cùng ở miền Nam — được giải phóng.",
      camera: { center: [10.79, 106.69], zoom: 12 },
      units: wings("end"),
      strongpoints: targets({ xuanLoc: "captured", bienHoa: "captured", dongDu: "captured", tanSonNhat: "captured", boTongThamMuu: "captured", dinhDocLap: "captured" }),
      arrows: (Object.keys(WINGS) as WingId[]).map((id) => `${id}-trung-tam`),
      image: {
        src: `${PHOTO}/xe-tang-843-dinh-doc-lap.webp`,
        alt: "Xe tăng T-54 sơn số 843 trưng bày trên bãi cỏ trong khuôn viên Dinh Độc Lập",
        caption: "Xe tăng mang số hiệu 843 trong khuôn viên Dinh Độc Lập ngày nay (xe cùng loại; hai xe nguyên bản 390 và 843 lưu giữ tại Hà Nội).",
        credit: "源義信, CC BY 4.0",
      },
    },
  ],
  sources: [
    { title: "Sách giáo khoa Lịch sử 12 (Kết nối tri thức với cuộc sống)", note: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)" },
    { title: "Bảo tàng Chiến dịch Hồ Chí Minh (TP. Hồ Chí Minh)", note: "trưng bày về năm cánh quân và diễn biến chiến dịch" },
    { title: "OpenStreetMap", note: "tọa độ gần đúng của Dinh Độc Lập, sân bay Tân Sơn Nhất và các địa danh" },
  ],
  disclaimer:
    "Bản đồ minh họa: vị trí các cánh quân và mũi tên chỉ thể hiện HƯỚNG tiến công (Tây Bắc, Bắc, Đông, Đông Nam, Tây Nam), không phải đường hành quân thật; vùng bao vây vẽ phác. Tọa độ các mục tiêu là gần đúng.",
};
