import type { BattleScenario, LatLng, UnitState } from "@/lib/battles/types";

// Trận Bạch Đằng năm 938 — kịch bản mô phỏng (viết cứng, không lưu database).
// Nội dung diễn biến theo sử sách (Đại Việt sử ký toàn thư, kỷ nhà Ngô) và sách giáo khoa; TODO: đối chiếu lại với bản in trước khi dùng làm tài liệu chính thức.
// Vị trí và đường đi trên bản đồ chỉ mang tính MINH HỌA: địa điểm chính xác của trận địa vẫn còn được giới sử học nghiên cứu.

const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });
const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });
const sunk = (position: LatLng): UnitState => ({ position, visible: true, status: "sunk" });

// Vị trí các đơn vị (vĩ độ, kinh độ) dọc lòng sông Bạch Đằng, đã đối chiếu với nền bản đồ OpenStreetMap: sông chạy gần bắc–nam
// ở phía tây Quảng Yên, đổ ra biển về phía đông (giữa bán đảo Đình Vũ và Cát Hải). Địch từ biển vào cửa sông rồi ngược lên phía bắc.
const SEA_APPROACH = { a: [20.8205, 106.835], b: [20.8255, 106.848], c: [20.8215, 106.851] } satisfies Record<string, LatLng>;
const ESTUARY = { a: [20.8247, 106.7845], b: [20.8205, 106.805], c: [20.8287, 106.7705] } satisfies Record<string, LatLng>;
const CHASE = { a: [20.9195, 106.7665], b: [20.9105, 106.764], c: [20.9015, 106.7605] } satisfies Record<string, LatLng>;
const STUCK = { a: [20.9165, 106.766], b: [20.9075, 106.7625], c: [20.9255, 106.7672] } satisfies Record<string, LatLng>;

const UPSTREAM_HIDEOUT: LatLng = [20.968, 106.7676];
const EAST_BANK: LatLng = [20.9195, 106.783];
const WEST_BANK: LatLng = [20.906, 106.7535];

