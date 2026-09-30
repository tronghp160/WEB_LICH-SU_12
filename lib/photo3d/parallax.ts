// "Ảnh thật có chiều sâu": ảnh chụp thật + bản đồ độ sâu (ước lượng bằng Depth Anything V2, xem scripts/make-depth-maps.mjs).
// Khi người xem kéo/rê chuột, mỗi điểm ảnh lệch theo độ sâu của nó (thị sai) → cảm giác xoay nhìn vật thể 3D.
// Hàm thuần dùng chung cho shader (components/photo3d) và cho vị trí các điểm chú thích; unit test được.

/** Độ lệch tối đa (theo tỉ lệ khung ảnh) giữa lớp gần nhất và lớp xa nhất khi nghiêng hết cỡ. */
export const PARALLAX_STRENGTH = 0.045;
/** Độ sâu "đứng yên" (0 = xa nhất, 1 = gần nhất): mặt phẳng này không lệch khi nghiêng. */
export const FOCUS_DEPTH = 0.5;
/** Phóng nhẹ sẵn để mép ảnh không lộ khoảng trống khi các lớp lệch nhau. */
export const BASE_ZOOM = 1 + PARALLAX_STRENGTH;
export const ZOOM_STEPS = [1, 1.5, 2, 2.5] as const;

export type Vec2 = { x: number; y: number };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Độ nghiêng (−1…1 mỗi trục) từ vị trí con trỏ trong khung (0…1). */
export function tiltFromPointer(pointer: Vec2): Vec2 {
  return { x: clamp((pointer.x - 0.5) * 2, -1, 1), y: clamp((pointer.y - 0.5) * 2, -1, 1) };
}

/** Lắc nhẹ khi người xem chưa tương tác (t tính bằng giây) — gợi ý rằng ảnh có chiều sâu. */
export function idleSway(t: number): Vec2 {
  return { x: Math.sin(t * 0.55) * 0.65, y: Math.sin(t * 0.37 + 1) * 0.3 };
}

/** Tiến dần tới đích (làm mượt chuyển động), `rate` là phần quãng đường đi được mỗi giây. */
export function approach(current: Vec2, target: Vec2, dt: number, rate = 6): Vec2 {
  const k = 1 - Math.exp(-rate * dt);
  return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}

/** Tâm khung nhìn khi phóng to: đi theo con trỏ nhưng không ra ngoài ảnh. */
export function zoomCenter(pointer: Vec2, zoom: number): Vec2 {
  const room = 0.5 - 0.5 / (zoom * BASE_ZOOM);
  return { x: 0.5 + clamp((pointer.x - 0.5) * 2, -1, 1) * room, y: 0.5 + clamp((pointer.y - 0.5) * 2, -1, 1) * room };
}

/**
 * Vị trí trên màn hình (0…1) của một điểm trong ảnh (0…1) có độ sâu `depth`, khi ảnh đang nghiêng `tilt`,
 * phóng `zoom` quanh tâm `center`. Khớp với shader: màu tại điểm màn hình `s` lấy từ ảnh ở `center + (s − ½)/Z + o·(d − f)`.
 */
export function projectPoint(point: Vec2, depth: number, tilt: Vec2, zoom: number, center: Vec2): Vec2 {
  const z = zoom * BASE_ZOOM;
  const shift = depth - FOCUS_DEPTH;
  const content = { x: point.x - tilt.x * PARALLAX_STRENGTH * shift, y: point.y - tilt.y * PARALLAX_STRENGTH * shift };
  return { x: 0.5 + (content.x - center.x) * z, y: 0.5 + (content.y - center.y) * z };
}

/** Đường dẫn bản đồ độ sâu theo quy ước: `anh.webp` → `anh-depth.webp`. */
export function depthPathFor(src: string): string {
  return src.replace(/\.webp$/, "-depth.webp");
}
