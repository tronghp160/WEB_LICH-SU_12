// Tạo bản đồ độ sâu cho "ảnh thật có chiều sâu" (components/photo3d): ảnh xám, trắng = gần, đen = xa, rộng tối đa 512 px,
// ghi cạnh ảnh gốc với tên `<ảnh>-depth.webp`. Mô hình: Depth Anything V2 (small, giấy phép Apache-2.0) qua transformers.js.
//
// Công cụ này KHÔNG nằm trong dependencies của web (mô hình ~100 MB, chỉ chạy một lần trên máy biên soạn):
//   mkdir .depth-tool && cd .depth-tool && npm init -y && npm install @huggingface/transformers@3
//   (thư mục phải nằm ở đường dẫn không dấu — sharp trên Windows không nạp được từ đường dẫn có dấu tiếng Việt)
//   node ../scripts/make-depth-maps.mjs ../public/lessons/dien-bien-phu luu-phao-105-bao-tang phao-cao-xa-37 …
// Chạy từ trong .depth-tool để Node tìm thấy @huggingface/transformers. Sau đó điền `depthSrc`, `width`, `height`,
// `hotspots` cho ảnh trong lib/lessons/*.ts (unit test lesson-data kiểm tra file và kích thước).

import path from "node:path";
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";

const [dir, ...names] = process.argv.slice(2);
if (!dir || names.length === 0) {
  console.error("Cách dùng: node make-depth-maps.mjs <thư mục ảnh> <tên ảnh không đuôi> …");
  process.exit(1);
}

const estimator = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", { dtype: "fp32" });

for (const name of names) {
  const file = path.join(dir, `${name}.webp`);
  const png = await sharp(file).resize({ width: 1024, withoutEnlargement: true }).png().toBuffer();
  const image = await RawImage.fromBlob(new Blob([png], { type: "image/png" }));
  const { depth } = await estimator(image);
  const meta = await sharp(file).metadata();
  const width = Math.min(512, meta.width);
  // Đưa về đúng tỉ lệ ảnh gốc, làm mịn nhẹ để khi lệch không bị vỡ cạnh.
  await sharp(Buffer.from(depth.data), { raw: { width: depth.width, height: depth.height, channels: depth.channels } })
    .resize({ width, height: Math.round((width * meta.height) / meta.width), fit: "fill" })
    .blur(1.2)
    .webp({ quality: 80 })
    .toFile(path.join(dir, `${name}-depth.webp`));
  console.log(`✓ ${name}-depth.webp`);
}