export const bachDang938: BattleScenario = {
  slug: "bach-dang-938",
  title: "Trận Bạch Đằng năm 938",
  dateText: "Cuối năm 938",
  summary:
    "Ngô Quyền dùng thủy triều và bãi cọc ngầm cắm dưới lòng sông Bạch Đằng để đánh tan thủy quân Nam Hán, kết thúc hơn một nghìn năm Bắc thuộc.",
  center: [20.87, 106.785],
  zoom: 11.5,
  riverPath: [
    [21.0013, 106.7687],
    [20.9774, 106.7676],
    [20.955, 106.7683],
    [20.9325, 106.767],
    [20.9114, 106.764],
    [20.8909, 106.7605],
    [20.8729, 106.7585],
    [20.8469, 106.7617],
    [20.8287, 106.769],
    [20.8247, 106.7845],
    [20.8202, 106.8088],
    [20.8202, 106.8331],
    [20.8247, 106.867],
  ],
  stakeLine: [
    [20.9125, 106.7605],
    [20.9125, 106.7745],
  ],
  unitDefinitions: [
    { id: "han-1", kind: "invader-ship", label: "Thuyền chiến Nam Hán" },
    { id: "han-2", kind: "invader-ship", label: "Thuyền chiến Nam Hán" },
    { id: "han-3", kind: "invader-ship", label: "Thuyền chiến Nam Hán" },
    { id: "viet-boat-1", kind: "defender-boat", label: "Thuyền nhẹ của quân Ngô Quyền" },
    { id: "viet-boat-2", kind: "defender-boat", label: "Thuyền nhẹ của quân Ngô Quyền" },
    { id: "viet-east", kind: "defender-land", label: "Quân mai phục bờ đông" },
    { id: "viet-west", kind: "defender-land", label: "Quân mai phục bờ tây" },
  ],
  steps: [
    {
      id: "boi-canh",
      title: "Bối cảnh: Nam Hán đem quân sang",
      caption:
        "Năm 937, Kiều Công Tiễn giết Dương Đình Nghệ để cướp quyền, rồi sai người sang cầu cứu nhà Nam Hán. Ngô Quyền, thuộc tướng của Dương Đình Nghệ, đem quân từ Ái Châu ra Bắc giết Kiều Công Tiễn. Vua Nam Hán vẫn sai con là Hoằng Tháo đem thủy quân sang xâm lược, còn tự mình dẫn quân đóng ở Hải Môn để tiếp ứng.",
      tideLevel: 0.5,
      tideLabel: "Chưa tính đến thủy triều",
      stakes: "none",
      units: {
        "han-1": at(SEA_APPROACH.a),
        "han-2": at(SEA_APPROACH.b),
        "han-3": at(SEA_APPROACH.c),
        "viet-boat-1": hidden(UPSTREAM_HIDEOUT),
        "viet-boat-2": hidden(UPSTREAM_HIDEOUT),
        "viet-east": hidden(EAST_BANK),
        "viet-west": hidden(WEST_BANK),
      },
    },
    {
      id: "chuan-bi",
      title: "Chuẩn bị: cắm cọc ngầm, bố trí mai phục",
      caption:
        "Ngô Quyền hiểu rằng thuyền giặc lớn và nặng, còn sông Bạch Đằng có thủy triều lên xuống rất mạnh. Ông cho quân đẵn gỗ, vót nhọn đầu, bịt sắt rồi cắm thành hàng cọc ngầm ở lòng sông. Quân chủ lực mai phục hai bên bờ, thuyền nhẹ ẩn phía thượng nguồn.",
      tideLevel: 0.5,
      tideLabel: "Nước ròng bình thường — cọc được cắm xuống",
      stakes: "exposed",
      units: {
        "han-1": at(SEA_APPROACH.a),
        "han-2": at(SEA_APPROACH.b),
        "han-3": at(SEA_APPROACH.c),
        "viet-boat-1": at(UPSTREAM_HIDEOUT),
        "viet-boat-2": at([20.9745, 106.7679]),
        "viet-east": at(EAST_BANK),
        "viet-west": at(WEST_BANK),
      },
    },
    {
      id: "nhu-dich",
      title: "Nhử địch: thuyền nhẹ khiêu chiến",
      caption:
        "Thủy quân Nam Hán tiến vào cửa sông. Lúc này thủy triều đang lên, mặt nước phủ kín bãi cọc nên giặc không nhìn thấy. Ngô Quyền cho thuyền nhẹ ra khiêu chiến rồi giả thua, rút lui để nhử giặc đuổi theo vào sâu trong sông.",
      tideLevel: 0.9,
      tideLabel: "Nước triều đang lên — cọc chìm dưới mặt nước",
      stakes: "submerged",
      units: {
        "han-1": at(ESTUARY.a),
        "han-2": at(ESTUARY.b),
        "han-3": at(ESTUARY.c),
        "viet-boat-1": at([20.8469, 106.7617]),
        "viet-boat-2": at([20.8655, 106.7592]),
        "viet-east": at(EAST_BANK),
        "viet-west": at(WEST_BANK),
      },
    },
    {
      id: "duoi-theo",
      title: "Giặc đuổi theo, vượt qua bãi cọc",
      caption:
        "Quân Nam Hán hăng hái đuổi theo thuyền nhẹ, đưa cả đoàn thuyền lớn qua khu vực bãi cọc khi nước triều còn cao nên không thuyền nào vướng cọc.",
      tideLevel: 1,
      tideLabel: "Nước triều lên cao nhất — cọc vẫn chìm",
      stakes: "submerged",
      units: {
        "han-1": at(CHASE.a),
        "han-2": at(CHASE.b),
        "han-3": at(CHASE.c),
        "viet-boat-1": at([20.9405, 106.7665]),
        "viet-boat-2": at([20.9605, 106.768]),
        "viet-east": at(EAST_BANK),
        "viet-west": at(WEST_BANK),
      },
    },
    {
      id: "trieu-rut",
      title: "Nước triều rút, quân ta đồng loạt phản công",
      caption:
        "Khi nước triều rút nhanh, các cọc nhọn nhô lên khỏi mặt nước. Thuyền chiến của giặc vướng cọc, không tiến cũng không lùi được. Đúng lúc đó, thuyền nhẹ quay lại đánh, quân mai phục hai bờ ào ra tấn công.",
      tideLevel: 0.3,
      tideLabel: "Nước triều rút nhanh — cọc nhô lên",
      stakes: "exposed",
      units: {
        "han-1": at(STUCK.a),
        "han-2": at(STUCK.b),
        "han-3": at(STUCK.c),
        "viet-boat-1": at([20.9455, 106.7668]),
        "viet-boat-2": at([20.9555, 106.7676]),
        "viet-east": at([20.9165, 106.7745]),
        "viet-west": at([20.9095, 106.756]),
      },
    },
    {
      id: "ket-qua",
      title: "Kết quả: quân Nam Hán đại bại",
      caption:
        "Thuyền giặc bị cọc đâm thủng, nhiều chiếc chìm, quân Nam Hán chết đuối rất nhiều. Hoằng Tháo tử trận. Vua Nam Hán đang đóng quân ở Hải Môn nghe tin bại trận liền thu quân về nước. Năm 939, Ngô Quyền xưng vương, đóng đô ở Cổ Loa, mở ra thời kỳ độc lập tự chủ lâu dài.",
      tideLevel: 0.1,
      tideLabel: "Nước ròng — bãi cọc lộ rõ",
      stakes: "exposed",
      units: {
        "han-1": sunk(STUCK.a),
        "han-2": sunk(STUCK.b),
        "han-3": sunk(STUCK.c),
        "viet-boat-1": at([20.9355, 106.767]),
        "viet-boat-2": at([20.9005, 106.7615]),
        "viet-east": at([20.9125, 106.7725]),
        "viet-west": at([20.9105, 106.7585]),
      },
    },
  ],
  sources: [
    {
      title: "Đại Việt sử ký toàn thư — Ngoại kỷ, kỷ nhà Ngô (Ngô Vương Quyền)",
      note: "Tường thuật diễn biến trận đánh và việc Ngô Quyền xưng vương năm 939.",
    },
    { title: "Sách giáo khoa Lịch sử — nội dung về chiến thắng Bạch Đằng năm 938" },
  ],
  disclaimer:
    "Đây là mô phỏng minh họa để dễ hình dung. Số lượng thuyền, đường di chuyển và vị trí bãi cọc được vẽ gần đúng, không theo tỉ lệ; địa điểm chính xác của trận địa vẫn còn được giới sử học nghiên cứu.",
};
