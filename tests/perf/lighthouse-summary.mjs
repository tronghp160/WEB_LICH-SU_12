// Tóm tắt các báo cáo Lighthouse JSON thành bảng Markdown (điểm 4 nhóm + LCP/TBT/CLS).
// Cách dùng: node tests/perf/lighthouse-summary.mjs <thư mục chứa *-mobile.json và *-desktop.json>
// Tạo báo cáo bằng: npx lighthouse <url> [--preset=desktop] --output=json --output-path=<thư-mục>/<tên>-<mobile|desktop>.json
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Thiếu thư mục báo cáo Lighthouse.");
  process.exit(1);
}

const names = { home: "Trang chủ", timeline: "Dòng thời gian", map: "Bản đồ", event: "Chi tiết sự kiện", search: "Tra cứu" };
const score = (report, id) => Math.round((report.categories[id]?.score ?? 0) * 100);
const seconds = (report, id) => ((report.audits[id]?.numericValue ?? 0) / 1000).toFixed(2).replace(".", ",");

const header = fs.readdirSync(dir).find((f) => f.endsWith(".json"));
const meta = JSON.parse(fs.readFileSync(path.join(dir, header), "utf8"));
console.log(`Lighthouse ${meta.lighthouseVersion} · ${meta.environment?.hostUserAgent ?? ""}\n`);

for (const preset of ["mobile", "desktop"]) {
  console.log(`**${preset === "mobile" ? "Mobile (giả lập Moto G Power, 4G chậm)" : "Desktop"}**\n`);
  console.log("| Trang | Hiệu năng | Trợ năng | Thực hành tốt nhất | SEO | LCP | TBT | CLS |");
  console.log("|---|:-:|:-:|:-:|:-:|---:|---:|---:|");
  for (const [key, label] of Object.entries(names)) {
    const file = path.join(dir, `${key}-${preset}.json`);
    if (!fs.existsSync(file)) continue;
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    const cls = (report.audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3).replace(".", ",");
    const tbt = Math.round(report.audits["total-blocking-time"]?.numericValue ?? 0);
    console.log(
      `| ${label} | ${score(report, "performance")} | ${score(report, "accessibility")} | ${score(report, "best-practices")} | ${score(report, "seo")} | ${seconds(report, "largest-contentful-paint")} s | ${tbt} ms | ${cls} |`,
    );
  }
  console.log("");
}
