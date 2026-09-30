// Nhập một ảnh từ Wikimedia Commons vào kho ảnh của web (GĐ1, mục 1.2 — KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md):
//   1. gọi API Commons lấy tác giả, giấy phép, năm, trang gốc; TỪ CHỐI giấy phép không cho dùng lại;
//   2. tải ảnh gốc, nén webp 3 cỡ (400 / 1200 / 2000 px, không phóng to);
//   3. tải lên bucket `media` của Supabase (cần SUPABASE_SECRET_KEY trong .env.local);
//   4. IN RA câu SQL `insert into media_assets …` — script KHÔNG tự ghi database: gom các câu vào một file để duyệt rồi mới chạy.
//
// Cách dùng:
//   node scripts/import-commons-image.mjs --file "File:Tên ảnh.jpg" --owner su-kien:tuyen-ngon-doc-lap \
//     --alt "Mô tả ảnh cho trình đọc màn hình" [--caption "Chú thích"] [--era historical|today|illustration] \
//     [--year 1945] [--author "Tên tác giả"] [--cover] [--reenactment] [--colorized] [--focal "50% 30%"] [--name ten-file] [--dry-run]
//   --owner: su-kien:<slug> | nhan-vat:<slug> | dia-diem:<slug>
//   --dry-run: chỉ đọc thông tin và nén thử, không tải lên.
//   --preview <thư mục>: lưu thêm bản 400 px ra thư mục đó để xem trước (kiểm tra chữ thay thế có tả đúng ảnh không).

import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const USER_AGENT = "LichSuVietNam12/1.0 (do an giao duc; https://github.com/tronghp160/WEB_LICH-SU_12)";
const WIDTHS = [400, 1200, 2000];
const OWNERS = {
  "su-kien": { table: "historical_events", column: "event_id", folder: "events" },
  "nhan-vat": { table: "historical_figures", column: "figure_id", folder: "figures" },
  "dia-diem": { table: "historical_locations", column: "location_id", folder: "locations" },
};
/** Luật SHTT Việt Nam: tác phẩm nhiếp ảnh bảo hộ 75 năm kể từ khi công bố lần đầu. */
const VN_PHOTO_TERM = 75;

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    owner: { type: "string" },
    alt: { type: "string" },
    caption: { type: "string" },
    era: { type: "string", default: "historical" },
    year: { type: "string" },
    cover: { type: "boolean", default: false },
    reenactment: { type: "boolean", default: false },
    colorized: { type: "boolean", default: false },
    focal: { type: "string" },
    name: { type: "string" },
    author: { type: "string" },
    preview: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!args.file || !args.owner || !args.alt) fail("Thiếu --file, --owner hoặc --alt (xem hướng dẫn ở đầu file).");
const [ownerKind, ownerSlug] = args.owner.split(":");
const owner = OWNERS[ownerKind];
if (!owner || !ownerSlug) fail("--owner phải có dạng su-kien:<slug>, nhan-vat:<slug> hoặc dia-diem:<slug>.");
if (!["historical", "today", "illustration"].includes(args.era)) fail("--era chỉ nhận historical, today, illustration.");
if (args.focal && !/^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$/.test(args.focal)) fail('--focal có dạng "50% 30%".');

const title = args.file.startsWith("File:") ? args.file : `File:${args.file}`;

// ---------- 1. Thông tin trên Commons ----------
const api = new URL("https://commons.wikimedia.org/w/api.php");
api.search = new URLSearchParams({
  action: "query",
  format: "json",
  formatversion: "2",
  prop: "imageinfo",
  iiprop: "url|size|mime|extmetadata",
  titles: title,
}).toString();
/** API Commons có giới hạn tần suất (trả chữ thay vì JSON) → chờ rồi thử lại. */
async function fetchJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const text = await (await fetch(url, { headers: { "User-Agent": USER_AGENT } })).text();
    try {
      return JSON.parse(text);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000 + attempt * 5000));
    }
  }
  fail("API Commons liên tục từ chối (giới hạn tần suất). Thử lại sau ít phút.");
}
const info = await fetchJson(api);
const page = info?.query?.pages?.[0];
const image = page?.imageinfo?.[0];
if (!image) fail(`Không tìm thấy "${title}" trên Commons.`);

const meta = image.extmetadata ?? {};
const plain = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const license = plain(meta.LicenseShortName?.value);
const licenseUrl = meta.LicenseUrl?.value || null;
// "--author" ghi đè khi tên trên Commons không dùng được (ví dụ "Unknown author Unknown author", tên tài khoản kèm link).
const commonsArtist = plain(meta.Artist?.value).replace(/^(Unknown author\s*)+$/i, "").trim();
const artist = args.author ?? (commonsArtist || null);
const dateText = plain(meta.DateTimeOriginal?.value);
const yearFromCommons = Number(/\b(1[89]\d\d|20\d\d)\b/.exec(dateText)?.[1]) || null;
const year = args.year ? Number(args.year) : yearFromCommons;

