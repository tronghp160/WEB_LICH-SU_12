/** Tọa độ Leaflet: [vĩ độ, kinh độ]. */
export type LatLng = [number, number];

/** Loại đơn vị trên sơ đồ: quyết định hình dáng và màu biểu tượng (không chỉ dựa vào màu). */
export type UnitKind = "invader-ship" | "defender-boat" | "defender-land";

export type UnitStatus = "active" | "sunk";

/** Bãi cọc: chưa có / chìm dưới nước triều cao / lộ ra khi triều rút. */
export type StakesState = "none" | "submerged" | "exposed";

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

export type BattleStep = {
  id: string;
  title: string;
  /** Lời dẫn của bước (tiếng Việt). */
  caption: string;
  /** Mực nước triều, 0 (thấp nhất) → 1 (cao nhất). */
  tideLevel: number;
  tideLabel: string;
  stakes: StakesState;
  /** Trạng thái MỌI đơn vị ở cuối bước này. */
  units: Record<string, UnitState>;
};

export type BattleSource = {
  title: string;
  note?: string;
};

export type BattleScenario = {
  slug: string;
  title: string;
  dateText: string;
  summary: string;
  /** Khung nhìn ban đầu của bản đồ. */
  center: LatLng;
  zoom: number;
  riverPath: LatLng[];
  /** Hai đầu của hàng cọc cắm ngang lòng sông. */
  stakeLine: [LatLng, LatLng];
  unitDefinitions: UnitDefinition[];
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

export type AnimatedFrame = {
  units: Record<string, AnimatedUnit>;
  tideLevel: number;
  stakes: StakesState;
};
