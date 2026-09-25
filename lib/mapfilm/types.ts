import type { BattleScenario, LatLng, StrongpointStatus } from "@/lib/battles/types";
import type { Emitter, EmitterKind, Subtitle } from "@/lib/cinema/types";

/**
 * "Phim trên bản đồ 3D": mỗi giai đoạn (BattleStep) của kịch bản bản đồ 2D là một CẢNH chạy trực tiếp trên bản đồ 3D.
 * Mọi thứ trong cảnh là hàm thuần của (số thứ tự cảnh, thời điểm t tính bằng giây từ đầu cảnh).
 */

/** Góc máy của bản đồ: tâm, mức phóng, độ nghiêng (0 = nhìn thẳng xuống) và hướng (0 = bắc ở trên). */
export type MapCam = { center: LatLng; zoom: number; pitch: number; bearing: number };
export type CamEase = "inOut" | "linear" | "in" | "out";
/** Mốc góc máy tại thời điểm `t`; giữa hai mốc camera bay theo đường cong kiểu flyTo, `ease` là nhịp của chặng TỚI mốc này. */
export type MapCamKey = MapCam & { t: number; ease?: CamEase };

export type Side = "vn" | "fr";
/** Loại quân cờ 3D: bộ binh, khẩu pháo, sở chỉ huy, dân công. */
export type PieceKind = "infantry" | "artillery" | "hq" | "porter";

/** Đường đi: tọa độ cụ thể hoặc tham chiếu một mũi tên của kịch bản. */
export type PathRef = LatLng[] | { arrow: string };

/** Hàng quân `count` quân cờ nối đuôi nhau đi dọc đường, tới nơi thì dàn hàng ngang. */
export type MarchAction = {
  type: "march";
  id: string;
  kind: PieceKind;
  side: Side;
  path: PathRef;
  t0: number;
  t1: number;
  count: number;
  /** true: tới nơi thì mờ dần (ví dụ đoàn dân công đã giao hàng). */
  fadeAtEnd?: boolean;
};

/** Vẽ dần một mũi tên của kịch bản trong [t0, t1]. */
export type ArrowAction = { type: "arrow"; arrow: string; t0: number; t1: number };

/** Mũi tên chỉ có trong cảnh này (ví dụ các hướng tiến công Đông – Xuân ở cảnh toàn Đông Dương). */
export type ExtraArrow = { id: string; path: LatLng[]; kind: "attack" | "supply" | "enemy"; t0: number; t1: number };

/** Pháo bắn `rounds` phát từ các vị trí `from` (luân phiên) vào quanh `target` (tản mát trong bán kính `spread` mét). */
export type BarrageAction = { type: "barrage"; from: LatLng[]; target: LatLng; t0: number; t1: number; rounds: number; spread: number; seed: number };

/** Một vụ nổ / đám cháy tại chỗ. `t1` chỉ dùng cho đám cháy. */
export type BlastAction = { type: "blast"; at: LatLng; t: number; t1?: number; kind: EmitterKind; scale?: number; seed?: number };

/** Đổi trạng thái cứ điểm tại thời điểm `t` (kèm hiệu ứng: nổ, hạ cờ Pháp, kéo cờ ta). */
export type StrongpointAction = { type: "strongpoint"; id: string; t: number; status: StrongpointStatus };

/** Các cứ điểm (theo thứ tự) lần lượt hiện lên trong [t0, t1]. */
export type RevealAction = { type: "reveal"; ids: string[]; t0: number; t1: number };

/** Vùng (phân khu, vòng vây) hiện dần trong [t0, t1]. */
export type ZoneAction = { type: "zone"; id: string; t0: number; t1: number };

/** Máy bay bay dọc `path` trong [t0, t1] ở độ cao `altitude` (m); có thể thả dù tại các thời điểm `drops`. */
export type PlaneAction = { type: "plane"; id: string; path: LatLng[]; t0: number; t1: number; altitude: number; drops?: number[] };

