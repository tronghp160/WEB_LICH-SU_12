import type { BattleScenario, LatLng, StrongpointStatus, UnitState } from "@/lib/battles/types";

// Trận "Hà Nội – Điện Biên Phủ trên không" (18 – 29/12/1972) — bản đồ cuộc tập kích chiến lược bằng B-52 và cuộc đánh trả
// của quân dân miền Bắc (viết cứng, không lưu database). Nội dung viết lại theo khung SGK Lịch sử 12 (Kết nối tri thức),
// Bài 8; không chép nguyên văn. Các chi tiết cần đối chiếu nằm ở `toVerify` trong lib/lessons/dien-bien-phu-tren-khong.ts.
//
// "Cứ điểm": căn cứ không quân Mỹ (xanh) và nơi của ta bị ném bom (đỏ, viền vàng nhấp nháy = đang bị tập kích). Tốp B-52 và lực lượng
// phòng không: vị trí minh họa. Hai xác B-52 tiêu biểu đặt ở vị trí gần đúng. Đường bay vẽ phác, không phải hành trình thật.

const PHOTO = "/lessons/dien-bien-phu-tren-khong";

const at = (position: LatLng): UnitState => ({ position, visible: true, status: "active" });
const hidden = (position: LatLng): UnitState => ({ position, visible: false, status: "active" });
const shotDown = (position: LatLng): UnitState => ({ position, visible: true, status: "sunk" });

export const PLACES = {
  andersen: [13.584, 144.93],
  uTapao: [12.68, 101.005],
  haNoi: [21.028, 105.854],
  haiPhong: [20.845, 106.688],
  thaiNguyen: [21.594, 105.848],
  bachMai: [21.0006, 105.8413],
  khamThien: [21.0185, 105.8375],
} satisfies Record<string, LatLng>;

/** Cánh đồng Chuôm, xã Phù Lỗ (Sóc Sơn, Hà Nội) — vị trí gần đúng. */
const CHUOM: LatLng = [21.215, 105.85];
/** Hồ Hữu Tiệp (phường Ngọc Hà, Hà Nội). */
const HUU_TIEP: LatLng = [21.0412, 105.8236];

// Zoom 3: thấy cùng lúc Thái Lan, Hà Nội và đảo Guam kể cả trên điện thoại (zoom 4 làm Guam / Hà Nội rơi ra ngoài khung).
const REGION = { center: [16.6, 123] as LatLng, zoom: 3 };
const NORTH = { center: [21.05, 106.15] as LatLng, zoom: 8 };
const HANOI = { center: [21.022, 105.84] as LatLng, zoom: 13 };

const RAID_POSITION = { guam: [21.25, 106.4] as LatLng, thai: [20.85, 105.55] as LatLng };

type PlaceId = keyof typeof PLACES;

/** Căn cứ Mỹ luôn hiện (xanh); nơi bị ném bom chỉ hiện ở bước được nêu. */
function points(attacked: PlaceId[] = []): Record<string, StrongpointStatus> {
  return {
    andersen: "held",
    uTapao: "held",
    ...Object.fromEntries(attacked.map((id) => [id, "attacked" as StrongpointStatus])),
  };
}

type Units = Record<"b52Guam" | "b52Thai" | "phongKhongHaNoi" | "phongKhongHaiPhong" | "xac18" | "xac27", UnitState>;

function units({ raid, downed }: { raid: boolean; downed: 0 | 1 | 2 }): Units {
  return {
    b52Guam: at(raid ? RAID_POSITION.guam : PLACES.andersen),
    b52Thai: at(raid ? RAID_POSITION.thai : PLACES.uTapao),
    phongKhongHaNoi: at([21.09, 105.74]),
    phongKhongHaiPhong: at([20.92, 106.55]),
    xac18: downed >= 1 ? shotDown(CHUOM) : hidden(CHUOM),
    xac27: downed >= 2 ? shotDown(HUU_TIEP) : hidden(HUU_TIEP),
  };
}

