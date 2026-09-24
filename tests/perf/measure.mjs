// Đo hiệu năng "nội dung chính hiển thị" (Phase 13, mục 8.5; yêu cầu phi chức năng: ≤ 3 giây với 25–35 sự kiện).
// Đo bằng Playwright + Microsoft Edge: thời gian từ lúc điều hướng tới khi PHẦN NỘI DUNG CHÍNH của trang hiện ra
// (không phải "trang tải xong"), cộng LCP và DOMContentLoaded. Lặp nhiều lần, báo trung vị và lần chậm nhất.
//
// Cách chạy (cần bản production đang chạy ở cổng 3100):
//   npm run build && npx next start -p 3100     # cửa sổ khác
//   node tests/perf/measure.mjs
// Kịch bản mạng: "Không giới hạn" và "4G chậm" (1,6 Mbps xuống, 150 ms RTT) kèm CPU chậm 4x (mô phỏng điện thoại tầm trung).
// Lưu ý: đo trên máy phát triển + database Supabase trên cloud (ap-northeast-1) → số liệu chính thức nên đo lại trên Vercel (Phase 14).
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const RUNS = Number(process.env.PERF_RUNS ?? 5);

const PAGES = [
  { name: "Trang chủ", path: "/", ready: "section[aria-labelledby=featured-heading] li a" },
  { name: "Dòng thời gian", path: "/dong-thoi-gian", ready: "ol[aria-label^='Dòng thời gian'] li li" },
  { name: "Bản đồ", path: "/ban-do", ready: ".leaflet-marker-icon" },
  { name: "Chi tiết sự kiện", path: "/su-kien/chien-dich-dien-bien-phu", ready: "article h1" },
  { name: "Tra cứu", path: "/tra-cuu", ready: "main h3" },
];

const NETWORKS = [
  { name: "Không giới hạn (localhost → Supabase cloud)", cdp: null },
  {
    name: "4G chậm (1,6 Mbps xuống, 150 ms RTT) + CPU chậm 4x",
    cdp: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 },
  },
];

// Lọc để đo lại riêng một số trang/kịch bản: PERF_ONLY="Bản đồ,Tra cứu" PERF_NET=1 (0 = không giới hạn, 1 = 4G chậm).
const ONLY = process.env.PERF_ONLY ? process.env.PERF_ONLY.split(",").map((x) => x.trim()) : null;
const NET_ONLY = process.env.PERF_NET === undefined ? null : Number(process.env.PERF_NET);

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fmt = (ms) => (ms / 1000).toFixed(2).replace(".", ",");

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge" });
const version = browser.version();
const results = [];

for (const [networkIndex, network] of NETWORKS.entries()) {
  if (NET_ONLY !== null && networkIndex !== NET_ONLY) continue;
  for (const target of PAGES) {
    if (ONLY && !ONLY.includes(target.name)) continue;
    const contentTimes = [];
    const lcpTimes = [];
    const dclTimes = [];
    for (let run = 0; run < RUNS; run++) {
      // Ngữ cảnh mới mỗi lần = bộ nhớ đệm trống (lần truy cập đầu tiên, trường hợp xấu nhất).
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      if (network.cdp) {
        const client = await context.newCDPSession(page);
        await client.send("Network.enable");
        await client.send("Network.emulateNetworkConditions", { offline: false, latency: network.cdp.latency, downloadThroughput: network.cdp.downloadThroughput, uploadThroughput: network.cdp.uploadThroughput });
        await client.send("Emulation.setCPUThrottlingRate", { rate: network.cdp.cpu });
      }
      await page.addInitScript(() => {
        window.__lcp = 0;
        new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      const start = Date.now();
      await page.goto(BASE + target.path, { waitUntil: "commit" });
      await page.locator(target.ready).first().waitFor({ state: "visible", timeout: 60_000 });
      contentTimes.push(Date.now() - start);
      await page.waitForLoadState("load");
      const nav = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0];
        return { dcl: entry.domContentLoadedEventEnd, lcp: window.__lcp };
      });
      dclTimes.push(nav.dcl);
      lcpTimes.push(nav.lcp);
      await context.close();
    }
    results.push({ network: network.name, page: target.name, median: median(contentTimes), max: Math.max(...contentTimes), lcp: median(lcpTimes), dcl: median(dclTimes) });
    if (process.env.PERF_VERBOSE) console.log(`  ${target.name} [${network.name.slice(0, 12)}]: ${contentTimes.map((t) => (t / 1000).toFixed(2)).join(", ")} s`);
  }
}
await browser.close();

console.log(`Trình duyệt: Microsoft Edge ${version} · ${RUNS} lần/ô, bộ nhớ đệm trống · viewport 390x844 · ${new Date().toLocaleString("vi-VN")}`);
for (const network of NETWORKS) {
  console.log(`\n**${network.name}**\n`);
  console.log("| Trang | Nội dung chính hiện (trung vị) | Chậm nhất | LCP (trung vị) | DOMContentLoaded (trung vị) | ≤ 3 giây |");
  console.log("|---|---:|---:|---:|---:|:-:|");
  for (const r of results.filter((x) => x.network === network.name)) {
    console.log(`| ${r.page} | ${fmt(r.median)} s | ${fmt(r.max)} s | ${fmt(r.lcp)} s | ${fmt(r.dcl)} s | ${r.max <= 3000 ? "✅" : r.median <= 3000 ? "⚠ (trung vị đạt)" : "❌"} |`);
  }
}
