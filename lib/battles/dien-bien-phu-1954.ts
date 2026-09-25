import type { BattleScenario, LatLng, StrongpointStatus, UnitState, ZoneDefinition } from "@/lib/battles/types";

// Chiến dịch Điện Biên Phủ 1954 — kịch bản mô phỏng (viết cứng, không lưu database).
// Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức, bài về kháng chiến chống thực dân Pháp 1945–1954).
// TODO: đối chiếu số bài, số trang và các con số (xem `toVerify` trong lib/lessons/dien-bien-phu.ts) với bản in.
//
// Tọa độ: tra Nominatim/Overpass (OpenStreetMap, 2026-09-24) cho đồi A1, C1, D1, E1, Him Lam, Độc Lập, hầm De Castries, sân bay
// và dòng sông Nậm Rốm. Bản Kéo và Hồng Cúm không có trên OSM → vị trí GẦN ĐÚNG theo các sơ đồ trận đánh.

const PHOTO = "/lessons/dien-bien-phu";

/** Hình ellipse gần đúng (đủ cho vùng tô minh họa). */
function ellipse(center: LatLng, radiusLat: number, radiusLng: number, points = 28): LatLng[] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (index / points) * Math.PI * 2;
    return [center[0] + radiusLat * Math.sin(angle), center[1] + radiusLng * Math.cos(angle)] as LatLng;
  });
}

const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });
const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });

// Cứ điểm (theo OSM, trừ Bản Kéo và Hồng Cúm).
export const SP = {
  himLam: [21.4047, 103.0235],
  docLap: [21.4213, 103.0066],
  banKeo: [21.4085, 102.9965],
  sanBay: [21.3944, 103.0026],
  e1: [21.3954, 103.0148],
  d1: [21.3928, 103.0194],
  c1: [21.3872, 103.0185],
  a1: [21.3832, 103.016],
  hamChiHuy: [21.385, 103.0107],
  hongCum: [21.3355, 103.0068],
} satisfies Record<string, LatLng>;

export const MUONG_PHANG: LatLng = [21.4487, 103.135];
/** Hướng đường kéo pháo từ phía Tuần Giáo vào (điểm xuất phát minh họa). */
export const TUAN_GIAO_ROAD: LatLng = [21.475, 103.11];

export const VALLEY: { center: LatLng; zoom: number } = { center: [21.382, 103.012], zoom: 12.5 };

const zones: ZoneDefinition[] = [
  { id: "pk-bac", kind: "sector", label: "Phân khu Bắc", path: ellipse([21.4155, 103.0015], 0.0105, 0.0125) },
  { id: "pk-trung-tam", kind: "sector", label: "Phân khu Trung tâm", path: ellipse([21.389, 103.011], 0.0135, 0.0145) },
  { id: "pk-nam", kind: "sector", label: "Phân khu Nam", path: ellipse(SP.hongCum, 0.007, 0.0085) },
  { id: "vay-ngoai", kind: "siege", path: ellipse([21.388, 103.012], 0.052, 0.045) },
  { id: "vay-giua", kind: "siege", path: ellipse([21.389, 103.011], 0.019, 0.019) },
  { id: "vay-trong", kind: "siege", path: ellipse([21.386, 103.0105], 0.0085, 0.0085) },
];

type SpId = keyof typeof SP;
function status(overrides: Partial<Record<SpId, StrongpointStatus>>): Record<string, StrongpointStatus> {
  const all = Object.fromEntries(Object.keys(SP).map((id) => [id, "held" as StrongpointStatus]));
  return { ...all, ...overrides };
}

