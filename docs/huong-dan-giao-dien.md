# Hướng dẫn giao diện (design system) — bản nâng cấp "SGK Lịch sử 12 số"

Quy ước cho người sửa giao diện sau này. Kế hoạch gốc: `KE_HOACH_NANG_CAP_GIAO_DIEN.md` (đã làm GĐ1–7; GĐ7 còn thiếu
chuyên đề Hiệp định Pa-ri — cần khuôn dòng thời gian đàm phán thay cho bản đồ trận đánh). **Giữ nguyên URL cũ** (quyết định 12.4 #1), nên không có redirect;
trang mới: `/muc-luc`, `/muc-luc/chu-de-N`, `/bai/[slug]`, `/kham-pha`, `/huong-dan`, `/trac-nghiem/bai/[slug]`,
`/trac-nghiem/the-ghi-nho`, API `/api/tim-kiem`.

## 1. Kiến trúc thông tin

- **Chủ đề SGK (6) → Bài SGK (17) → Mục (1, 2, 3…)** là bộ khung học. Dữ liệu tĩnh: `lib/sgk/curriculum.ts`
  (có unit test `tests/unit/curriculum.test.ts`).
- Mỗi mục gắn **sự kiện** và **chuyên đề tương tác** (`lib/lessons`, `featureSlugs`). Cách gán sự kiện (GĐ7) nằm ở bảng
  `sgk_lesson_events` — biên tập viên sửa trong trang quản trị **Bài SGK** (`/quan-tri/bai-sgk`); trang công khai đọc qua
  `getCurriculum()` (`lib/queries/sgk.ts`). Bảng chưa có hoặc trống → dùng `eventSlugs` viết trong `lib/sgk/curriculum.ts`
  (cũng là dữ liệu ban đầu: `node scripts/build-sgk-sql.mjs` → `supabase/seed-sgk.sql`). Component chạy ở trình duyệt
  (menu, tìm nhanh, gợi ý ôn lại trong trắc nghiệm) vẫn dùng khung trong code.
- Từ ngữ thống nhất: **Bài** (Bài 7), **Chuyên đề tương tác** (trang `/bai-hoc/[slug]` cũ), **Sự kiện**,
  **Tư liệu 3D**, **Ôn tập**, **Tiến độ học tập** (Hộ chiếu lịch sử là tên vui).
- Menu: 3 nhóm theo việc cần làm — `components/layout/nav.ts` là nguồn duy nhất cho header, menu điện thoại,
  thanh tab dưới, chân trang và trang `/kham-pha`. Thêm trang mới → thêm vào đây, không có "trang ẩn".

## 2. Màu

Khai báo một lần trong `app/globals.css` bằng `light-dark(sáng, tối)`; `<html data-theme>` do script đầu trang đặt
(`lib/theme.ts`), nút chọn ở `components/layout/ThemeToggle.tsx`. Không dùng `@media (prefers-color-scheme)` nữa;
biến thể `dark:` của Tailwind theo `data-theme`.

| Biến | Dùng cho |
|---|---|
| `background` / `surface` / `surface-raised` / `sunken` | 4 lớp nền: trang, thẻ, khối nổi bật (Yêu cầu cần đạt), vùng phụ (cột công cụ, chân trang) |
| `accent` (đỏ son) | **chỉ** nút chính và trạng thái đang chọn |
| `gold-deep` | chữ nhấn phụ (ngày tháng, nhãn nhỏ) |
| `info` / `note` / `warning` / `success` (+ `-bg`) | hộp `Callout`: Em có biết? / Ghi nhớ / minh họa – gần đúng / đúng |
| `--topic-*` | màu gáy 6 chủ đề; đặt `data-topic-color="son"` lên khối cha rồi dùng `var(--topic)` |

Mọi cặp chữ/nền đã kiểm ≥ 4.5:1 (đa số ≥ 5.3:1) ở cả hai giao diện. Màu không bao giờ là tín hiệu duy nhất: chủ đề
luôn có số, trạng thái luôn có biểu tượng + chữ.

## 3. Thành phần

| Thành phần | File | Ghi chú |
|---|---|---|
| `Button` / `LinkButton` | `components/ui/Button.tsx` | `primary` (mỗi màn hình **một** nút), `secondary`, `ghost`, `link`, `icon` (bắt buộc `aria-label`) |
| `Callout` | `components/ui/Callout.tsx` | `info` · `note` · `warning` · `goal` |
| `Tabs` | `components/ui/Tabs.tsx` | mẫu WAI-ARIA; **chỉ dựng tab đang mở** → dùng cho tư liệu nặng |
| `Disclosure` | `components/ui/Disclosure.tsx` | `<details>` có kiểu, không cần JS |
| `ProgressBar` | `components/ui/ProgressBar.tsx` | lấy màu `--topic` nếu có |
| `SectionNav` | `components/sgk/SectionNav.tsx` | mục lục trong bài: cột trái (desktop) / thanh "Đang đọc" (điện thoại); ghi tiến độ theo mục |
| `ChapterShell` | `components/lesson/ChapterShell.tsx` | chuyên đề tương tác: máy tính cuộn liền + mục lục chương; điện thoại **từng chương** (chương khác ẩn bằng CSS, neo `#…` tự mở đúng chương) |
| `MapLegend` | `components/battle/MapLegend.tsx` | chú giải nổi trên bản đồ diễn biến, ghim được trên máy tính |
| `Chip` | — | chỉ để **lọc** (bo 8px); không dùng chip làm nút hành động |

Lưu ý: `cn()` của dự án chỉ nối chuỗi, **không gộp class xung đột** — muốn ẩn một thành phần có sẵn `inline-flex`
thì bọc nó trong thẻ khác (`<span className="hidden xl:block">`), đừng truyền `hidden` vào `className`.

## 4. Chữ, khoảng cách, chuyển động

- Lora cho tiêu đề, Be Vietnam Pro cho chữ. Chú thích tối thiểu 13px (`text-xs` chỉ cho nhãn phụ ngắn).
- Trang Bài: lưới `[220px_1fr]` từ `lg`, `[240px_1fr_240px]` từ `xl`; mục cách nhau 56px.
- Không dùng hiệu ứng "hiện dần khi cuộn" cho nội dung chính (đã bỏ `Reveal` — gây khoảng trắng khi nhảy mục/in).
  Hero trang chủ không còn Ken Burns. Mọi chuyển động tôn trọng "giảm chuyển động".

## 5. Chuyên đề tương tác (`components/lesson`)

`LessonView` chỉ ghép các khối trong `components/lesson/sections/` (LessonHero, GoalBox, KeyDates, BattleSection,
ResultsSection, FiguresSection, ResourceSection, ReviewSection, SourcesSection) vào `ChapterShell`. Tư liệu nặng (video,
hiện vật 3D, sa bàn, di tích) nằm trong các tab của `ResourceSection` — chỉ tab đang mở được dựng. Bản đồ Leaflet chỉ
được dựng khi khung đã có kích thước (khung trong chương đang ẩn có kích thước 0 làm Leaflet tính ra tọa độ NaN), và tự
đo lại khi khung đổi cỡ.

## 6. Tiến độ học (localStorage `ls12:tien-do`)

- `sgk[slug] = { sections: { "muc-1": ISO, … }, lastSection, lastAt }` — trường thêm sau, không bắt buộc, nên dữ
  liệu cũ (con dấu, chuyên đề đã học) đọc được nguyên vẹn, không cần tăng `v`.
- Nút "Học tiếp" (trang chủ, menu) lấy bài có `lastAt` mới nhất.
- Hướng dẫn lần đầu: khóa `ls12:da-xem-huong-dan`. Giao diện: khóa `ls12:giao-dien`. Ghim chú giải: `ls12:ghim-chu-giai`.
- Trắc nghiệm theo Bài SGK lưu ở `quizzes["bai:<slug>"]`, có con dấu riêng trong Hộ chiếu.
- **Mã tiến độ** (`exportProgressCode` / `importProgressCode`): "LS12-" + base64url của JSON; nhập mã thì **gộp**
  (`mergeProgress`: điểm cao nhất, cộng lượt, dấu sớm nhất, hợp các mục đã đọc), không ghi đè.

## 7. Kiểm thử

- Unit: `curriculum.test.ts` (17 bài, slug, sự kiện tồn tại, tìm "bài 7"), `progress.test.ts` (tiến độ theo mục).
- E2E: `tests/e2e/sgk.spec.ts` (mục lục → chủ đề → bài, tiến độ, Học tiếp, menu bàn phím, tìm kiếm `/`, thanh tab
  điện thoại, sáng/tối không nháy, hướng dẫn lần đầu); `tests/e2e/ui-v2.spec.ts` (chương trên điện thoại, chú giải,
  trắc nghiệm theo bài, mã tiến độ, dòng thời gian thu gọn, lọc bản đồ theo bài, phòng tư liệu 3D, tìm nhanh nhóm theo
  loại); `tests/e2e/a11y.spec.ts` (axe-core, 10 trang × sáng/tối, không lỗi serious/critical). Cấu hình Playwright đặt
  sẵn "đã xem hướng dẫn" cho các bộ khác.
- Chưa làm: ảnh so sánh tự động (`toHaveScreenshot`) — dữ liệu thật trong database thay đổi nên ảnh mẫu sẽ lệch liên
  tục; kiểm thử với học sinh thật (mục 10.1) cần người tham gia.
