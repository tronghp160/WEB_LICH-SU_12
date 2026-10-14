import type { BattleScenario, LatLng, StrongpointStatus, UnitState } from "@/lib/battles/types";

// Đường Trường Sơn – đường Hồ Chí Minh (1959 – 1975) — bản đồ hai tuyến chi viện chiến lược trên bộ và trên biển (viết cứng,
// không lưu database). Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức), Bài 8; không chép nguyên văn. Các chi
// tiết cần đối chiếu nằm ở `toVerify` trong lib/lessons/duong-truong-son.ts.
//
// Mũi tên nét đứt đỏ: tuyến chi viện (vẽ phác theo hướng chính, KHÔNG phải mạng đường thật — thực tế là hàng nghìn km đường
// trục dọc, trục ngang, đường vòng tránh). Ô đỏ thẫm viền vàng: trọng điểm của ta bị Mỹ đánh phá ác liệt. Đoàn xe, đoàn tàu:
// vị trí minh họa.

const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });
const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });

export const PLACES = {
  kheHo: [16.98, 106.88],
  muGia: [17.6, 105.78],
  dongLoc: [18.395, 105.55],
  sePon: [16.69, 106.23],
  attapeu: [14.81, 106.83],
  konTum: [14.35, 108.0],
  locNinh: [11.84, 106.6],
  doSon: [20.71, 106.79],
  vungRo: [12.86, 109.42],
  caMau: [8.75, 104.95],
  saiGon: [10.776, 106.701],
} satisfies Record<string, LatLng>;

const COUNTRY = { center: [15.0, 106.8] as LatLng, zoom: 6 };
const NORTH_CENTRAL = { center: [17.4, 106.2] as LatLng, zoom: 7 };
const DONG_LOC = { center: [18.3, 105.75] as LatLng, zoom: 9 };
const SE_PON = { center: [16.7, 106.45] as LatLng, zoom: 8 };

type PointId = "muGia" | "dongLoc" | "sePon" | "saiGon";

function points(entries: Partial<Record<PointId, StrongpointStatus>>): Record<string, StrongpointStatus> {
  return { ...entries };
}

type Units = Record<"doan559" | "tauKhongSo" | "binhDoan", UnitState>;

function units(convoy: LatLng | null, boat: LatLng | null, army: LatLng | null): Units {
  return {
    doan559: convoy ? at(convoy) : hidden(PLACES.kheHo),
    tauKhongSo: boat ? at(boat) : hidden(PLACES.doSon),
    binhDoan: army ? at(army) : hidden(PLACES.locNinh),
  };
}

const TRAIL_1959: LatLng[] = [PLACES.kheHo, [16.75, 106.95], [16.45, 107.15], [16.1, 107.4]];
const TRAIL_WEST: LatLng[] = [PLACES.muGia, [17.1, 106.0], PLACES.sePon, [15.7, 106.6], PLACES.attapeu, [14.3, 107.2], [13.0, 107.4], [12.2, 107.0], PLACES.locNinh];
const SEA_ROUTE: LatLng[] = [PLACES.doSon, [19.4, 107.9], [17.2, 109.4], [15.0, 110.3], [13.4, 110.0], PLACES.vungRo];
const SEA_SOUTH: LatLng[] = [[13.4, 110.0], [11.0, 110.0], [8.6, 107.6], [8.2, 105.6], PLACES.caMau];
const TRAIL_EAST: LatLng[] = [[16.75, 107.05], [16.0, 107.45], [15.2, 107.75], [14.3, 108.05], [13.2, 108.0], [12.3, 107.6], PLACES.locNinh];
const LAM_SON_719: LatLng[] = [[16.64, 106.73], [16.66, 106.5], [16.68, 106.3]];
const TO_SAIGON: LatLng[] = [PLACES.locNinh, [11.3, 106.65], [10.85, 106.69]];