export const dienBienPhu1954: BattleScenario = {
  slug: "dien-bien-phu-1954",
  title: "Chiến dịch Điện Biên Phủ",
  dateText: "13/3 – 7/5/1954",
  summary:
    "Sau 56 ngày đêm, quân đội ta tiêu diệt toàn bộ tập đoàn cứ điểm Điện Biên Phủ — nơi Pháp và Mỹ coi là \"pháo đài bất khả xâm phạm\".",
  center: VALLEY.center,
  zoom: VALLEY.zoom,
  minZoom: 5,
  maxZoom: 15,
  riverPath: [
    [21.4171, 103.0146],
    [21.41, 103.0138],
    [21.4025, 103.012],
    [21.395, 103.0129],
    [21.3901, 103.0132],
    [21.3865, 103.012],
    [21.3821, 103.0128],
    [21.378, 103.0115],
    [21.3718, 103.0095],
    [21.3598, 103.0016],
    [21.3537, 103.0005],
    [21.349, 103.0057],
    [21.3368, 103.0053],
    [21.3296, 103.0079],
  ],
  unitDefinitions: [
    { id: "hq", kind: "vn-hq", label: "Sở chỉ huy chiến dịch ở Mường Phăng" },
    { id: "phao-1", kind: "vn-artillery", label: "Trận địa pháo của ta (sườn núi phía đông bắc)" },
    { id: "phao-2", kind: "vn-artillery", label: "Trận địa pháo của ta (sườn núi phía đông nam)" },
    { id: "bb-bac", kind: "vn-infantry", label: "Bộ binh của ta, hướng bắc" },
    { id: "bb-tay", kind: "vn-infantry", label: "Bộ binh của ta, hướng tây" },
    { id: "bb-dong", kind: "vn-infantry", label: "Bộ binh của ta, hướng đông" },
    { id: "bb-nam", kind: "vn-infantry", label: "Bộ binh của ta, hướng nam" },
  ],
  strongpointDefinitions: [
    // Chỉ hiện ở bước toàn cảnh Đông Dương.
    { id: "dbp", label: "Điện Biên Phủ", name: "Điện Biên Phủ", position: [21.387, 103.012] },
    { id: "himLam", label: "Him Lam", name: "Cụm cứ điểm Him Lam", position: SP.himLam },
    { id: "docLap", label: "Độc Lập", name: "Cứ điểm đồi Độc Lập", position: SP.docLap },
    { id: "banKeo", label: "Bản Kéo", name: "Cứ điểm Bản Kéo (vị trí gần đúng)", position: SP.banKeo },
    { id: "sanBay", label: "Sân bay", name: "Sân bay Mường Thanh", position: SP.sanBay },
    { id: "e1", label: "E1", name: "Đồi E1", position: SP.e1 },
    { id: "d1", label: "D1", name: "Đồi D1", position: SP.d1 },
    { id: "c1", label: "C1", name: "Đồi C1", position: SP.c1 },
    { id: "a1", label: "A1", name: "Đồi A1", position: SP.a1 },
    { id: "hamChiHuy", label: "Hầm De Castries", name: "Sở chỉ huy tập đoàn cứ điểm (hầm De Castries)", position: SP.hamChiHuy },
    { id: "hongCum", label: "Hồng Cúm", name: "Phân khu Nam — Hồng Cúm (vị trí gần đúng)", position: SP.hongCum },
  ],
  arrowDefinitions: [
    { id: "keo-phao-1", kind: "supply", path: [TUAN_GIAO_ROAD, [21.452, 103.075], [21.43, 103.055], [21.412, 103.046]] },
    { id: "keo-phao-2", kind: "supply", path: [[21.452, 103.075], [21.415, 103.07], [21.39, 103.06], [21.372, 103.047]] },
    { id: "d1-him-lam", kind: "attack", path: [[21.425, 103.05], [21.414, 103.038], [21.4065, 103.027]] },
    { id: "d1-doc-lap", kind: "attack", path: [[21.445, 103.03], [21.432, 103.017], [21.4235, 103.009]] },
    { id: "d1-ban-keo", kind: "attack", path: [[21.425, 102.975], [21.415, 102.986], [21.4095, 102.994]] },
    { id: "d2-e1", kind: "attack", path: [[21.403, 103.034], [21.3985, 103.022], [21.3962, 103.0168]] },
    { id: "d2-d1", kind: "attack", path: [[21.398, 103.04], [21.3945, 103.028], [21.3932, 103.0212]] },
    { id: "d2-c1", kind: "attack", path: [[21.388, 103.042], [21.3875, 103.03], [21.3874, 103.0205]] },
    { id: "d2-a1", kind: "attack", path: [[21.375, 103.038], [21.379, 103.027], [21.3828, 103.0182]] },
    { id: "d3-dong", kind: "attack", path: [[21.3832, 103.0175], [21.3845, 103.0145], [21.385, 103.0122]] },
    { id: "d3-tay", kind: "attack", path: [[21.39, 102.99], [21.387, 103.0], [21.3852, 103.0092]] },
    { id: "d3-nam", kind: "attack", path: [[21.352, 103.03], [21.343, 103.018], [21.3368, 103.0092]] },
  ],
  zoneDefinitions: zones,
  legend: [
    { className: "battle-sp battle-sp--held", label: "Cứ điểm của Pháp" },
    { className: "battle-sp battle-sp--attacked", label: "Cứ điểm đang bị ta tiến công" },
    { className: "battle-sp battle-sp--captured", label: "Cứ điểm ta đã tiêu diệt" },
    { className: "battle-unit battle-unit--vn-infantry", label: "Bộ binh của ta" },
    { className: "battle-unit battle-unit--vn-artillery", label: "Trận địa pháo của ta" },
    { className: "battle-unit battle-unit--vn-hq", label: "Sở chỉ huy chiến dịch" },
    { className: "battle-legend-arrow", label: "Hướng tiến công" },
    { className: "battle-legend-siege", label: "Vòng vây, hào giao thông" },
  ],
  steps: [
    {
      id: "boi-canh",
      title: "Bối cảnh: kế hoạch Nava",
      dateText: "Thu – đông 1953",
      caption:
        "Năm 1953, Pháp cử tướng Nava sang Đông Dương với kế hoạch giành một thắng lợi quân sự quyết định trong khoảng 18 tháng để \"kết thúc chiến tranh trong danh dự\", có Mỹ viện trợ. Để phá kế hoạch này, trong Đông – Xuân 1953–1954 ta mở nhiều cuộc tiến công ở Lai Châu, Trung Lào, Hạ Lào, Tây Nguyên và Thượng Lào, buộc địch phải phân tán lực lượng. Điện Biên Phủ ở vị trí chiến lược quan trọng giữa Tây Bắc Việt Nam và Thượng Lào, nên Nava quyết định xây dựng nơi đây thành một tập đoàn cứ điểm mạnh.",
      camera: { center: [18.2, 105.6], zoom: 5.5 },
      units: {
        hq: hidden(MUONG_PHANG),
        "phao-1": hidden(TUAN_GIAO_ROAD),
        "phao-2": hidden(TUAN_GIAO_ROAD),
        "bb-bac": hidden([21.44, 103.04]),
        "bb-tay": hidden([21.42, 102.97]),
        "bb-dong": hidden([21.39, 103.05]),
        "bb-nam": hidden([21.35, 103.04]),
      },
      strongpoints: { dbp: "held" },
      fact: {
        title: "Vì sao chọn Điện Biên Phủ?",
        text: "Lòng chảo Mường Thanh dài khoảng 18 km, rộng 6–8 km, có sân bay và nằm trên đường nối Tây Bắc với Thượng Lào. Chiếm giữ nơi này, Pháp muốn che chở Thượng Lào và làm \"con nhím\" thu hút, tiêu hao chủ lực của ta.",
      },
    },
    {
      id: "tap-doan-cu-diem",
      title: "Pháp xây dựng tập đoàn cứ điểm",
      dateText: "20/11/1953 – 3/1954",
      caption:
        "Ngày 20/11/1953, quân Pháp nhảy dù chiếm Điện Biên Phủ rồi liên tục tăng quân. Đến đầu năm 1954, nơi đây thành tập đoàn cứ điểm mạnh nhất Đông Dương: 49 cứ điểm chia thành ba phân khu — phân khu Bắc (Độc Lập, Bản Kéo), phân khu Trung tâm ở Mường Thanh (có sở chỉ huy, sân bay, trận địa pháo) và phân khu Nam ở Hồng Cúm. Lực lượng lúc cao nhất khoảng 16.200 quân. Pháp và Mỹ gọi đây là \"pháo đài bất khả xâm phạm\".",
      camera: VALLEY,
      units: {
        hq: hidden(MUONG_PHANG),
        "phao-1": hidden(TUAN_GIAO_ROAD),
        "phao-2": hidden(TUAN_GIAO_ROAD),
        "bb-bac": hidden([21.44, 103.04]),
        "bb-tay": hidden([21.42, 102.97]),
        "bb-dong": hidden([21.39, 103.05]),
        "bb-nam": hidden([21.35, 103.04]),
      },
      strongpoints: status({}),
      zones: ["pk-bac", "pk-trung-tam", "pk-nam"],
      fact: {
        title: "Tên các cứ điểm",
        text: "Người Pháp đặt tên các cứ điểm bằng tên phụ nữ: Him Lam là Béatrice, Độc Lập là Gabrielle, Bản Kéo là Anne-Marie, đồi A1 là Éliane 2, còn Hồng Cúm là Isabelle.",
      },
    },
    {
      id: "chuan-bi",
      title: "Ta chuẩn bị: kéo pháo, mở đường, vây chặt",
      dateText: "6/12/1953 – 3/1954",
      caption:
        "Ngày 6/12/1953, Bộ Chính trị quyết định mở chiến dịch Điện Biên Phủ; Đại tướng Võ Nguyên Giáp làm Chỉ huy trưởng. Ban đầu ta định \"đánh nhanh, giải quyết nhanh\", nhưng ngày 26/1/1954 chuyển sang phương châm \"đánh chắc, tiến chắc\" để bảo đảm chắc thắng. Bộ đội kéo pháo bằng tay qua núi cao, vực sâu vào trận địa trên các sườn núi bao quanh lòng chảo. Hàng chục vạn dân công cùng xe đạp thồ, ngựa thồ, thuyền bè đưa lương thực, đạn dược ra mặt trận.",
      camera: { center: [21.41, 103.06], zoom: 11.5 },
      units: {
        hq: at(MUONG_PHANG),
        "phao-1": at([21.412, 103.046]),
        "phao-2": at([21.372, 103.047]),
        "bb-bac": at([21.44, 103.04]),
        "bb-tay": at([21.42, 102.97]),
        "bb-dong": at([21.39, 103.05]),
        "bb-nam": at([21.35, 103.04]),
      },
      strongpoints: status({}),
      arrows: ["keo-phao-1", "keo-phao-2"],
      zones: ["pk-bac", "pk-trung-tam", "pk-nam", "vay-ngoai"],
      fact: {
        title: "Tô Vĩnh Diện lấy thân mình chèn pháo",
        text: "Khi dây tời bị đứt, khẩu pháo lao xuống dốc, anh Tô Vĩnh Diện đã lao vào lấy thân mình chèn bánh xe để cứu pháo và hy sinh. Tấm gương của anh trở thành biểu tượng của tinh thần \"kéo pháo\" ở Điện Biên Phủ.",
      },
      image: {
        src: `${PHOTO}/phao-binh.webp`,
        alt: "Bộ đội dùng dây kéo pháo qua đường rừng núi",
        caption: "Bộ đội kéo pháo vào trận địa Điện Biên Phủ, 1954.",
        credit: "Ảnh tư liệu, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "dot-1",
      title: "Đợt 1: tiêu diệt Him Lam và phân khu Bắc",
      dateText: "13/3 – 17/3/1954",
      caption:
        "Chiều 13/3/1954, ta nổ súng tiến công cụm cứ điểm Him Lam, mở màn chiến dịch; đến đêm, Him Lam bị tiêu diệt. Tiếp đó ta đánh chiếm đồi Độc Lập, còn quân địch ở Bản Kéo phải ra hàng. Toàn bộ phân khu Bắc bị xóa sổ, cánh cửa phía bắc vào trung tâm Mường Thanh được mở ra.",
      camera: { center: [21.405, 103.012], zoom: 13 },
      units: {
        hq: at(MUONG_PHANG),
        "phao-1": at([21.412, 103.046]),
        "phao-2": at([21.372, 103.047]),
        "bb-bac": at([21.412, 103.03]),
        "bb-tay": at([21.414, 102.988]),
        "bb-dong": at([21.39, 103.04]),
        "bb-nam": at([21.35, 103.035]),
      },
      strongpoints: status({ himLam: "captured", docLap: "captured", banKeo: "captured" }),
      arrows: ["d1-him-lam", "d1-doc-lap", "d1-ban-keo"],
      zones: ["pk-trung-tam", "pk-nam", "vay-ngoai"],
      fact: {
        title: "Phan Đình Giót lấp lỗ châu mai",
        text: "Trong trận Him Lam, anh Phan Đình Giót bị thương nặng nhưng vẫn lao lên lấy thân mình lấp lỗ châu mai của lô cốt địch, mở đường cho đồng đội xung phong.",
      },
    },
    {
      id: "dot-2",
      title: "Đợt 2: đánh chiếm các điểm cao phía đông",
      dateText: "30/3 – 26/4/1954",
      caption:
        "Ta đồng loạt tiến công các cứ điểm trên dãy đồi phía đông phân khu Trung tâm như E1, D1, C1, A1. Hầu hết các điểm cao bị ta chiếm, riêng đồi A1 giằng co quyết liệt từng tấc đất. Hệ thống hào giao thông của ta đào sát vào trung tâm, siết chặt vòng vây và khống chế sân bay, khiến việc tiếp tế bằng đường hàng không của địch ngày càng khó khăn.",
      camera: { center: [21.389, 103.016], zoom: 14 },
      units: {
        hq: at(MUONG_PHANG),
        "phao-1": at([21.412, 103.046]),
        "phao-2": at([21.372, 103.047]),
        "bb-bac": at([21.4, 103.024]),
        "bb-tay": at([21.4, 102.992]),
        "bb-dong": at([21.3855, 103.0235]),
        "bb-nam": at([21.35, 103.03]),
      },
      strongpoints: status({
        himLam: "captured",
        docLap: "captured",
        banKeo: "captured",
        e1: "captured",
        d1: "captured",
        c1: "captured",
        a1: "attacked",
        sanBay: "attacked",
      }),
      arrows: ["d2-e1", "d2-d1", "d2-c1", "d2-a1"],
      zones: ["pk-trung-tam", "pk-nam", "vay-giua"],
      fact: {
        title: "Hào giao thông dài hàng trăm km",
        text: "Bộ đội ta đào hệ thống hào trục và hào nhánh chằng chịt quanh lòng chảo, tiến sát từng cứ điểm. Nhờ hào, ta vừa tránh được pháo và máy bay địch, vừa thắt dần vòng vây.",
      },
      image: {
        src: `${PHOTO}/chien-si.webp`,
        alt: "Các chiến sĩ đội mũ nan ngồi trong chiến hào",
        caption: "Chiến sĩ ta trong chiến hào ở mặt trận Điện Biên Phủ, 1954.",
        credit: "Ảnh tư liệu, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "dot-3",
      title: "Đợt 3: tổng công kích, bắt sống De Castries",
      dateText: "1/5 – 7/5/1954",
      caption:
        "Ta tiến công đồng loạt phân khu Trung tâm và phân khu Nam. Đêm 6/5, khối bộc phá gần 1 tấn đặt trong đường hầm đào vào lòng đồi A1 phát nổ; ta làm chủ đồi A1. Chiều 7/5, quân ta từ nhiều hướng tiến vào sở chỉ huy; tướng De Castries cùng toàn bộ Bộ tham mưu bị bắt sống. Lá cờ \"Quyết chiến, Quyết thắng\" tung bay trên nóc hầm. Đêm 7/5, quân địch ở phân khu Nam cũng bị tiêu diệt.",
      camera: { center: [21.3605, 103.012], zoom: 13 },
      units: {
        hq: at(MUONG_PHANG),
        "phao-1": at([21.412, 103.046]),
        "phao-2": at([21.372, 103.047]),
        "bb-bac": at([21.391, 103.0125]),
        "bb-tay": at([21.388, 103.001]),
        "bb-dong": at([21.3855, 103.0135]),
        "bb-nam": at([21.341, 103.015]),
      },
      strongpoints: status({
        himLam: "captured",
        docLap: "captured",
        banKeo: "captured",
        e1: "captured",
        d1: "captured",
        c1: "captured",
        a1: "captured",
        sanBay: "captured",
        hamChiHuy: "captured",
        hongCum: "captured",
      }),
      arrows: ["d3-dong", "d3-tay", "d3-nam"],
      zones: ["vay-trong"],
      fact: {
        title: "17 giờ 30 ngày 7/5/1954",
        text: "Đó là thời điểm tướng De Castries bị bắt sống trong hầm chỉ huy. Hầm ngày nay vẫn được giữ gìn làm di tích, nằm ở trung tâm thành phố Điện Biên Phủ.",
      },
      image: {
        src: `${PHOTO}/cam-co-ham-de-castries.webp`,
        alt: "Chiến sĩ cắm lá cờ Quyết chiến Quyết thắng trên nóc hầm chỉ huy của Pháp",
        caption: "Lá cờ \"Quyết chiến, Quyết thắng\" trên nóc hầm De Castries chiều 7/5/1954.",
        credit: "Quân đội nhân dân Việt Nam, Wikimedia Commons, phạm vi công cộng",
      },
    },
    {
      id: "ket-qua",
      title: "Toàn thắng sau 56 ngày đêm",
      dateText: "7/5/1954",
      caption:
        "Sau 56 ngày đêm chiến đấu, ta tiêu diệt toàn bộ tập đoàn cứ điểm Điện Biên Phủ, loại khỏi vòng chiến đấu 16.200 quân địch và bắn rơi, phá hủy 62 máy bay. Chiến thắng đập tan hoàn toàn kế hoạch Nava, giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp và tạo điều kiện thuận lợi cho cuộc đấu tranh ngoại giao tại Hội nghị Giơnevơ.",
      camera: VALLEY,
      units: {
        hq: at(MUONG_PHANG),
        "phao-1": at([21.412, 103.046]),
        "phao-2": at([21.372, 103.047]),
        "bb-bac": at([21.391, 103.0125]),
        "bb-tay": at([21.388, 103.001]),
        "bb-dong": at([21.3855, 103.0135]),
        "bb-nam": at([21.341, 103.015]),
      },
      strongpoints: status({
        himLam: "captured",
        docLap: "captured",
        banKeo: "captured",
        e1: "captured",
        d1: "captured",
        c1: "captured",
        a1: "captured",
        sanBay: "captured",
        hamChiHuy: "captured",
        hongCum: "captured",
      }),
      image: {
        src: `${PHOTO}/tu-binh-phap.webp`,
        alt: "Hàng dài tù binh Pháp đi dưới sự áp giải của bộ đội ta",
        caption: "Tù binh Pháp được áp giải sau khi tập đoàn cứ điểm thất thủ, 1954.",
        credit: "AFP, Wikimedia Commons, phạm vi công cộng",
      },
    },
  ],
  sources: [
    { title: "SGK Lịch sử 12 (Kết nối tri thức với cuộc sống) — bài về kháng chiến chống thực dân Pháp 1945–1954", note: "khung nội dung; số trang cần đối chiếu" },
    { title: "Bảo tàng Chiến thắng lịch sử Điện Biên Phủ", note: "tên và vị trí các cứ điểm" },
    { title: "OpenStreetMap", note: "tọa độ các di tích và dòng sông Nậm Rốm (tra ngày 24/9/2026)" },
  ],
  disclaimer:
    "Bản đồ là mô phỏng minh họa: số mũi tên, đơn vị và đường hào được giản lược, không theo tỉ lệ. Vị trí Bản Kéo và Hồng Cúm là gần đúng; các cứ điểm khác theo vị trí di tích trên OpenStreetMap.",
};
