// Tải ảnh độ cao Terrarium (AWS Open Data, gồm dữ liệu SRTM của NASA/USGS) phủ toàn lòng chảo Điện Biên Phủ, ghép 2×2 ô mức 12
// thành một ảnh 512×512 (≈ 35 m mỗi điểm) và lưu vào public/models/dbp-valley-dem.png cho mô hình "sa bàn" ở bài học.
// Chạy một lần: node scripts/build-valley-dem.mjs  (cần Edge/Chrome và Internet). Tọa độ ô in ra để khớp với lib/models3d/valley.ts.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ZOOM = 12;
const CENTER = { lat: 21.38, lng: 103.01 };
const n = 2 ** ZOOM;
const fx = ((CENTER.lng + 180) / 360) * n;
const fy = ((1 - Math.log(Math.tan((CENTER.lat * Math.PI) / 180) + 1 / Math.cos((CENTER.lat * Math.PI) / 180)) / Math.PI) / 2) * n;
const x0 = Math.round(fx) - 1;
const y0 = Math.round(fy) - 1;
const lng = (x) => (x / n) * 360 - 180;
const lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
console.log(`Ô mức ${ZOOM}: x ${x0}–${x0 + 1}, y ${y0}–${y0 + 1}`);
console.log(`Kinh độ ${lng(x0).toFixed(5)} → ${lng(x0 + 2).toFixed(5)}; vĩ độ ${lat(y0).toFixed(5)} (bắc) → ${lat(y0 + 2).toFixed(5)} (nam)`);

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge", headless: true });
const page = await browser.newPage();
await page.goto("about:blank");
const dataUrl = await page.evaluate(
  async ({ z, x0, y0 }) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const response = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x0 + dx}/${y0 + dy}.png`);
        if (!response.ok) throw new Error(`Ô ${x0 + dx}/${y0 + dy}: HTTP ${response.status}`);
        const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
        ctx.drawImage(bitmap, dx * 256, dy * 256);
      }
    }
    return canvas.toDataURL("image/png");
  },
  { z: ZOOM, x0, y0 },
);
await browser.close();

const out = path.resolve(import.meta.dirname, "..", "public", "models", "dbp-valley-dem.png");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
console.log(`Đã lưu ${out}`);
