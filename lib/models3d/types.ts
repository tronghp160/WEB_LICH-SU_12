export type Vec3 = [number, number, number];

/** Điểm chú thích gắn lên mô hình: bấm vào để đọc giải thích; `position` theo hệ tọa độ của mô hình (mét, y hướng lên). */
export type ModelHotspot = { id: string; label: string; text: string; position: Vec3 };

/** Nút thao tác riêng của mô hình (ví dụ "Mô phỏng vụ nổ"). */
export type ModelAction = { id: string; label: string };

export type ModelGroup = "hien-vat" | "di-tich" | "so-lieu" | "nhan-vat";

/** Bối cảnh ánh sáng: phòng sáng (hiện vật), ngoài trời ban ngày, ban đêm. */
export type ModelEnvironment = "studio" | "outdoor" | "night";

export type ModelSource =
  /** Dựng bằng mã (không cần file ngoài). */
  | { kind: "procedural" }
  /** Mô hình glTF/glb có sẵn (đặt trong public/models/), phải ghi rõ tác giả và giấy phép. */
  | { kind: "glb"; url: string; credit: string; licenseUrl: string };

export type ModelSpec = {
  id: string;
  group: ModelGroup;
  title: string;
  /** Một câu giới thiệu, hiện trên khung chờ và ở nút chọn. */
  summary: string;
  /** Mô tả bằng chữ (cho người dùng trình đọc màn hình và khi máy không chạy được 3D). */
  description: string;
  camera: { position: Vec3; target: Vec3; minDistance: number; maxDistance: number; maxPolar?: number };
  environment: ModelEnvironment;
  autoRotate: boolean;
  hotspots: ModelHotspot[];
  actions?: ModelAction[];
  source: ModelSource;
  /** Câu ghi chú dưới mô hình: đây là dựng minh họa, không phải bản sao chính xác. */
  note: string;
  /** Chi tiết cần đối chiếu tài liệu chính thống. */
  toVerify?: string[];
};
