// Chép file worker của MapLibre vào public/ để trình duyệt tải được (bản đồ 3D).
// MapLibre 6 tự tìm worker cạnh file của chính nó (import.meta.url); sau khi Next đóng gói thì đường dẫn đó không còn đúng,
// nên trình phát gọi setWorkerUrl("/vendor/maplibre-gl/<phiên bản>/maplibre-gl-worker.mjs"). Chạy tự động trước `dev` và `build`.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "node_modules", "maplibre-gl", "dist");
const { version } = JSON.parse(readFileSync(path.join(root, "node_modules", "maplibre-gl", "package.json"), "utf8"));
const target = path.join(root, "public", "vendor", "maplibre-gl", version);

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const from = path.join(source, file);
  if (!existsSync(from)) throw new Error(`Không thấy ${from} — đã cài maplibre-gl chưa?`);
  copyFileSync(from, path.join(target, file));
}
console.log(`maplibre-gl ${version}: đã chép worker vào public/vendor/maplibre-gl/${version}/`);
