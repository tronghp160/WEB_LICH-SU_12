import type { Vec2, Vec3 } from "@/lib/cinema/math";
import type { Trench, Crater, HillSpec } from "@/lib/cinema/terrain";

/** Một cú máy: máy quay chạy dọc `path`, nhìn theo `look` (cả hai nội suy Catmull–Rom theo thời gian của cú máy). */
export type Shot = {
  id: string;
  t0: number;
  t1: number;
  path: Vec3[];
  look: Vec3[];
  /** Tiêu cự (độ, góc nhìn dọc). Hai số = bắt đầu → kết thúc. */
  fov: number | [number, number];
  ease?: "linear" | "inOut" | "out" | "inOutCubic";
  /** Độ rung cầm tay (0 = vững như giá ba chân). */
  shake?: number;
  /** true: y của `path`/`look` là độ cao so với mặt đất tại (x, z) thay vì tuyệt đối. */
  agl?: boolean;
};

export type Subtitle = { t0: number; t1: number; text: string };

export type Chapter = { t: number; title: string; clock?: string };

export type FactLabel = { t0: number; t1: number; position: Vec3; text: string };

export type SegmentKind = "idle" | "run" | "walk" | "fire" | "kneel" | "throw" | "fall" | "handsup" | "flag" | "hidden";
export type Faction = "vn" | "fr";

export type Segment = { t0: number; t1: number; kind: SegmentKind; from: Vec2; to: Vec2; heading?: number };

export type SoldierPlan = { id: number; faction: Faction; scale: number; segments: Segment[] };

export type SoldierPose = {
  visible: boolean;
  x: number;
  z: number;
  /** Hướng nhìn (rad): vector trước = (sin h, cos h) trong mặt phẳng (x, z). */
  heading: number;
  kind: SegmentKind;
  /** Số giây kể từ khi bắt đầu trạng thái hiện tại. */
  since: number;
  /** Tốc độ di chuyển (m/s) — quyết định nhịp chạy. */
  speed: number;
  /** Quãng đường đã đi (m) tính từ lúc bắt đầu kịch bản — pha của nhịp bước chân. */
  odometer: number;
};

export type Shot3D = {
  /** Thời điểm nổ súng. */
  t: number;
  faction: Faction;
  origin: Vec3;
  /** Vector đơn vị hướng bay. */
  dir: Vec3;
  /** Quãng đường tối đa (m) trước khi biến mất. */
  range: number;
};

/** Điểm phát hiệu ứng: nổ lớn, nổ pháo, lựu đạn, cháy. */
export type EmitterKind = "blast" | "shell" | "grenade" | "fire";

export type Emitter = {
  id: string;
  kind: EmitterKind;
  t0: number;
  /** Chỉ dùng cho `fire`: thời điểm tắt (mặc định tới hết phim). */
  t1?: number;
  x: number;
  z: number;
  /** Hệ số kích thước (1 = cỡ chuẩn của loại). */
  scale: number;
  seed: number;
  /** Nổ xa ngoài khung hình (chỉ có ánh chớp + tiếng ì ầm). */
  distant?: boolean;
};

export type Flare = { t: number; x: number; z: number; drift: Vec2; seed: number };

export type Prop = {
  id: string;
  kind: "bunker";
  x: number;
  z: number;
  /** Kích thước dài × cao × rộng (m). */
  size: Vec3;
  rotation: number;
  /** Bị phá hủy tại thời điểm này (nếu có). */
  destroyedAt?: number;
};

export type WirePolyline = { id: string; points: Vec2[] };

export type FilmScript = {
  id: string;
  title: string;
  duration: number;
  blastTime: number;
  blast: { x: number; z: number };
  /** Khoảng thời gian trời sáng dần: [bắt đầu, xong]. */
  dawn: [number, number];
  shots: Shot[];
  subtitles: Subtitle[];
  chapters: Chapter[];
  labels: FactLabel[];
  emitters: Emitter[];
  flares: Flare[];
  soldiers: SoldierPlan[];
  shots3d: Shot3D[];
  props: Prop[];
  wires: WirePolyline[];
  terrain: { hill: HillSpec; trenches: Trench[]; craters: Crater[] };
  /** Đường hầm đặt bộc phá (điểm đầu → điểm cuối, x/z; cao độ lấy theo mặt đất − độ sâu). */
  tunnel: { from: Vec2; to: Vec2; depth: number; visibleFrom: number; visibleTo: number };
  flag: { x: number; z: number; raiseFrom: number; raiseTo: number };
  /** Đèn/đốm sáng ở xa trong lòng chảo (khu sở chỉ huy, sân bay) để cảnh toàn cảnh có chiều sâu. */
  farLights: Vec2[];
};
