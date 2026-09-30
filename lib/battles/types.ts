/** Tọa độ Leaflet: [vĩ độ, kinh độ]. */
export type LatLng = [number, number];

/**
 * Loại đơn vị trên sơ đồ: quyết định hình dáng và màu biểu tượng (không chỉ dựa vào màu).
 * Bạch Đằng: invader-ship / defender-boat / defender-land. Điện Biên Phủ: vn-infantry / vn-artillery / vn-hq.
 */
export type UnitKind = "invader-ship" | "defender-boat" | "defender-land" | "vn-infantry" | "vn-artillery" | "vn-hq";

export type UnitStatus = "active" | "sunk";

/** Bãi cọc: chưa có / chìm dưới nước triều cao / lộ ra khi triều rút. */
export type StakesState = "none" | "submerged" | "exposed";

/** Cứ điểm của đối phương: đang giữ / đang bị tiến công / đã bị tiêu diệt. */
export type StrongpointStatus = "held" | "attacked" | "captured";

export type UnitDefinition = {
  id: string;
  kind: UnitKind;
  /** Tên đọc được cho chú giải và trình đọc màn hình. */
  label: string;
};

export type UnitState = {
  position: LatLng;
  visible: boolean;
  status: UnitStatus;
};

export type StrongpointDefinition = {
  id: string;
  /** Nhãn ngắn hiện trên bản đồ, ví dụ "A1". */
  label: string;
  /** Tên đầy đủ cho chú thích, ví dụ "Đồi A1 (Éliane 2)". */
  name: string;
  position: LatLng;
  /** Nhãn phụ: ẩn khi xem toàn quốc (zoom < 6) để các điểm gần nhau không đè chữ lên nhau. */
  minorLabel?: boolean;
};

/** Mũi tên tiến công. Mũi tên xuất hiện ở bước nào thì được "vẽ dần" khi chuyển tới bước đó. */
export type ArrowDefinition = {
  id: string;
  path: LatLng[];
  kind: "attack" | "supply";
};

/** Vùng tô trên bản đồ (phân khu, vòng vây...). */
export type ZoneDefinition = {
  id: string;
  path: LatLng[];
  kind: "sector" | "siege";
  label?: string;
};

export type CameraView = {
  center: LatLng;
  zoom: number;
};

export type StepFact = {
  title: string;
  text: string;
};

export type StepImage = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
};

export type BattleStep = {
  id: string;
  title: string;
  /** Mốc thời gian hiển thị của bước (tùy chọn). */
  dateText?: string;
  /** Lời dẫn của bước (tiếng Việt). */
  caption: string;
  /** Khung nhìn của bước; bỏ trống = giữ khung nhìn mặc định của kịch bản. */
  camera?: CameraView;
  /** Mực nước triều, 0 (thấp nhất) → 1 (cao nhất). Chỉ kịch bản có thủy triều mới khai báo. */
  tideLevel?: number;
  tideLabel?: string;
  stakes?: StakesState;
  /** Trạng thái MỌI đơn vị ở cuối bước này. */
  units: Record<string, UnitState>;
  /** Trạng thái các cứ điểm; cứ điểm không có trong bản ghi thì ẩn. */
  strongpoints?: Record<string, StrongpointStatus>;
  /** Id các mũi tên đang hiện ở bước này. */
  arrows?: string[];
  /** Id các vùng đang hiện ở bước này. */
  zones?: string[];
  fact?: StepFact;
  image?: StepImage;
};

export type BattleSource = {
  title: string;
  note?: string;
};

export type LegendItem = {
  /** Lớp CSS của biểu tượng mẫu (`battle-unit--*`, `battle-sp--*`, `battle-legend--*`). */
  className: string;
  label: string;
};

export type BattleScenario = {
  slug: string;
  title: string;
  dateText: string;
  summary: string;
  /** Khung nhìn ban đầu của bản đồ. */
  center: LatLng;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  /** Lòng sông vẽ nổi lên trên nền bản đồ (tùy chọn). */
  riverPath?: LatLng[];
  /** Hai đầu của hàng cọc cắm ngang lòng sông (chỉ Bạch Đằng). */
  stakeLine?: [LatLng, LatLng];
  unitDefinitions: UnitDefinition[];
  strongpointDefinitions?: StrongpointDefinition[];
  arrowDefinitions?: ArrowDefinition[];
  zoneDefinitions?: ZoneDefinition[];
  legend: LegendItem[];
  steps: BattleStep[];
  sources: BattleSource[];
  /** Lưu ý về độ chính xác, hiển thị cho người học. */
  disclaimer: string;
};

/** Trạng thái hiển thị của một khung hình đang chuyển động giữa hai bước. */
export type AnimatedUnit = {
  position: LatLng;
  /** 0 → 1: ẩn/hiện mượt khi đơn vị xuất hiện hoặc biến mất. */
  opacity: number;
  status: UnitStatus;
};

export type AnimatedStrongpoint = {
  status: StrongpointStatus;
  opacity: number;
};

export type AnimatedArrow = {
  /** 0 → 1: phần mũi tên đã được vẽ. */
  progress: number;
  opacity: number;
};

export type AnimatedFrame = {
  units: Record<string, AnimatedUnit>;
  /** null nếu kịch bản không có thủy triều. */
  tideLevel: number | null;
  stakes: StakesState;
  strongpoints: Record<string, AnimatedStrongpoint>;
  arrows: Record<string, AnimatedArrow>;
  zones: Record<string, number>;
};