/** Nhãn chữ nổi trên bản đồ trong [t0, t1]. */
/** `tone`: địa danh (chữ có chân), ghi chú (nền tối) hoặc vị trí của địch (nền xanh). */
export type LabelTone = "place" | "note" | "enemy";
export type LabelAction = { type: "label"; id: string; at: LatLng; text: string; t0: number; t1: number; tone?: LabelTone };

export type MapAction =
  | MarchAction
  | ArrowAction
  | BarrageAction
  | BlastAction
  | StrongpointAction
  | RevealAction
  | ZoneAction
  | PlaneAction
  | LabelAction;

export type MapScene = {
  /** Id của BattleStep tương ứng trong kịch bản 2D: cuối cảnh, bản đồ 3D khớp đúng trạng thái của bước này. */
  stepId: string;
  duration: number;
  chapter: { title: string; clock?: string };
  camera: MapCamKey[];
  subtitles: Subtitle[];
  /** Khoảng thời gian các đơn vị của kịch bản 2D di chuyển tới vị trí mới (mặc định 15%–60% cảnh). */
  unitMove?: [number, number];
  /** Mức đêm tối (0 = ngày, 1 = đêm) theo thời gian; nội suy tuyến tính. */
  night?: { t: number; value: number }[];
  /** Thời điểm hiện thẻ "Bạn có biết?" của bước (mặc định 55% cảnh). */
  factAt?: number;
  extraArrows?: ExtraArrow[];
  actions: MapAction[];
};

export type MapFilmScript = {
  slug: string;
  title: string;
  scenario: BattleScenario;
  /** Ảnh nền của khung giới thiệu (đã có trong public/). */
  poster: { src: string; alt: string };
  /** Bài học chứa bản đồ này. */
  lesson: { href: string; title: string };
  /** Gốc tọa độ cục bộ (mét) cho hiệu ứng 3D. */
  origin: LatLng;
  scenes: MapScene[];
  /** Chi tiết cần đối chiếu tài liệu chính thống. */
  toVerify: string[];
};

// ---------- Khung hình ----------

export type PieceState = {
  key: string;
  kind: PieceKind;
  side: Side;
  position: LatLng;
  /** Hướng (độ, 0 = bắc). */
  heading: number;
  opacity: number;
  moving: boolean;
  /** Lệch ngang so với hướng đi, tính bằng "bề rộng quân cờ" (để hàng quân dàn ra khi dừng). */
  offset: number;
  label?: string;
};

export type StrongpointState = {
  id: string;
  label: string;
  name: string;
  position: LatLng;
  status: StrongpointStatus;
  opacity: number;
  /** Chiều cao (0–1) của cờ Pháp và cờ ta trên cột cờ. */
  flagFr: number;
  flagVn: number;
};

export type ArrowState = { id: string; path: LatLng[]; kind: "attack" | "supply" | "enemy"; progress: number; opacity: number };

/** Viên đạn pháo đang bay: `u` = 0 (rời nòng) → 1 (chạm đất). */
export type ShellState = { from: LatLng; to: LatLng; u: number };

export type MuzzleState = { at: LatLng; strength: number };

export type PlaneState = { id: string; position: LatLng; altitude: number; heading: number; opacity: number };

export type ChuteState = { position: LatLng; altitude: number; opacity: number };

export type LabelState = { id: string; at: LatLng; text: string; opacity: number; tone: LabelTone };

export type MapFrame = {
  scene: number;
  t: number;
  /** Góc máy phim (chưa cộng rung). */
  camera: MapCam;
  /** Độ rung máy do nổ lớn (0 = không rung). */
  shake: number;
  pieces: PieceState[];
  strongpoints: StrongpointState[];
  arrows: ArrowState[];
  zones: Record<string, number>;
  shells: ShellState[];
  muzzles: MuzzleState[];
  /** Hiệu ứng hạt đang hoạt động; x/z là mét cục bộ quanh `origin`, t0 là giây trong cảnh. */
  emitters: Emitter[];
  planes: PlaneState[];
  chutes: ChuteState[];
  labels: LabelState[];
  night: number;
  subtitle: Subtitle | null;
  card: { title: string; clock?: string; alpha: number } | null;
  factVisible: boolean;
};