export const dienBienPhuTrenKhong1972: BattleScenario = {
  slug: "dien-bien-phu-tren-khong-1972",
  title: "Hà Nội – Điện Biên Phủ trên không",
  dateText: "18 – 29/12/1972",
  summary:
    "Trong 12 ngày đêm cuối năm 1972, quân và dân miền Bắc, trọng tâm là Hà Nội và Hải Phòng, đánh bại cuộc tập kích chiến lược bằng máy bay B-52 của Mỹ, buộc Mỹ phải kí Hiệp định Pa-ri.",
  center: REGION.center,
  zoom: REGION.zoom,
  minZoom: 3,
  maxZoom: 14,
  unitDefinitions: [
    { id: "b52Guam", kind: "invader-aircraft", label: "Tốp B-52 cất cánh từ đảo Guam (vị trí minh họa)" },
    { id: "b52Thai", kind: "invader-aircraft", label: "Tốp B-52 cất cánh từ Thái Lan (vị trí minh họa)" },
    { id: "phongKhongHaNoi", kind: "vn-artillery", label: "Bộ đội tên lửa, pháo cao xạ bảo vệ Hà Nội (vị trí minh họa)" },
    { id: "phongKhongHaiPhong", kind: "vn-artillery", label: "Lực lượng phòng không bảo vệ Hải Phòng (vị trí minh họa)" },
    { id: "xac18", kind: "invader-aircraft", label: "B-52 bị bắn rơi tại chỗ đêm 18/12 — cánh đồng Chuôm, Sóc Sơn (vị trí gần đúng)" },
    { id: "xac27", kind: "invader-aircraft", label: "B-52 bị bắn rơi xuống hồ Hữu Tiệp đêm 27/12" },
  ],
  strongpointDefinitions: [
    { id: "andersen", label: "Guam", name: "Căn cứ không quân An-đéc-xen của Mỹ trên đảo Guam", position: PLACES.andersen },
    { id: "uTapao", label: "U Ta-pao", name: "Căn cứ không quân U Ta-pao (Thái Lan)", position: PLACES.uTapao },
    { id: "haNoi", label: "Hà Nội", name: "Hà Nội", position: PLACES.haNoi, side: "ours" },
    { id: "haiPhong", label: "Hải Phòng", name: "Hải Phòng", position: PLACES.haiPhong, side: "ours" },
    { id: "thaiNguyen", label: "Thái Nguyên", name: "Thái Nguyên", position: PLACES.thaiNguyen, minorLabel: true, side: "ours" },
    { id: "bachMai", label: "Bệnh viện Bạch Mai", name: "Bệnh viện Bạch Mai", position: PLACES.bachMai, minorLabel: true, side: "ours" },
    { id: "khamThien", label: "Phố Khâm Thiên", name: "Phố Khâm Thiên", position: PLACES.khamThien, minorLabel: true, side: "ours" },
  ],
  arrowDefinitions: [
    { id: "raidGuam", kind: "raid", path: [PLACES.andersen, [16.6, 132], [19.3, 117.5], [20.6, 109.6], RAID_POSITION.guam] },
    { id: "raidThai", kind: "raid", path: [PLACES.uTapao, [15.8, 102.6], [19.4, 104.3], RAID_POSITION.thai] },
  ],
  legend: [
    { className: "battle-sp battle-sp--held", label: "Căn cứ không quân của Mỹ" },
    { className: "battle-sp battle-sp--ours battle-sp--attacked", label: "Nơi của ta đang bị B-52 ném bom" },
    { className: "battle-legend-raid", label: "Đường bay tập kích của B-52 (vẽ phác)" },
    { className: "battle-unit battle-unit--invader-aircraft", label: "Tốp máy bay B-52 (vị trí minh họa)" },
    { className: "battle-unit battle-unit--invader-aircraft battle-unit--sunk", label: "B-52 bị bắn rơi (hai chiếc tiêu biểu)" },
    { className: "battle-unit battle-unit--vn-artillery", label: "Bộ đội tên lửa, pháo cao xạ (vị trí minh họa)" },
  ],
  steps: [
    {
      id: "boi-canh",
      title: "Bối cảnh: Mỹ lật lọng ở bàn đàm phán",
      dateText: "10 – 14/12/1972",
      caption:
        "Tháng 10/1972, sau nhiều vòng đàm phán ở Pa-ri, văn bản Hiệp định về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam về cơ bản đã được hai bên thỏa thuận. Nhưng Mỹ lật lọng, đòi sửa đổi nhiều điều khoản quan trọng. Để ép ta nhân nhượng, ngày 14/12/1972 Tổng thống Mỹ R. Ních-xơn phê chuẩn kế hoạch mở cuộc tập kích chiến lược bằng máy bay ném bom B-52 vào Hà Nội, Hải Phòng. Hàng trăm chiếc B-52 được tập trung ở căn cứ An-đéc-xen (đảo Guam) và U Ta-pao (Thái Lan).",
      camera: REGION,
      units: units({ raid: false, downed: 0 }),
      strongpoints: points(),
      fact: {
        title: "B-52 — \"pháo đài bay\"",
        text: "B-52 là máy bay ném bom chiến lược lớn nhất của Mỹ khi đó, bay ở độ cao khoảng 10 km, mỗi chiếc mang được hàng chục tấn bom, luôn có nhiều máy bay chiến thuật hộ tống và gây nhiễu ra-đa dày đặc. Mỹ tin rằng không ai có thể đánh bại B-52.",
      },
    },
    {
      id: "dem-18-12",
      title: "Tối 18/12: B-52 tập kích Hà Nội",
      dateText: "Tối 18/12/1972",
      caption:
        "Chiều tối 18/12/1972, những tốp B-52 đầu tiên cất cánh từ Guam và Thái Lan, có máy bay chiến thuật hộ tống, ném bom Hà Nội và vùng phụ cận. Nhưng quân dân ta không bị bất ngờ. Ngay đêm đầu tiên, lực lượng phòng không bắn rơi 3 chiếc B-52, trong đó một chiếc rơi tại chỗ trên cánh đồng Chuôm (Sóc Sơn, Hà Nội).",
      camera: REGION,
      units: units({ raid: true, downed: 1 }),
      strongpoints: points(["haNoi"]),
      arrows: ["raidGuam", "raidThai"],
      fact: {
        title: "Vì sao ta không bị bất ngờ?",
        text: "Từ nhiều năm trước, theo lời dự báo của Chủ tịch Hồ Chí Minh, bộ đội phòng không – không quân đã nghiên cứu cách đánh B-52, tìm cách phát hiện B-52 giữa vùng nhiễu ra-đa dày đặc. Người dân Hà Nội được sơ tán, hầm trú ẩn được đào khắp phố phường.",
      },
      image: {
        src: `${PHOTO}/b52-guam-12-1972.webp`,
        alt: "Ảnh đen trắng: hàng dài máy bay ném bom B-52 xếp nối đuôi nhau trên đường băng",
        caption: "Máy bay B-52D ở căn cứ An-đéc-xen (đảo Guam) chờ cất cánh đi ném bom miền Bắc, tháng 12/1972.",
        credit: "Không quân Mỹ, phạm vi công cộng",
      },
    },
    {
      id: "dem-20-12",
      title: "Đêm 20/12: bắn rơi 7 chiếc B-52",
      dateText: "19 – 21/12/1972",
      caption:
        "Các đêm tiếp theo, B-52 liên tục rải bom Hà Nội, Hải Phòng, Thái Nguyên và nhiều nơi khác. Bộ đội tên lửa, pháo cao xạ, không quân cùng dân quân tự vệ chiến đấu ngoan cường, rút kinh nghiệm sau từng trận. Đêm 20/12/1972, ta bắn rơi 7 chiếc B-52 — đòn đau nhất với không quân chiến lược Mỹ trong những ngày đầu.",
      camera: NORTH,
      units: units({ raid: true, downed: 1 }),
      strongpoints: points(["haNoi", "haiPhong", "thaiNguyen"]),
      image: {
        src: `${PHOTO}/manh-b52-ha-noi-1972.webp`,
        alt: "Ảnh đen trắng: một nhóm người đứng quanh mảnh thân máy bay bằng kim loại nằm trên ruộng, phía sau có trẻ em",
        caption: "Mảnh xác một chiếc B-52 bị bắn rơi ở ngoại thành Hà Nội, ngày 23/12/1972.",
        credit: "Kho ảnh S. A. Varyukhin (Hội cựu chiến binh Nga từng làm nhiệm vụ ở Việt Nam), CC BY-SA 3.0",
      },
    },
    {
      id: "rai-tham",
      title: "Rải thảm Bạch Mai, Khâm Thiên",
      dateText: "22 – 26/12/1972",
      caption:
        "Không khuất phục được ta, Mỹ cho B-52 rải thảm cả vào khu dân cư, bệnh viện, trường học. Ngày 22/12/1972, Bệnh viện Bạch Mai — bệnh viện lớn nhất miền Bắc — bị bom tàn phá nặng nề. Đêm 26/12/1972, phố Khâm Thiên bị rải thảm, nhiều dãy nhà bị san phẳng, hàng trăm người dân thiệt mạng.",
      camera: HANOI,
      units: units({ raid: true, downed: 1 }),
      strongpoints: points(["haNoi", "bachMai", "khamThien"]),
      fact: {
        title: "Tội ác bị cả thế giới lên án",
        text: "Hình ảnh Bạch Mai, Khâm Thiên đổ nát khiến dư luận thế giới, kể cả nhiều người dân Mỹ, lên tiếng phản đối mạnh mẽ cuộc ném bom. Ngày nay, Đài tưởng niệm Khâm Thiên với tượng người mẹ bế đứa con nhỏ ghi lại nỗi đau ấy.",
      },
    },
    {
      id: "dem-26-12",
      title: "Đêm 26/12: trận đánh lớn nhất",
      dateText: "Đêm 26/12/1972",
      caption:
        "Đêm 26/12/1972, Mỹ huy động số B-52 đông nhất trong cả cuộc tập kích, đánh cùng lúc vào Hà Nội, Hải Phòng, Thái Nguyên. Quân dân ta đánh trả quyết liệt: chỉ trong một đêm, bắn rơi 8 chiếc B-52 — trận thắng lớn nhất trong 12 ngày đêm, làm suy sụp ý chí của không quân chiến lược Mỹ.",
      camera: NORTH,
      units: units({ raid: true, downed: 1 }),
      strongpoints: points(["haNoi", "haiPhong", "thaiNguyen"]),
      arrows: ["raidGuam", "raidThai"],
    },
    {
      id: "dem-27-12",
      title: "Đêm 27/12: MiG-21 bắn rơi B-52",
      dateText: "Đêm 27/12/1972",
      caption:
        "Đêm 27/12/1972, phi công Phạm Tuân lái máy bay MiG-21 vượt qua hàng rào máy bay hộ tống, phóng tên lửa bắn rơi một chiếc B-52 — chiến công nổi tiếng của không quân ta trong 12 ngày đêm. Cũng trong đêm ấy, một chiếc B-52 trúng tên lửa rơi xuống hồ Hữu Tiệp giữa khu dân cư Ngọc Hà; xác máy bay nằm trong lòng hồ nhỏ đến tận ngày nay.",
      camera: HANOI,
      units: units({ raid: true, downed: 2 }),
      strongpoints: points(["haNoi"]),
      image: {
        src: `${PHOTO}/mig21-5121.webp`,
        alt: "Máy bay tiêm kích MiG-21 màu bạc mang số hiệu 5121 sơn đỏ, đặt trên bệ trong sân bảo tàng",
        caption: "Chiếc MiG-21 số hiệu 5121 mà phi công Phạm Tuân lái đêm 27/12/1972, nay trưng bày ở Hà Nội (ảnh năm 2012).",
        credit: "Gary Todd, CC0",
      },
    },
    {
      id: "ngung-nem-bom",
      title: "Mỹ phải ngừng ném bom",
      dateText: "29 – 30/12/1972",
      caption:
        "Đêm 29/12/1972 là đêm tập kích cuối cùng. Sau 12 ngày đêm, Mỹ bị tổn thất nặng nề mà không khuất phục được ta. Ngày 30/12/1972, Ních-xơn phải tuyên bố ngừng ném bom miền Bắc từ vĩ tuyến 20 trở ra và đề nghị nối lại đàm phán ở Pa-ri.",
      camera: REGION,
      units: units({ raid: false, downed: 2 }),
      strongpoints: points(),
    },
    {
      id: "hiep-dinh-pa-ri",
      title: "Hiệp định Pa-ri được kí kết",
      dateText: "27/1/1973",
      caption:
        "Ngày 8/1/1973, đàm phán ở Pa-ri được nối lại. Ngày 27/1/1973, Hiệp định Pa-ri về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được kí chính thức. Mỹ cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam, rút hết quân Mỹ và quân đồng minh khỏi miền Nam trong vòng 60 ngày.",
      camera: NORTH,
      units: units({ raid: false, downed: 2 }),
      strongpoints: points(),
      fact: {
        title: "Vì sao gọi là \"Điện Biên Phủ trên không\"?",
        text: "Năm 1954, chiến thắng Điện Biên Phủ buộc Pháp kí Hiệp định Giơ-ne-vơ. Năm 1972, thắng lợi trên bầu trời Hà Nội đập tan cố gắng quân sự cao nhất của Mỹ, buộc Mỹ trở lại bàn đàm phán và kí Hiệp định Pa-ri — vì thế được gọi là trận \"Điện Biên Phủ trên không\".",
      },
    },
  ],
  sources: [
    { title: "Sách giáo khoa Lịch sử 12 (Kết nối tri thức với cuộc sống)", note: "Bài 8. Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)" },
    { title: "OpenStreetMap", note: "tọa độ gần đúng của các địa danh và căn cứ không quân" },
  ],
  disclaimer:
    "Bản đồ minh họa: đường bay của B-52 vẽ phác, không phải hành trình thật; vị trí các tốp máy bay và lực lượng phòng không là minh họa. Chỉ đánh dấu hai chiếc B-52 bị bắn rơi tiêu biểu (vị trí gần đúng). Số máy bay bị bắn rơi theo số liệu của ta; tài liệu phía Mỹ công bố con số thấp hơn.",
};