export const duongTruongSon: BattleScenario = {
  slug: "duong-truong-son",
  title: "Đường Trường Sơn – đường Hồ Chí Minh",
  dateText: "1959 – 1975",
  summary:
    "Mười sáu năm mở và giữ hai tuyến chi viện chiến lược — đường Trường Sơn trên bộ và đường Hồ Chí Minh trên biển — đưa người, vũ khí, lương thực từ miền Bắc vào chiến trường miền Nam.",
  center: COUNTRY.center,
  zoom: COUNTRY.zoom,
  minZoom: 5,
  maxZoom: 12,
  unitDefinitions: [
    { id: "doan559", kind: "vn-infantry", label: "Bộ đội Trường Sơn, đoàn xe vận tải (vị trí minh họa)" },
    { id: "tauKhongSo", kind: "defender-boat", label: "Tàu không số của Đoàn 759 (vị trí minh họa)" },
    { id: "binhDoan", kind: "vn-hq", label: "Các binh đoàn chủ lực hành quân vào chiến trường (vị trí minh họa)" },
  ],
  strongpointDefinitions: [
    { id: "muGia", label: "Đèo Mụ Giạ", name: "Đèo Mụ Giạ (Quảng Bình) — cửa ngõ sang Lào", position: PLACES.muGia, side: "ours" },
    { id: "dongLoc", label: "Ngã ba Đồng Lộc", name: "Ngã ba Đồng Lộc (Hà Tĩnh)", position: PLACES.dongLoc, side: "ours" },
    { id: "sePon", label: "Sê Pôn", name: "Khu vực Sê Pôn (Lào) trên Đường 9", position: PLACES.sePon, side: "ours" },
    { id: "saiGon", label: "Sài Gòn", name: "Sài Gòn", position: PLACES.saiGon },
  ],
  arrowDefinitions: [
    { id: "trail1959", kind: "supply", path: TRAIL_1959 },
    { id: "seaRoute", kind: "supply", path: SEA_ROUTE },
    { id: "seaSouth", kind: "supply", path: SEA_SOUTH },
    { id: "trailWest", kind: "supply", path: TRAIL_WEST },
    { id: "lamSon719", kind: "raid", path: LAM_SON_719 },
    { id: "trailEast", kind: "supply", path: TRAIL_EAST },
    { id: "toSaigon", kind: "attack", path: TO_SAIGON },
  ],
  legend: [
    { className: "battle-legend-arrow", label: "Tuyến chi viện, hướng tiến quân (vẽ phác)" },
    { className: "battle-legend-raid", label: "Hướng tiến công của đối phương" },
    { className: "battle-sp battle-sp--ours battle-sp--attacked", label: "Trọng điểm của ta bị đánh phá" },
    { className: "battle-unit battle-unit--vn-infantry", label: "Bộ đội Trường Sơn (vị trí minh họa)" },
    { className: "battle-unit battle-unit--defender-boat", label: "Tàu không số (vị trí minh họa)" },
  ],
  steps: [
    {
      id: "mo-duong",
      title: "19/5/1959: Đoàn 559 mở đường",
      dateText: "19/5/1959",
      caption:
        "Để chi viện cho cách mạng miền Nam, Bộ Chính trị quyết định mở tuyến vận tải chiến lược dọc dãy Trường Sơn. Ngày 19/5/1959 — đúng ngày sinh nhật Chủ tịch Hồ Chí Minh — Đoàn 559 được thành lập. Những năm đầu, đường chỉ là lối mòn xuyên rừng phía đông dãy Trường Sơn: bộ đội và dân công gùi, thồ hàng trên vai, đi bí mật, \"đi không dấu, nấu không khói\".",
      camera: NORTH_CENTRAL,
      units: units(PLACES.kheHo, null, null),
      strongpoints: points({}),
      arrows: ["trail1959"],
      fact: {
        title: "Vì sao chọn số 559?",
        text: "Tên Đoàn 559 lấy từ thời điểm ra đời: tháng 5 năm 1959. Đường mòn đầu tiên vượt Đường 9 (Quảng Trị) — nơi đối phương canh giữ gắt gao — để vào Thừa Thiên.",
      },
    },
    {
      id: "tren-bien",
      title: "Đường Hồ Chí Minh trên biển",
      dateText: "Từ 23/10/1961",
      caption:
        "Ngày 23/10/1961, Đoàn 759 (sau là Đoàn 125 Hải quân) được thành lập, mở tuyến vận tải trên biển. Những con tàu không mang số hiệu, ngụy trang thành tàu đánh cá, vượt biển hàng nghìn hải lí đưa vũ khí vào các bến bí mật ở Vũng Rô (Phú Yên), Cà Mau… Nhiều chuyến tàu bị phát hiện, thủy thủ sẵn sàng hủy tàu để giữ bí mật.",
      camera: COUNTRY,
      units: units(PLACES.kheHo, PLACES.vungRo, null),
      strongpoints: points({}),
      arrows: ["trail1959", "seaRoute", "seaSouth"],
    },
    {
      id: "tay-truong-son",
      title: "Đường xe cơ giới sang phía tây",
      dateText: "1965 – 1968",
      caption:
        "Khi Mỹ đưa quân vào miền Nam và ném bom miền Bắc, tuyến đường phát triển thành mạng lưới đường cho xe cơ giới, phần lớn chạy sang phía tây dãy Trường Sơn qua đất Lào. Mỹ đánh phá ác liệt bằng máy bay, bom từ trường, chất độc hóa học làm trụi rừng và thả thiết bị cảm ứng dò tìm xe. Bộ đội công binh, lái xe, thanh niên xung phong vẫn bám đường, \"xe chưa qua, nhà không tiếc\".",
      camera: COUNTRY,
      units: units(PLACES.attapeu, PLACES.vungRo, null),
      strongpoints: points({ muGia: "attacked", sePon: "attacked" }),
      arrows: ["trailWest", "seaRoute", "seaSouth"],
      image: {
        src: "/lessons/truong-son/duong-mon-lao-1970.webp",
        alt: "Ảnh đen trắng chụp từ trên cao: con đường đất uốn lượn giữa rừng, hai bên chi chít hố bom tròn, trên đường có vài chiếc xe tải",
        caption: "Ảnh trinh sát của Mỹ chụp một đoạn đường Trường Sơn ở Lào ngày 16/1/1970: xe tải ngụy trang trên đường, xung quanh chi chít hố bom.",
        credit: "Hải quân Mỹ (Lưu trữ Quốc gia Mỹ), phạm vi công cộng",
      },
    },
    {
      id: "dong-loc",
      title: "Ngã ba Đồng Lộc",
      dateText: "24/7/1968",
      caption:
        "Các tuyến đường từ miền Bắc vào Trường Sơn phải đi qua nhiều \"túi bom\" như Ngã ba Đồng Lộc (Hà Tĩnh). Chiều 24/7/1968, mười nữ thanh niên xung phong của Tiểu đội 4, Đại đội 552 đang san lấp hố bom để thông đường thì bị bom Mỹ vùi lấp, tất cả đều hi sinh. Người lớn tuổi nhất mới 24, người trẻ nhất 17 tuổi.",
      camera: DONG_LOC,
      units: units(null, null, null),
      strongpoints: points({ dongLoc: "attacked" }),
    },
    {
      id: "duong-9-nam-lao",
      title: "Đường 9 – Nam Lào: giữ vững tuyến đường",
      dateText: "2 – 3/1971",
      caption:
        "Đầu năm 1971, Mỹ và quân đội Sài Gòn mở cuộc hành quân \"Lam Sơn 719\" đánh sang khu vực Đường 9 – Nam Lào, hòng cắt đứt đường Trường Sơn. Quân đội ta phối hợp với quân dân Lào đánh bại cuộc hành quân, giữ vững tuyến chi viện chiến lược.",
      camera: SE_PON,
      units: units(PLACES.sePon, null, null),
      strongpoints: points({ sePon: "attacked" }),
      arrows: ["lamSon719", "trailWest"],
    },
    {
      id: "dong-truong-son",
      title: "Đông Trường Sơn và đường ống xăng dầu",
      dateText: "1973 – 1975",
      caption:
        "Sau Hiệp định Pa-ri (1/1973), ta mở rộng mạnh mẽ tuyến chi viện: xây dựng đường ô tô chiến lược Đông Trường Sơn cho xe chạy cả ngày lẫn đêm, kéo dài đường ống xăng dầu vào tới miền Đông Nam Bộ. Hàng chục vạn bộ đội, hàng vạn tấn vũ khí, đạn dược được đưa vào chiến trường, chuẩn bị cho cuộc Tổng tiến công năm 1975.",
      camera: COUNTRY,
      units: units(PLACES.konTum, PLACES.vungRo, [14.3, 108.05]),
      strongpoints: points({}),
      arrows: ["trailWest", "trailEast", "seaRoute"],
      image: {
        src: "/lessons/truong-son/xe-zil-157.webp",
        alt: "Xe tải quân sự ba cầu màu xanh rêu, thùng gỗ, đặt trên bệ trưng bày",
        caption: "Xe tải ZiL-157 do Liên Xô sản xuất — loại xe vận tải từng chạy trên đường Trường Sơn — trưng bày ở Hà Nội (ảnh năm 2025).",
        credit: "kitmasterbloke, CC BY 2.0",
      },
    },
    {
      id: "xuan-1975",
      title: "Xuân 1975: tiến về Sài Gòn",
      dateText: "3 – 4/1975",
      caption:
        "Mùa xuân năm 1975, các quân đoàn chủ lực hành quân thần tốc theo đường Trường Sơn và đường số 1 vào chiến trường. Từ Lộc Ninh — điểm cuối của đường Trường Sơn ở miền Đông Nam Bộ — các cánh quân tiến về Sài Gòn. Ngày 30/4/1975, chiến dịch Hồ Chí Minh toàn thắng, miền Nam hoàn toàn giải phóng.",
      camera: COUNTRY,
      units: units(null, null, [11.3, 106.65]),
      strongpoints: points({ saiGon: "captured" }),
      arrows: ["trailEast", "toSaigon"],
      fact: {
        title: "\"Xẻ dọc Trường Sơn đi cứu nước\"",
        text: "Câu thơ của nhà thơ Tố Hữu nói lên khí thế của những đoàn quân vượt Trường Sơn. Con đường được ví như \"mạch máu\" nối hậu phương miền Bắc với tiền tuyến miền Nam.",
      },
    },
  ],
  sources: [
    { title: "Sách giáo khoa Lịch sử 12 (Kết nối tri thức với cuộc sống)", note: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)" },
    { title: "OpenStreetMap", note: "tọa độ gần đúng của các địa danh" },
  ],
  disclaimer:
    "Bản đồ minh họa: các mũi tên chỉ vẽ phác hướng chính của tuyến chi viện; thực tế đường Trường Sơn là mạng lưới hàng nghìn km đường trục dọc, trục ngang, đường vòng tránh, đi qua cả lãnh thổ Lào và Cam-pu-chia. Vị trí đoàn xe, đoàn tàu là minh họa.",
};