// Chỉ nhận phạm vi công cộng / CC0 / CC BY / CC BY-SA / giấy phép dữ liệu mở của chính phủ (GODL) / "Attribution"
// (chỉ yêu cầu ghi công). Không nhận NC, ND, "fair use".
const allowed = /^(public domain|pd\b|cc0|cc[ -]by(-sa)?[ -]\d|godl\b|attribution$)/i;
if (!license || !allowed.test(license) || /\b(nc|nd)\b/i.test(license) || /fair use/i.test(license)) {
  fail(`Giấy phép "${license || "không rõ"}" không dùng được cho web (chỉ nhận PD, CC0, CC BY, CC BY-SA, GODL, Attribution).`);
}
const warnings = [];
if (/vietnam/i.test(plain(meta.UsageTerms?.value) + license + plain(meta.Copyrighted?.value)) || /PD-Vietnam/i.test(JSON.stringify(meta))) {
  if (year && new Date().getFullYear() - year < VN_PHOTO_TERM) {
    warnings.push(
      `Ảnh năm ${year} gắn nhãn phạm vi công cộng tại Việt Nam nhưng chưa đủ ${VN_PHOTO_TERM} năm bảo hộ — cân nhắc kỹ/ghi chú.`,
    );
  }
}

// ---------- 2. Tải và nén ----------
const original = Buffer.from(await (await fetch(image.url, { headers: { "User-Agent": USER_AGENT } })).arrayBuffer());
const baseName =
  args.name ??
  title
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const variants = [];
for (const width of WIDTHS) {
  const pipeline = sharp(original, { failOn: "none" }).rotate().resize({ width, withoutEnlargement: true });
  const buffer = await pipeline.webp({ quality: width >= 2000 ? 72 : 78 }).toBuffer();
  const { width: w, height: h } = await sharp(buffer).metadata();
  variants.push({ width, buffer, actualWidth: w, actualHeight: h });
}
const large = variants.at(-1);
if (args.preview) {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(args.preview, { recursive: true });
  writeFileSync(path.join(args.preview, `${ownerKind}-${ownerSlug}-${baseName}.webp`), variants[0].buffer);
}

console.error(`• ${title}`);
console.error(`  tác giả: ${artist ?? "(không ghi)"} | giấy phép: ${license} | năm: ${year ?? "?"} | gốc ${image.width}×${image.height}`);
console.error(`  cỡ: ${variants.map((v) => `${v.width}→${v.actualWidth}px ${(v.buffer.length / 1024).toFixed(0)} KB`).join(", ")}`);
for (const warning of warnings) console.error(`  ⚠ ${warning}`);

// ---------- 3. Tải lên Storage ----------
const folder = `${owner.folder}/${ownerSlug}`;
const objectPath = (width) => `${folder}/${baseName}-${width}.webp`;
let publicUrl = `(dry-run)/${objectPath(1200)}`;

if (!args["dry-run"]) {
  process.loadEnvFile(path.join(root, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) fail("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env.local.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  for (const variant of variants) {
    const { error } = await supabase.storage
      .from("media")
      .upload(objectPath(variant.width), variant.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (error) fail(`Tải lên ${objectPath(variant.width)} lỗi: ${error.message}`);
  }
  publicUrl = supabase.storage.from("media").getPublicUrl(objectPath(1200)).data.publicUrl;
  console.error(`  đã tải lên: media/${objectPath("{400,1200,2000}")}`);
}

// ---------- 4. Câu SQL để duyệt ----------
const sql = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const ownerId = `(select id from public.${owner.table} where slug = ${sql(ownerSlug)})`;
console.log(`-- ${title}${warnings.length ? `  ⚠ ${warnings.join(" ")}` : ""}
insert into public.media_assets
  (${owner.column}, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select ${ownerId}, ${sql(publicUrl)}, 'image', ${sql(args.alt)}, ${sql(args.caption ?? null)}, ${sql(args.era)}, ${year ?? "null"},
  ${sql(artist)}, ${sql(license)}, ${sql(licenseUrl)}, ${sql(image.descriptionurl)},
  ${args.reenactment}, ${args.colorized}, ${args.cover}, ${sql(args.focal ?? null)}, ${large.actualWidth}, ${large.actualHeight},
  coalesce((select max(sort_order) from public.media_assets where ${owner.column} = ${ownerId}), 0) + 1
where not exists (select 1 from public.media_assets where file_url = ${sql(publicUrl)});
`);
