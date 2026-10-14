# Biên bản kiểm thử — Hệ thống hỗ trợ tìm hiểu Lịch sử Việt Nam lớp 12

> Phase 13 (mục 8, `KE_HOACH_DU_AN.md`). Mọi kiểm thử chạy trên **database Supabase thật** của dự án bằng các tài khoản thử
> `@test.local`; dữ liệu thử có tiền tố `zz-kiem-thu` / `ZZ KIỂM THỬ` và được dọn sạch sau mỗi lần chạy (đã kiểm tra: 0 dòng còn sót).
> Ngày lập: 24/09/2026. Cập nhật số liệu unit test: 29/09/2026 (sau khi thêm bài học tương tác, phim 3D, bản đồ 3D, mô hình 3D
> và luật chặn "TODO" khi gửi duyệt). Các nhóm kiểm thử khác giữ nguyên kết quả ngày 24/09.

## 0. Môi trường và cách chạy lại

| Mục | Giá trị |
|---|---|
| Ứng dụng | Next.js 16.3.6 (App Router, Turbopack), React 19.2, bản **production** (`npm run build` + `next start`) |
| Database | Supabase (PostgreSQL 17 + PostGIS), region `ap-northeast-1` |
| Máy đo | Windows 11, Microsoft Edge 153, Node 24; server chạy cục bộ, database trên cloud |
| Tài khoản thử | `editor@`, `reviewer@`, `admin@`, `locked@test.local` (đã có hồ sơ `staff_profiles`); mật khẩu chung KHÔNG nằm trong repo |

| Bộ kiểm thử | Lệnh | Cần |
|---|---|---|
| Unit test (Vitest) | `npm test` | — |
| Ràng buộc CSDL | dán `supabase/tests/constraints.sql` vào SQL Editor (hoặc `supabase db query --db-url … --file …`) | — (tự hoàn tác) |
| Phân quyền RLS | `TEST_PW=… node tests/rls/matrix.mjs` (và `sources.mjs`, `reviewer.mjs`, `editor-publish.mjs`) | `TEST_PW` |
| E2E Playwright | `npm run build` rồi `TEST_PW=… npm run test:e2e` | Edge/Chrome, `TEST_PW` |
| Hiệu năng | `node tests/perf/measure.mjs`; Lighthouse: `npx lighthouse <url> --output=json …` rồi `node tests/perf/lighthouse-summary.mjs <thư-mục>` | server ở cổng 3100 |

## 1. Tóm tắt kết quả

| Nhóm kiểm thử | Số ca | Đạt | Ghi chú |
|---|---:|---:|---|
| Unit test (Vitest) | 286 | 286 | 21 file (chạy lại 29/09/2026) |
| Ràng buộc CSDL — hợp lệ và không hợp lệ (mục 8.1) | 41 | 41 | gồm C1–C13 của kế hoạch |
| Ma trận phân quyền RLS (mục 8.2) | 70 ô (14 thao tác × 5 vai trò) | 70 | + kiểm tra hành vi `updated_at` (C12) |
| RLS chi tiết — `sources` (link + nguồn) | 13 | 13 | sau migration 000003 |
| RLS chi tiết — kiểm duyệt viên | 24 | 24 | sau migration 000005 (chạy 3 lần liên tiếp, đều 24/24) |
| E2E Playwright (mục 8.4) | 29 | 29 | E1–E9 + 7 ca UC13 (tạo tài khoản); xem lưu ý về mạng ở mục 5 |
| Phi chức năng (mục 8.5) | — | — | xem mục 5: đạt trợ năng; 1 điểm hiệu năng chưa đạt mục tiêu trong kịch bản mạng chậm |

## 2. Unit test (Vitest) — 286 test, 21 file

| File | Số test | Nội dung |
|---|---:|---|
| `slugify.test.ts` | 4 | bỏ dấu tiếng Việt, `đ/Đ`, ký tự đặc biệt |
| `labels.test.ts` | 4 | thu hẹp enum/CHECK, giá trị lạ |
| `timeline.test.ts` | 14 | lọc chủ đề trên URL, gom theo năm, nhảy nhanh |
| `map.test.ts` | 10 | kiểm tra bán kính (âm/0/chữ/vượt trần), khoảng cách km, chọn địa điểm cho `?su-kien=` |
| `text.test.ts` | 10 | tách đoạn, năm sinh–mất, cắt mô tả meta, thu nhỏ ảnh Commons |
| `search.test.ts` | 18 | tìm không dấu (NFC/NFD), AND nhiều từ, ký tự đặc biệt, tô sáng |
| `admin-auth.test.ts` | 10 | đường dẫn cần đăng nhập (proxy), dịch lỗi đăng nhập |
| `auth-schema.test.ts` | 6 | Zod form đăng nhập |
| `content-kinds.test.ts` | 9 | quyền sửa/gửi duyệt theo vai trò và trạng thái (phản chiếu RLS) |
| `content-validation.test.ts` | 32 | Zod sự kiện/nhân vật/địa điểm/nguồn/media, phản chiếu 4 CHECK của `historical_events`, chặn `javascript:` |
| `db-errors.test.ts` | 10 | dịch lỗi Postgres sang tiếng Việt (23505/23514/42501/P0001…), không lộ chi tiết nội bộ |
| `readiness.test.ts` | 11 | điều kiện gửi duyệt (bắt buộc / khuyến nghị), chặn ghi chú nội bộ "TODO" lọt ra trang công khai |
| `review.test.ts` | 18 | luật chuyển trạng thái kiểm duyệt khớp policy RLS, lý do bắt buộc |
| `staff-rules.test.ts` | 12 | không tự khóa mình, không khóa admin cuối cùng, Zod tạo nhân sự |
| `admin-content-rules.test.ts` | 8 | ưu tiên ẩn hơn xóa |
| `operations.test.ts` | 8 | tóm tắt vận hành: lỗi kiểm tra ⇒ "chưa xác định", không kết luận bình thường |
| `lesson-data.test.ts` | 12 | kịch bản bản đồ Điện Biên Phủ (7 bước đúng thứ tự SGK, tọa độ trong lòng chảo, cứ điểm đã diệt không "sống lại"); ảnh bài học có alt, ghi công/giấy phép, link gốc, file ≤ 250 KB; video YouTube hợp lệ |
| `battle-animation.test.ts` | 20 | hoạt cảnh bản đồ diễn biến: hàm làm mượt, nội suy tọa độ, khung hình giữa hai bước |
| `cinema.test.ts` | 39 | phim 3D đồi A1: số ngẫu nhiên tất định, giải mã địa hình thật, đồi A1 và chiến hào đúng độ cao/độ sâu, dòng thời gian cảnh |
| `mapfilm.test.ts` | 20 | bản đồ 3D "như phim": phép chiếu Mercator, camera liên tục không nhảy, mỗi bước 2D có đúng một cảnh 3D |
| `models3d.test.ts` | 11 | mô hình 3D: id/chú thích/camera hợp lệ, mô hình `glb` phải ghi tác giả và giấy phép, tượng nhân vật ghi rõ là cách điệu |

> Kế hoạch (8.3) có ghi "hàm format ngày theo `date_precision`": dự án hiển thị trực tiếp `date_text` do biên tập viên nhập
> và gắn nhãn `date_precision`, nên không có hàm này để kiểm thử. Đã kiểm thử phần tương đương: nhãn độ chính xác (`labels.test.ts`).

## 3. Ràng buộc cơ sở dữ liệu (mục 8.1) — 41/41 ca đạt

File: `supabase/tests/constraints.sql` — một khối `DO` tự hoàn tác (cuối cùng `raise exception` mang báo cáo nên Postgres rollback toàn bộ);
mỗi ca có trường hợp **không hợp lệ** (kỳ vọng đúng mã SQLSTATE) và **hợp lệ** (phải chạy được).

| Ca (kế hoạch) | Nội dung | Kết quả |
|---|---|---|
| C1 (+C1v) | `end_year < start_year` → lỗi CHECK 23514; `end_year ≥ start_year` hợp lệ | ✅ |
| C2 (+C2b, C2c, C2v) | năm của `start_date` khác `start_year`; `end_date` trước `start_date`; năm `end_date` khác `end_year` → 23514; ngày khớp năm hợp lệ | ✅ |
| C3 (+C3v) | `date_precision = 'abc'` → 23514; `'disputed'` hợp lệ | ✅ |
| C4 (+C4b) | chỉ có latitude hoặc chỉ có longitude → 23514 | ✅ |
| C5 (+C5b, C5c, C5v) | latitude = 100, longitude = 181, `accuracy_level` lạ → 23514; tọa độ hợp lệ | ✅ |
| C6 (+C6b) | có tọa độ ⇒ `geom` tự sinh khác null; không có tọa độ ⇒ null | ✅ |
| C7 (+C7b) | trùng slug sự kiện / trùng tên chủ đề → UNIQUE 23505 | ✅ |
| C8 (+C8v) | 2 địa điểm chính cho 1 sự kiện → partial UNIQUE 23505; địa điểm phụ hợp lệ | ✅ |
| C9 (+C9b, C9v) | `event_figures` trỏ nhân vật không tồn tại; sự kiện trỏ chủ đề không tồn tại → khóa ngoại 23503; liên kết đúng hợp lệ | ✅ |
| C10 (+C10b) | xóa sự kiện ⇒ liên kết + ảnh xóa theo; nhân vật/địa điểm/nguồn còn nguyên | ✅ |
| C11 | xóa nguồn đang được ảnh tham chiếu ⇒ ảnh còn, `source_id = null` | ✅ |
| C12 | trigger `updated_at` tồn tại (BEFORE UPDATE) — và hành vi thật `updated_at` đổi (kiểm bằng API ở mục 4, hai giao dịch riêng) | ✅ |
| C13 (+C13b/c/d, C13v) | hàm bán kính: âm, 0, vượt 2.000.000 m, vĩ độ tâm ngoài khoảng → lỗi; tham số đúng hợp lệ | ✅ |
| Bổ sung N1–N5v | thiếu `topic_id` (23502), `workflow_status` lạ (22P02), nhân vật mất trước khi sinh, `source_type`/`media_type` lạ | ✅ |
| G4, G4b | trigger: không công bố/chèn thẳng sự kiện `published` khi chưa có nguồn → P0001 | ✅ |

## 4. Phân quyền RLS (mục 8.2)

### 4.1. Ma trận (chạy thật từng ô bằng phiên của vai trò) — 70/70 ô khớp kỳ vọng

| Thao tác | Khách | Editor | Reviewer | Admin | Editor bị khóa |
|---|:-:|:-:|:-:|:-:|:-:|
| Đọc bản `published` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đọc bản `draft` | ❌ | ✅ | ✅ | ✅ | ❌ |
| Tạo sự kiện `draft` | ❌ | ✅ | ❌ | ✅ | ❌ |
| Tạo sự kiện `published` trực tiếp | ❌ | ❌ | ❌ | ❌ | ❌ |
| `draft` → `pending_review` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `pending_review` → `published` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `pending_review` → `needs_revision` | ❌ | ❌ | ✅ | ✅ | ❌ |
| Sửa NỘI DUNG bản `published` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Sửa nội dung bản `draft` | ❌ | ✅ | ❌ | ✅ | ❌ |
| Đọc `staff_profiles` của người khác | ❌ | ❌ | ❌ | ✅ | ❌ |
| Sửa `role` trong `staff_profiles` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Thêm `sources` (nguồn mới) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ghi bảng liên kết của sự kiện `draft` | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ghi bảng liên kết của sự kiện `published` | ❌ | ❌ | ✅ | ✅ | ❌ |

Chỗ khác với bảng mẫu trong kế hoạch là **chủ ý** (đã siết thêm sau khi kiểm chứng lỗ hổng):
- *Ghi bảng liên kết của sự kiện đã công bố*: Editor ❌ (kế hoạch mẫu ghi ✅) — migration `20260925000002`.
- *Sửa nội dung bản đã công bố*: Reviewer ❌ — trigger G5 (migration `20260925000004`).
- *Tạo sự kiện `published` trực tiếp*: Admin ❌ do trigger G4 (published cần ≥ 1 nguồn, mà nguồn cần `event_id` đã tồn tại) — luôn phải tạo draft → gắn nguồn → công bố.

Hành vi `updated_at` (C12): cập nhật sự kiện ở giao dịch riêng → `updated_at` mới hơn giá trị cũ — **đạt**.

### 4.2. Kiểm thử RLS chuyên sâu

| Kịch bản | Kết quả | Nội dung |
|---|---|---|
| `tests/rls/sources.mjs` | 13/13 | editor chỉ sửa/xóa nguồn chưa gắn sự kiện đã khóa (kể cả gắn qua ảnh); reviewer/admin giữ nguyên; liên kết: editor bị chặn ở sự kiện published, đổi `event_id` sang sự kiện published bị chặn |
| `tests/rls/reviewer.mjs` | 24/24 | chuyển trạng thái hợp lệ/không hợp lệ, không tạo/sửa/xóa nội dung; gồm công bố/ẩn địa điểm CÓ tọa độ (sau migration 000005) |
| `tests/rls/editor-publish.mjs` | đạt | editor không tự công bố/ẩn dù bản nháp đã đủ nguồn (chỉ RLS quyết định, trigger G4 không che); reviewer không tạo mới được |

## 5. Kiểm thử E2E (mục 8.4) — 29 ca

Bộ Playwright: `tests/e2e/public.spec.ts` (18 ca), `tests/e2e/staff.spec.ts` (4 ca, tuần tự) và `tests/e2e/staff-create.spec.ts` (7 ca UC13, tuần tự; cần `SUPABASE_SECRET_KEY`).

**Lưu ý về độ ổn định:** khi chạy riêng, bộ UC13 đạt 7/7. Khi chạy nhiều lần, có lúc một ca lỗi vì
mạng từ máy phát triển tới Supabase chập chờn (đo bằng `curl` tới `/auth/v1/health`: 0,4–15 s, có yêu cầu rớt hẳn; gọi `listUsers` song song 30 lần
có 1 lần `AuthRetryableFetchError: fetch failed`). Khi đó trang Nhân sự khóa form và hiện cảnh báo đúng thiết kế; máy chủ thử lại một lần, test tải lại trang
tối đa 4 lần. Lỗi thuộc môi trường mạng, không phải logic ứng dụng.

| # | Luồng | Kết quả |
|---|---|---|
| E1 | Trang chủ → chủ đề → sự kiện → nhân vật → quay lại (+ địa điểm) | ✅ |
| E2 | Timeline → lọc chủ đề (URL đổi, số sự kiện giảm) → "Xem trên bản đồ" → popup mở | ✅ |
| E3 | Bản đồ → bấm marker → popup → mở sự kiện | ✅ |
| E4 | Tìm "dien bien phu" và "Điện Biên Phủ" đều ra kết quả, có tô sáng; 7 chuỗi ký tự đặc biệt không lỗi | ✅ |
| E5 | Editor tạo sự kiện (slug tự sinh) → gắn nguồn → gửi duyệt; **không có nút Công bố** | ✅ |
| E6 | Reviewer → hàng đợi → trả sửa: **thiếu lý do bị chặn**, có lý do thì hoàn tất | ✅ |
| E7 | Editor thấy lý do, sửa, gửi lại → Reviewer công bố → xuất hiện ở chi tiết, dòng thời gian, tra cứu (trước đó khách nhận 404) | ✅ |
| E8 | Admin khóa editor → editor bị chuyển sang "Tài khoản đã bị khóa" ở lần thao tác kế; đăng nhập lại cũng bị từ chối; mở khóa trả lại | ✅ |
| E9 | E1–E3 ở **360 / 768 / 1280 px**, không tràn ngang; chụp ảnh timeline, bản đồ, chi tiết | ✅ |

Ngoài ra (chạy tay bằng script, đã đạt ở thời điểm nghiệm thu từng Phase và lưu trong repo): `tests/rls/phase11-e2e.mjs` (kiểm duyệt đầy đủ + xử lý đồng thời hai tab) và `tests/rls/phase12-e2e.mjs` (nhân sự, quản trị nội dung, vận hành).

## 6. Phi chức năng (mục 8.5)

### 6.1. Responsive (360 / 768 / 1280 px)

Không có tràn ngang ở timeline, bản đồ, trang chi tiết (kiểm tự động trong E9). Ảnh chụp trong `docs/screenshots/`:
`phase13-timeline-{360,768,1280}.png`, `phase13-ban-do-{360,768,1280}.png`, `phase13-chi-tiet-{360,768,1280}.png`.

### 6.2. Hiệu năng — "nội dung chính hiển thị ≤ 3 giây"

Trình duyệt: Microsoft Edge 153.0.4234.48 · 5 lần/ô, bộ nhớ đệm trống · viewport 390x844 · 21:01:37 24/9/2026

**Không giới hạn (localhost → Supabase cloud)**

| Trang | Nội dung chính hiện (trung vị) | Chậm nhất | LCP (trung vị) | DOMContentLoaded (trung vị) | ≤ 3 giây |
|---|---:|---:|---:|---:|:-:|
| Trang chủ | 0,90 s | 1,41 s | 0,17 s | 0,42 s | ✅ |
| Dòng thời gian | 0,90 s | 0,93 s | 0,14 s | 0,45 s | ✅ |
| Bản đồ | 0,92 s | 2,95 s | 0,70 s | 0,43 s | ✅ |
| Chi tiết sự kiện | 0,52 s | 1,35 s | 0,00 s | 0,50 s | ✅ |
| Tra cứu | 0,91 s | 0,97 s | 0,14 s | 0,43 s | ✅ |

**4G chậm (1,6 Mbps xuống, 150 ms RTT) + CPU chậm 4x**

| Trang | Nội dung chính hiện (trung vị) | Chậm nhất | LCP (trung vị) | DOMContentLoaded (trung vị) | ≤ 3 giây |
|---|---:|---:|---:|---:|:-:|
| Trang chủ | 1,41 s | 1,73 s | 1,28 s | 0,71 s | ✅ |
| Dòng thời gian | 1,44 s | 1,70 s | 1,32 s | 0,88 s | ✅ |
| Bản đồ | 3,38 s | 3,78 s | 1,04 s | 0,86 s | ❌ |
| Chi tiết sự kiện | 0,64 s | 1,25 s | 1,39 s | 0,83 s | ✅ |
| Tra cứu | 1,54 s | 7,91 s | 1,30 s | 0,92 s | ⚠ (trung vị đạt) |

Đo lại riêng hai ô đáng chú ý với **10 lần/ô** (4G chậm + CPU 4x): Bản đồ 3,23–3,73 s (trung vị 3,33 s, luôn hơi vượt 3 s);
Tra cứu 1,29–1,72 s (trung vị 1,54 s) — lần 7,9 s ở bảng trên là nhiễu ngẫu nhiên. Thử hai cách cải thiện bản đồ (`preconnect`
tới máy chủ ô OSM, tải sớm chunk Leaflet) đều **không cải thiện đo được** (3,33 → 3,40 s) nên không giữ lại.

**Nhận xét.** Trên mạng không giới hạn, mọi trang hiện nội dung chính trong khoảng 0,5–0,9 s. Trong kịch bản khắc nghiệt (4G chậm + CPU chậm 4x) các trang đều
≤ 1,7 s **trừ Bản đồ (≈ 3,3 s, ổn định qua 10 lần đo)** vì phải nạp Leaflet rồi mới vẽ ô bản đồ; một lần đo Tra cứu 7,9 s là nhiễu ngẫu nhiên (10 lần đo lại đều 1,3–1,7 s).
Số liệu chỉ có **10 sự kiện đã công bố** (kế hoạch: 25–35) — cần đo lại khi bổ sung đủ dữ liệu và trên bản triển khai Vercel (Phase 14).

### 6.3. Lighthouse (bản production cục bộ, Edge 153, Lighthouse 13.5)

Lighthouse 13.5.0 · Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0

**Mobile (giả lập Moto G Power, 4G chậm)**

| Trang | Hiệu năng | Trợ năng | Thực hành tốt nhất | SEO | LCP | TBT | CLS |
|---|:-:|:-:|:-:|:-:|---:|---:|---:|
| Trang chủ | 91 | 100 | 100 | 100 | 3,38 s | 71 ms | 0,000 |
| Dòng thời gian | 94 | 100 | 100 | 100 | 2,89 s | 122 ms | 0,000 |
| Bản đồ | 74 | 100 | 96 | 100 | 5,72 s | 179 ms | 0,000 |
| Chi tiết sự kiện | 91 | 100 | 77 | 100 | 3,48 s | 50 ms | 0,000 |
| Tra cứu | 95 | 100 | 100 | 100 | 2,87 s | 68 ms | 0,000 |

**Desktop**

| Trang | Hiệu năng | Trợ năng | Thực hành tốt nhất | SEO | LCP | TBT | CLS |
|---|:-:|:-:|:-:|:-:|---:|---:|---:|
| Trang chủ | 100 | 100 | 100 | 100 | 0,76 s | 0 ms | 0,000 |
| Dòng thời gian | 100 | 100 | 100 | 100 | 0,68 s | 0 ms | 0,000 |
| Bản đồ | 95 | 100 | 100 | 100 | 1,39 s | 0 ms | 0,000 |
| Chi tiết sự kiện | 95 | 100 | 77 | 100 | 1,41 s | 0 ms | 0,000 |
| Tra cứu | 98 | 100 | 100 | 100 | 0,67 s | 0 ms | 0,080 |

**Tối ưu đã áp dụng (đo trước/sau bằng Lighthouse):**

| Trang | Thay đổi | Trước | Sau |
|---|---|---|---|
| Chi tiết sự kiện | truy vấn "chi tiết sự kiện" và "danh sách sự kiện trước/sau" chạy **song song** thay vì tuần tự | thời gian phản hồi tài liệu gốc 2,97 s; Hiệu năng mobile 85, desktop 89 | **0,62 s**; mobile **91**, desktop **95** |
| Bản đồ | thử `preconnect` + tải sớm chunk Leaflet | mobile 76, LCP 6,1 s | không cải thiện → hoàn nguyên (mobile 74, LCP 5,7 s nằm trong nhiễu) |

Nguyên nhân bản đồ chậm trên mobile: phân rã LCP cho thấy **độ trễ tải tài nguyên ≈ 2,4 s** — ô bản đồ (phần tử LCP) chỉ được yêu cầu sau khi chuỗi JS
(trang → `MapExplorer` → Leaflet) nạp và chạy xong dưới giả lập CPU chậm 4x. Desktop: 95.

**Ghi chú điểm "Thực hành tốt nhất" 77 ở trang chi tiết:** do ảnh Wikimedia Commons (máy chủ ngoài) đặt cookie bên thứ ba; khắc phục bằng cách
lưu ảnh vào bucket `media` của dự án. Các trang không có ảnh ngoài đạt 96–100.

Mục tiêu Phase 14 (mục tiêu, không bắt buộc): Hiệu năng ≥ 80, Trợ năng ≥ 90. **Trợ năng đạt 100 ở mọi trang (10/10 lượt đo).** Hiệu năng mobile ≥ 80 ở **4/5 trang**; **Bản đồ mobile 74 chưa đạt mục tiêu** (desktop 95) — ghi nhận là hạn chế, cần đo lại trên Vercel.

### 6.4. Toàn vẹn dữ liệu (truy vấn chỉ-đọc trên database thật)

| Kiểm tra | Kết quả |
|---|---|
| Sự kiện đã công bố | 10 |
| … thiếu nguồn | **0** (100% có ≥ 1 nguồn) |
| … thiếu địa điểm chính | **0** |
| Địa điểm đã công bố / thiếu tọa độ | 11 / **0** |
| Ảnh / thiếu chữ thay thế (alt) | 2 / **0** |

Trang Vận hành (`/quan-tri/van-hanh`) thực hiện lại các kiểm tra này và **phát hiện đúng** dữ liệu cố ý làm sai (sự kiện published bị gỡ nguồn, địa điểm thiếu tọa độ, ảnh thiếu alt, sự kiện thuộc chủ đề nháp).

### 6.5. Bảo mật và dễ dùng

- Người dùng không ghi được và không đọc được bản ghi chưa công bố: ma trận mục 4.1 (cả 3 vai trò, tài khoản `active` và `locked`).
- Khóa bí mật (đã điền thật vào `.env.local`, build lại rồi quét): `.next/static` — thứ duy nhất được phục vụ cho trình duyệt — **0 file** chứa giá trị khóa,
  tên biến `SUPABASE_SECRET_KEY`/`SERVICE_ROLE`, hay chuỗi có dạng khóa thật; chỉ `lib/actions/staff.ts` và `lib/queries/staff.ts` import `lib/supabase/admin`
  (`import "server-only"`), không file nào là `"use client"`. Chuỗi `sb_secret_` tìm thấy trong bundle là phép kiểm `startsWith("sb_secret_")` của chính thư viện Supabase, không phải khóa.
  Quét toàn bộ `.next` chỉ thêm 1 kết quả: bộ đệm Turbopack `.next/cache/turbopack/*.sst` (không được phục vụ, nằm trong `.gitignore`).
- UC13 tạo tài khoản (E2E thật): admin tạo editor mới qua form → người đó đăng nhập được ngay (không cần xác nhận email), chỉ thấy "Tổng quan", "Nội dung",
  bị chuyển về "không có quyền" ở kiểm duyệt/nhân sự/vận hành, không tự nâng quyền được, và bị khóa tại lần thao tác kế sau khi admin khóa. Mật khẩu tạm không nằm trong
  thông báo và server không trả lại. Tài khoản thử `editor.moi.e2e@test.local` tự xóa ở cuối.
- Khu nội bộ có `noindex, nofollow`; đường dẫn `/quan-tri/*` chưa đăng nhập bị chuyển về trang đăng nhập (kể cả viết hoa / dấu `/` cuối).
- Mọi lỗi hiển thị tiếng Việt; mọi danh sách rỗng có trạng thái trống; `alt_text` bắt buộc khi thêm ảnh; ô nhập có nhãn và `aria-describedby` cho lỗi.
- Mốc gần đúng/tranh luận hiển thị `date_precision`; tọa độ ước lượng hiển thị `accuracy_level` (marker phân biệt ghim đặc / ghim viền / vòng tròn mờ).

## 7. Lỗi tìm thấy trong quá trình kiểm thử và cách xử lý

| # | Lỗi | Phát hiện bởi | Xử lý |
|---|---|---|---|
| 1 | Form báo lỗi làm **mất lựa chọn của ô `<select>`** (React chỉ áp `defaultValue` lúc dựng lần đầu) | E2E Phase 10 | `key` theo giá trị đã nhập cho mọi ô chọn |
| 2 | Lưu nguồn / thêm ảnh xong, danh sách ảnh và checklist gửi duyệt **không tự cập nhật** | E2E Phase 10 | `revalidatePath` sau lưu/thêm/sửa/xóa |
| 3 | Trùng slug ra thông báo chung thay vì "Đường dẫn đã tồn tại" (PostgREST không trả `details`) | E2E Phase 10 | nhận diện cột UNIQUE theo tên ràng buộc + test |
| 4 | Editor **ghi được liên kết/ảnh của sự kiện đã công bố** qua API | kiểm thử RLS | migration `20260925000002` (đã chạy, 70/70) |
| 5 | Editor sửa/xóa được **nguồn** của sự kiện đã công bố; xóa nguồn làm ảnh mất nguồn | kiểm thử RLS | migration `20260925000003` (đã chạy, 13/13) |
| 6 | Reviewer **sửa được nội dung bản đã công bố** qua API (G5) | kiểm thử RLS | migration `20260925000004` (đã chạy) |
| 7 | **Migration G5 chặn nhầm reviewer công bố/ẩn địa điểm có tọa độ** (cột sinh tự động `geom` bị coi là "đã sửa nội dung") — lỗi do chính migration 000004 | chạy lại e2e Phase 11 sau G5 | migration sửa `20260925000005` (**đã chạy**; `reviewer.mjs` 24/24, `phase11-e2e.mjs` đạt trọn vẹn) |
| 8 | Sau khi bấm "Ẩn", nút biến mất kéo theo thông báo thành công (quản trị nội dung) | e2e Phase 12 | thông báo đưa lên cấp khung |
| 9 | Hiệu năng: trang chi tiết truy vấn tuần tự; ô bản đồ OSM phát hiện muộn | Lighthouse | truy vấn song song + `preconnect` tới máy chủ ô (xem 6.3) |

## 8. Hạn chế và việc còn lại

1. Bộ E2E phụ thuộc mạng tới Supabase: khi mạng chập chờn, một số ca có thể lỗi ngẫu nhiên (xem mục 5); nên chạy lại trên mạng ổn định/CI.
2. Tài khoản Auth của UC13 do test tạo ra được xóa bằng khóa bí mật ở máy chạy test; khóa này không bao giờ vào Git hay bundle.
3. **Hiệu năng** đo trên máy phát triển với 10 sự kiện; cần đo lại trên Vercel và với 25–35 sự kiện (Phase 14). Bản đồ vượt 3 s trong kịch bản 4G chậm + CPU 4x.
4. **Trang chi tiết có ảnh Wikimedia**: điểm "Thực hành tốt nhất" thấp hơn (cookie bên thứ ba do máy chủ ảnh đặt). Khắc phục triệt để bằng cách tải ảnh lên bucket `media` của dự án.
5. Reviewer vẫn có quyền ghi các bảng liên kết và `sources` (giữ nguyên theo yêu cầu); nếu muốn nghiêm hơn cần một migration riêng.
6. Đổi mật khẩu hoặc **xóa 4 tài khoản thử** trước khi công khai bản triển khai.

## 10. Nâng cấp giao diện "SGK Lịch sử 12 số" (01 – 02/10/2026)

Theo `KE_HOACH_NANG_CAP_GIAO_DIEN.md`, GĐ1–7 (giữ URL cũ nên không có redirect; GĐ7 chưa làm chuyên đề Hiệp định Pa-ri).
GĐ7 thêm: bảng `sgk_lesson_events` + trang quản trị "Bài SGK" (migration CHƯA chạy — web tự dùng khung trong code), 8 sự kiện
nháp cho các bài còn trống, chuyên đề Tết Mậu Thân 1968 và Chiến dịch Hồ Chí Minh 1975 (unit test kịch bản bản đồ, ảnh, video). Quy ước giao diện: `docs/huong-dan-giao-dien.md`.
Ảnh chụp sau nâng cấp (1280 / 390px, sáng / tối): `docs/screenshots/ui-v2/`.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **434/434** đạt, 28 file (sau GĐ7) | thêm `curriculum.test.ts` (khung 17 bài, tìm "bài 7", trắc nghiệm theo bài, ôn lại đúng mục, tìm nhanh, danh mục chuyên đề) và các ca tiến độ theo mục, mã tiến độ, gộp hai máy trong `progress.test.ts` |
| Lint, kiểu (tsc) | sạch | |
| E2E đầy đủ, bản production (lần 2) | **120 đạt**, 3 hỏng, 11 bỏ qua / 134 | 11 bỏ qua: bộ quản trị cần `TEST_PW`. 3 hỏng đều do test: 2 ca chờ bản đồ ở 360/768px (chuyên đề giờ hiện từng chương trên màn hình hẹp → mở bằng `#dien-bien`), 1 ca nhấn phím `/` trước khi trang chạy JS. Đã sửa test; chạy lại riêng các ca liên quan: 8/8 đạt |
| E2E đầy đủ (lần 3) | 95 đạt, 4 hỏng, 24 không chạy / 134 | máy hết bộ nhớ giữa chừng — 4 ca 3D sập tiến trình chạy test (0xC0000142), không phải lỗi kiểm tra |
| **E2E đầy đủ (lần 4, sau GĐ7, build sạch)** | **122 đạt**, 1 hỏng, 11 bỏ qua / 134 | ca hỏng: `photo3d.spec.ts` "bấm Xem ảnh 3D…" — nút "Phóng to" chưa đứng yên khi WebGL phần mềm (SwiftShader) chậm sau 10 phút chạy liên tục; **chạy lại riêng `photo3d.spec.ts`: 7/7 đạt** → ca chập chờn, không phải lỗi giao diện |
| Trợ năng axe-core (`a11y.spec.ts`) | 20/20 đạt | 10 trang × sáng/tối, không lỗi serious/critical (đã sửa: màu nhấn ở giao diện tối #ea5a50 → #f07a70, tương phản 4,4 → 5,6:1) |

**Lighthouse 13.5** (bản production cục bộ, Chrome headless; mobile = giả lập Moto G Power, 4G chậm):

| Trang | Mobile: Hiệu năng / Trợ năng / BP / SEO | LCP mobile | CLS | Desktop: Hiệu năng / Trợ năng | JS tải (KB, nén) |
|---|---|---:|---:|---|---:|
| Trang chủ | 85 / 100 / 100 / 100 | 4,08 s | 0 | 96 / 100 | 258 |
| Mục lục | 88 / 100 / 100 / 100 | 3,78 s | 0 | 100 / 100 | 253 |
| Bài 7 | 87 / 100 / 100 / 100 | 3,95 s | 0 | 99 / 100 | 257 |
| Chuyên đề Điện Biên Phủ | 82 / 100 / 100 / 100 | 4,69 s | 0 | 99 / 100 | 289 |

So với ngân sách mục 8.4 của kế hoạch: **trợ năng 100 và CLS 0 đạt; hiệu năng mobile ≥ 85 đạt 3/4 trang** (chuyên đề 82);
**chưa đạt** LCP mobile ≤ 2,5 s và JS ≤ 170 KB (phần lớn là khung Next.js/React dùng chung). Trong lúc đo đã sửa: hộp hướng
dẫn lần đầu gây CLS 0,43 (đổi sang `transform`), menu kéo toàn bộ dữ liệu chuyên đề vào mọi trang (tách `lib/lessons/catalog.ts`,
giảm ~25–30 KB mỗi trang), tên nút tìm kiếm khác chữ hiển thị, vùng bấm nhỏ ở cột công cụ.

Chiều cao trang chuyên đề Điện Biên Phủ: điện thoại ≈ 13.000 px → 3.600 px mỗi chương (chương 1), máy tính ≈ 9.400 → 7.000 px.

**Chưa làm:** ảnh so sánh tự động (`toHaveScreenshot`) vì dữ liệu thật thay đổi; kiểm thử với học sinh thật (mục 10.1 của kế
hoạch) cần người tham gia.

## 9. Cơ sở dữ liệu thực tế (cho Chương 2 của báo cáo)

- 10 bảng trong schema `public`, **cả 10 bật RLS**; PostGIS trong schema `extensions`; 8 trigger nghiệp vụ trong `public`.
- **Số policy thực tế: 48** (`public`) + 2 (`storage.objects`). Lúc mới tạo là 36; tăng 12 nhờ các migration siết quyền:
  bảng liên kết (4 bảng × 2 policy thêm) và bảng `sources` (+4). Báo cáo mẫu ghi 49 — không dùng.
- Migration đã chạy: `20260924000001–3` (bảng, trigger/index/hàm, RLS), `20260925000000` (toàn vẹn nghiệp vụ G1/G3/G4),
  `20260925000001` (bucket `media`), `20260925000002` (RLS bảng liên kết), `20260925000003` (RLS `sources`), `20260925000004` (G5).
  `20260925000005` (sửa G5 cho cột `geom`) — đã chạy ngày 2026-09-24. Không còn migration chờ chạy.

## 11. Thanh toán, luyện thi và hoàn thiện A1 + A3 (14/10/2026)

Phạm vi: luyện thi trả phí, thanh toán (cổng giả lập + payOS), ủng hộ, quản trị đơn hàng; cùng các việc T1, T3, T4, T5, T7 của
`docs/ke-hoach-tai-khoan.md`. Migration `20261017000000_late_payment.sql` đã chạy trên database thật ngày 14/10/2026
(kiểm tra chỉ-đọc: `admin_resolve_late_payment` trả `not_found` với mã đơn không tồn tại, mô tả sản phẩm đã đổi).

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **505/505** đạt, 35 file | thêm `client-ip.test.ts` (9 ca: chỉ tin header IP trên Vercel hoặc khi `TRUST_PROXY=1`), 5 ca mô tả gói theo số đề thật, chuyển trạng thái `cancelled → paid` |
| Lint, kiểu (tsc), `npm run build` | sạch | |
| Ràng buộc CSDL thanh toán `supabase/tests/payments.sql` | 44/44 | chạy thử trên PostgreSQL nhúng (PGlite) trước khi trình migration |
| Tiền về sau khi hủy `supabase/tests/late_payment.sql` (L1–L11) | 11/11 | như trên; lần chạy thử bắt được lỗi so sánh NULL trong trigger (cờ chưa đặt → không chặn) — đã sửa trước khi chạy thật |
| **E2E thanh toán** (`payments.spec.ts` + `payments-admin.spec.ts`, bản production, DB thật) | **20/20** đạt (1,8 phút) | gồm 2 ca mới: lời giới thiệu gói đúng số đề (T1); tiền về sau khi đơn đã hủy → quản trị viên xác nhận → cấp mã, người mua thấy mã (T5) |
| **Ma trận phân quyền thanh toán** (`tests/rls/payments.mjs`, T4) | **21/21** thao tác, **105/105** ô | 5 vai trò: Khách, Editor, Reviewer, Admin, Editor bị khóa |

Ma trận phân quyền thanh toán (chạy thật từng ô bằng phiên của vai trò):

| Thao tác | Khách | Editor | Reviewer | Admin | Editor bị khóa |
|---|:-:|:-:|:-:|:-:|:-:|
| Đọc `orders`, `payment_events`, `licenses`, `license_activations` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Đọc `rate_limit_hits` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Đọc câu hỏi `exam_questions` | ❌ | ✅ | ✅ | ✅ | ❌ |
| Đọc sản phẩm đang bán, đề đã công bố, Bức tường cảm ơn | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo đơn, sửa đơn → paid, tạo mã, thêm thiết bị, ghi `payment_events` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sửa sản phẩm | ❌ | ❌ | ❌ | ✅ | ❌ |
| Gọi `mark_order_paid`, `activate_license`, `get_exam_set`, `expire_stale_orders`, `consume_rate_limit`, `admin_resolve_late_payment` | ❌ | ❌ | ❌ | ❌ | ❌ |

- Nhân sự đang hoạt động đọc được `exam_questions` để soạn / duyệt đề (policy `staff_read_all`); khách chỉ nhận câu hỏi qua
  `get_exam_set` do server gọi bằng khóa bí mật sau khi kiểm tra mã kích hoạt.
- Mọi thao tác ghi đơn / mã / nhật ký đi qua server (service_role); không vai trò đăng nhập nào ghi trực tiếp được.

**Chưa làm:** A2 (chạy payOS thật trên Vercel với giao dịch tiền thật) và phần B (tài khoản học sinh) của kế hoạch.

## 12. Tài khoản học sinh — giai đoạn B1 + B2 (14/10/2026)

Theo `docs/ke-hoach-tai-khoan.md`. Quyết định đã chốt: Q1 (a) nhân sự đăng nhập Google vẫn vào được khu quản trị; Q3 (a)
không bắt đăng nhập khi mua gói; Q4 (a) mua tên miền riêng cho SMTP. Migration `20261020000000_learner_accounts.sql` đã chạy
trên database thật ngày 14/10/2026.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **550/550** đạt, 36 file | thêm `account.test.ts` (45 ca): `safeNext` (`//evil.com`, `/\evil`, `/%2F%2Fevil`, URL tuyệt đối, `javascript:`, xuống dòng, quá dài, `/auth/*`, URL cùng gốc từ mẫu email), `isProtectedLearnerPath`, kiểm tra form (mật khẩu 8–72 ký tự và ≤ 72 byte, có chữ và số), dịch lỗi Auth |
| Lint, kiểu (tsc), `npm run build` | sạch | trang tĩnh giữ nguyên (`/huong-dan`, `/dieu-khoan`, `/chinh-sach-bao-mat` vẫn ○ Static) |
| `supabase/tests/learner_accounts.sql` (H1–H15, M1–M3, C1–C6, G1–G5, F1, P1–P2, R1, D1) | **34/34** trên DB thật | RLS chạy thật bằng role `authenticated` + `request.jwt.claims`: học sinh A không đọc / sửa được hồ sơ, tiến độ của B; biên tập viên không đọc hồ sơ học sinh; quản trị viên chỉ đọc hồ sơ; `claim_license` từ chối mã của người khác / bị thu hồi; `get_exam_set` mở đề theo tài khoản không tốn lượt thiết bị; xóa tài khoản → đơn, mã còn nhưng bỏ gắn. Trước khi trình đã thử đột biến (mở quyền đọc hồ sơ, bỏ chặn gán lại tài khoản) → 5 ca báo đỏ |
| `supabase/tests/payments.sql` sau migration | **44/44** trên DB thật | dòng kiểm quyền `get_exam_set` sửa để đúng cả trước và sau khi thêm tham số |
| **E2E tài khoản** (`account.spec.ts`, bản production, DB thật) | **7 đạt**, 1 bỏ qua / 8 | (1) link xác nhận email (lấy bằng `generateLink`) → `/tai-khoan`, hồ sơ được tạo, dùng lại link → trang lỗi; (2) sai mật khẩu / email lạ → cùng thông báo; tài khoản chưa xác nhận → nút gửi lại; (3) quên mật khẩu → đặt mật khẩu mới, mật khẩu cũ hết tác dụng, trang đặt lại khóa khi không có link; (4) `/tai-khoan` → đăng nhập → quay về đúng trang (giữ query), đăng xuất; (5) `next=//evil.com`, `next=https://evil.com` → `/tai-khoan`. Bỏ qua: gửi email thật qua form (cần SMTP riêng, `E2E_SMTP=1`). Tài khoản thử tự xóa: còn 0 |
| E2E thanh toán (`payments.spec.ts`) sau migration | **14/14** đạt | mở đề bằng mã + thiết bị vẫn chạy với `get_exam_set` mới |
| Trợ năng axe-core | 10/10 đạt | `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/dieu-khoan`, `/chinh-sach-bao-mat` × sáng/tối |

**Chưa làm (B3–B7):** đăng nhập Google, menu tài khoản trên Header, trang tài khoản đầy đủ (bảo mật, xóa tài khoản, tải
dữ liệu), đồng bộ tiến độ, gắn thanh toán với tài khoản trên giao diện, ma trận RLS bằng tài khoản học sinh thật. Gửi email
thật cần cấu hình SMTP (mục 9.3 của kế hoạch).

## 13. Tài khoản học sinh — giai đoạn B3: đăng nhập Google (14/10/2026)

Luồng PKCE phía server (`signInWithGoogleAction` → Google → Supabase → `/auth/callback` → `exchangeCodeForSession`). Người
vào lần đầu bằng Google chưa có hồ sơ học sinh → `/dang-ky/hoan-tat` (tên gợi ý từ Google, tự tích đồng ý điều khoản); nhân
sự đang hoạt động thì đi tiếp (quyết định Q1). Nút Google **chỉ hiện khi Google đã bật** trong Supabase (đọc
`/auth/v1/settings`, lưu đệm 5 phút) — lúc kiểm thử Google **chưa bật**, nên nút đang ẩn.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **566/566** đạt, 37 file | thêm `auth-google.test.ts` (16 ca): `/auth/callback` với Supabase giả — có hồ sơ → `next`; `next` trỏ ra ngoài → `/tai-khoan`; lần đầu → `/dang-ky/hoan-tat?next=…`; nhân sự đang hoạt động → đi tiếp, nhân sự bị khóa → vẫn phải hoàn tất; bấm Hủy; thiếu / quá dài `code`; dùng lại link khi chưa / đang đăng nhập. Dịch lỗi, tên + ảnh gợi ý (ảnh chỉ nhận https ≤ 500 ký tự) |
| Lint, kiểu (tsc), `npm run build` | sạch | |
| **E2E tài khoản** (`account.spec.ts`, bản production, DB thật) | **10 đạt**, 1 bỏ qua / 11 | thêm 3 ca B3: tài khoản kiểu Google chưa đồng ý điều khoản → `/dang-ky/hoan-tat`, tên gợi ý, chưa tích → báo lỗi và `/tai-khoan` vẫn đưa về đây, tích → hồ sơ có `avatar_url` từ Google + `terms_version`; trang hoàn tất khi chưa đăng nhập → `/dang-nhap?next=…`; `/auth/callback` bấm Hủy / thiếu code / code giả → trang lỗi tiếng Việt |
| Trợ năng axe-core | 42/42 đạt | thêm `/auth/loi?ly-do=google-huy` × sáng/tối |

**Kiểm tay Google (chưa làm — cần cấu hình mục 9.1–9.2 của kế hoạch):**

| # | Kịch bản | Kỳ vọng | Kết quả |
|---|---|---|---|
| G1 | Gmail chưa từng đăng ký → Tiếp tục với Google | `/dang-ky/hoan-tat`, tên + ảnh từ Google → Hoàn tất → `/tai-khoan` | chưa kiểm |
| G2 | Gmail trùng email đã đăng ký bằng mật khẩu | Vào **cùng** tài khoản, không hỏi lại điều khoản | chưa kiểm |
| G3 | Bấm "Hủy" ở màn hình Google | `/auth/loi?ly-do=google-huy` | chưa kiểm |
| G4 | Mở lại link `/auth/callback?code=…` lần hai | Đang đăng nhập → đi tiếp; đã đăng xuất → `google-het-han` | chưa kiểm |

## 14. Tài khoản học sinh — giai đoạn B4: menu tài khoản, hồ sơ, bảo mật (14/10/2026)

Nút tài khoản trên Header là **client component** (`AccountMenu`, `lib/hooks/useSession.ts`): khách chưa có cookie phiên
thì không tải thư viện Supabase; có cookie mới tải (import động) để đọc phiên + tên hiển thị. Chỉ để hiển thị — mọi thao
tác kiểm lại phiên ở server (`getUser`). Trang `/tai-khoan` (hồ sơ: tên, trường), `/tai-khoan/bao-mat` (đổi / đặt mật
khẩu, liên kết / gỡ Google, đăng xuất mọi thiết bị, tải dữ liệu JSON, xóa tài khoản), hộp thoại đăng xuất có ô "máy dùng
chung". Học sinh mở `/quan-tri/*` → `/tai-khoan?thong-bao=khu-noi-bo` (thay cho trang "Tài khoản bị khóa").

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **580/580** đạt, 38 file | thêm `account-security.test.ts` (14 ca): cách đăng nhập từ `identities` (email / Google / Google đã đặt mật khẩu / cả hai — chỉ gỡ được Google khi còn danh tính email), schema hồ sơ / đổi mật khẩu / xóa tài khoản, lỗi liên kết Google (`identity_already_exists` → `/auth/loi?ly-do=google-da-gan`) |
| Lint, kiểu (tsc), `npm run build` | sạch | bảng route **không đổi** kiểu trang: `/bai-hoc/*` vẫn ● SSG, `/huong-dan`, `/kham-pha`, `/dieu-khoan` vẫn ○ Static; `/tai-khoan/*` ƒ động |
| **E2E tài khoản** (`account.spec.ts`, bản production, DB thật) | **18 đạt**, 1 bỏ qua / 19 | thêm 8 ca B4: (6) học sinh mở `/quan-tri`, `/quan-tri/bai-sgk`, trang "bị khóa" → `/tai-khoan` kèm thông báo; Header khách → "Đăng nhập" (mang `next`), đăng nhập → menu tài khoản, "Ở lại" đóng hộp thoại, đăng xuất máy dùng chung xóa `ls12:tien-do` + `ls12:ban-quyen`; sửa hồ sơ → DB + tên trên Header; đổi mật khẩu sai mật khẩu hiện tại → lỗi, đúng → máy khác bị đăng xuất, mật khẩu cũ hết tác dụng; tải dữ liệu (đính kèm, `no-store`, không lộ token / IP); đăng xuất mọi thiết bị; (10) xóa tài khoản (gõ sai email → lỗi; đúng → Auth + hồ sơ bị xóa, không đăng nhập lại được); trợ năng axe sáng/tối cho 2 trang + menu mở, 360 px không tràn ngang, menu điện thoại có mục tài khoản |
| E2E thanh toán (`payments.spec.ts`), SGK (`sgk.spec.ts`) | **14/14**, **13/13** đạt | lần chạy đầu 2 ca thanh toán đỏ: `getByLabel('Mã kích hoạt')` khớp cả ô "máy dùng chung" trong hộp thoại đăng xuất → rút gọn nhãn ô, phần giải thích chuyển sang `aria-describedby` |
| Trợ năng axe-core (`a11y.spec.ts`) | 42/42 đạt | các trang công khai giờ có nút "Đăng nhập" trên Header |

**Chưa kiểm được tự động:** liên kết / gỡ Google ở trang Bảo mật (cần bật Google + *Manual linking* trong Supabase, mục
9.2 bước 1 và 5 của kế hoạch) — thêm vào danh sách kiểm tay:

| # | Kịch bản | Kỳ vọng | Kết quả |
|---|---|---|---|
| G5 | Tài khoản email → Bảo mật → Liên kết Google | Về `/tai-khoan/bao-mat?thong-bao=lien-ket-google`, mục Google "Đã liên kết", lần sau vào bằng Google được | chưa kiểm |
| G6 | Liên kết bằng Gmail đã thuộc tài khoản khác | `/auth/loi?ly-do=google-da-gan` | chưa kiểm |
| G7 | Tài khoản chỉ có Google → đặt mật khẩu | Đăng nhập được bằng email + mật khẩu; nút "Gỡ Google" vẫn ẩn (Supabase không cho gỡ danh tính cuối) | chưa kiểm |

**Lưu ý thiết kế:** máy khác sau khi đổi mật khẩu / đăng xuất mọi thiết bị vẫn còn JWT chưa hết hạn trong cookie, nên
proxy (kiểm lạc quan bằng `getClaims`) cho qua; `requireLearner` (`getUser`, hỏi máy chủ Auth) mới chặn và đưa về
`/dang-nhap`. E2E kiểm đúng hành vi này. Đổi mật khẩu kiểm mật khẩu hiện tại bằng một client tạm không lưu phiên rồi thu
hồi ngay — đây là lớp chặn trên giao diện; muốn chặn cả gọi API trực tiếp thì bật *Secure password change* trong Supabase.

## 15. Tài khoản học sinh — giai đoạn B5: đồng bộ tiến độ (14/10/2026)

`components/account/ProgressSync.tsx` (client, gắn trong layout công khai, chỉ chạy khi đã đăng nhập) + `/api/tien-do`
(GET / PUT bằng phiên người dùng, RLS `own_*` của `learner_progress`). Khách vẫn dùng localStorage + mã `LS12-…` như cũ.

- **Phép gộp riêng cho đồng bộ** (`lib/progress/sync.ts` → `joinProgress`): giống `mergeProgress` nhưng số lượt làm bài
  lấy **max** thay vì cộng. Lý do: đồng bộ gộp đi gộp lại cùng một lịch sử (máy → tài khoản → máy); nếu cộng thì số
  lượt nhân lên sau mỗi lần (có unit test chứng minh). Với max, phép gộp giao hoán, kết hợp, lũy đẳng. Đổi lại: hai máy
  cùng làm một bộ đề khi chưa đồng bộ thì số lượt bị tính thiếu (điểm cao nhất, con dấu, mục đã đọc không mất).
- **Server không ghi đè:** đọc bản đang lưu → gộp → ghi kèm điều kiện `updated_at` chưa đổi (khóa lạc quan, thử lại 3
  lần) → hai máy ghi cùng lúc không mất phần của nhau. Giới hạn 64 KB, 30 lần ghi / phút / tài khoản (bucket
  `progress_write`; bộ đếm hỏng thì vẫn cho ghi).
- **Máy dùng chung:** khóa `ls12:tien-do-cua` ghi tài khoản đang giữ tiến độ trên máy. Người khác đăng nhập trên cùng máy
  → **thay** bằng tiến độ của họ, không trộn tiến độ người trước vào tài khoản người sau.
- **Đăng xuất:** đẩy nốt thay đổi còn chờ (tối đa 3 giây) rồi mới xóa dữ liệu máy (nếu tích "máy dùng chung") và đăng
  xuất. Rời trang thì đẩy bằng `fetch keepalive`. Quay lại tab sau ≥ 1 phút thì tải lại bản của tài khoản.
- **Hộ chiếu:** đã đăng nhập → "Tiến độ đã đồng bộ với tài khoản", ẩn mục chép mã tiến độ và nút xóa tiến độ trên máy
  (xóa xong cũng bị đồng bộ trả lại); chưa đăng nhập → thêm lời mời đăng nhập.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **596/596** đạt, 40 file | thêm `progress-sync.test.ts` (9 ca: tính chất phép gộp, đồng bộ 5 vòng không nhân số lượt, so sánh không phụ thuộc thứ tự khóa, thông báo "đã gộp", máy dùng chung → thay chứ không trộn) và `progress-api.test.ts` (7 ca, Supabase giả: 401, tạo dòng, gộp không ghi đè, máy khác ghi chen giữa → đọc lại gộp lại, 413, 429, bộ đếm hỏng vẫn ghi, body hỏng) |
| Lint, kiểu (tsc), `npm run build` | sạch | bảng route chỉ thêm `ƒ /api/tien-do`; mọi trang khác giữ nguyên kiểu (so bằng `diff` với bản build B4) |
| **E2E tài khoản** (`account.spec.ts`, bản production, DB thật) | **22 đạt**, 1 bỏ qua / 23 | thêm 4 ca B5: (7) có con dấu khi chưa đăng nhập → đăng nhập → thông báo "Đã gộp … (1 con dấu)", tài khoản có con dấu, trợ năng Hộ chiếu khi đã đăng nhập; máy thứ hai có con dấu khác → đăng nhập thấy 2 con dấu, máy đầu tải lại cũng thấy 2, không báo gộp lần nữa; đang đăng nhập → tự đẩy sau ~3 giây; học xong rồi đăng xuất máy dùng chung ngay (chưa hết 3 giây) → vẫn kịp lên tài khoản, máy sạch; người sau trên cùng máy không nhận tiến độ người trước; `/api/tien-do` khi chưa đăng nhập → 401 |
| E2E thanh toán, trợ năng | **14/14**, **42/42** đạt | một lần chạy ca "số tiền ủng hộ ngoài khoảng" đỏ ngẫu nhiên (không thấy phần tử), chạy lại đạt — cùng kiểu lỗi mạng chập chờn đã ghi ở mục 8 |

**Lỗi tìm thấy khi kiểm thử:** đăng xuất ngay sau khi mở trang thì bước "đẩy nốt" không đẩy gì vì chưa tải xong bản của
tài khoản → sửa: đẩy nốt chờ lần tải đầu xong rồi mới đẩy (E2E "học xong rồi đăng xuất ngay" bắt được lỗi này).

## 16. Tài khoản học sinh — giai đoạn B6: gói luyện thi theo tài khoản (14/10/2026)

Không cần migration mới: cột `orders.user_id`, `licenses.user_id`, hàm `claim_license`, `get_exam_set(…, p_user_id)` và
`mark_order_paid` (chép `user_id` sang mã) đã có từ migration B1.

- **Mua khi đã đăng nhập** (quyết định Q3: không bắt đăng nhập): Server Action lấy user id từ phiên đã xác minh
  (`getUser`), không từ form → `orders.user_id`; mã cấp ra thuộc luôn tài khoản. Để trống email thì dùng email tài khoản.
  Form mua báo "Gói sẽ gắn với tài khoản …".
- **Mở đề bằng tài khoản:** `/api/luyen-thi/[slug]` truyền `p_user_id` (từ `getClaims`) → đề trả phí mở ở mọi máy đã
  đăng nhập, không cần mã, không tốn lượt thiết bị; màn hình đề ghi "Đề mở bằng gói trong tài khoản". `/luyen-thi` hiện
  "Gói đã gắn với tài khoản" (API `/api/tai-khoan/goi`).
- **Mua khi chưa đăng nhập → thêm mã vào tài khoản** (`claimLicenseAction` → `claim_license`, 10 lần / 15 phút): ở
  `/tai-khoan/don-hang`, ở trang kết quả thanh toán (nút "Lưu mã vào tài khoản") và ở `/kich-hoat`. Mã của người khác,
  bị thu hồi, hết hạn → từ chối.
- **`/tai-khoan/don-hang`:** gói trong tài khoản + đơn đặt khi đăng nhập (đọc bằng khóa bí mật, lọc theo user id của phiên,
  chỉ cột an toàn). Chủ đơn mở trang kết quả ở máy khác cũng xem được (không cần cookie đơn).
- **T6 — email mã kích hoạt** (`lib/payments/email.ts`, API Resend): gửi khi `mark_order_paid` / `admin_resolve_late_payment`
  trả `already=false` — đúng một lần mỗi đơn, nên **không cần cột `email_sent_at`** như kế hoạch dự kiến. Gửi trong
  `after()` (sau khi đã trả lời cổng), lỗi chỉ ghi log, không ghi email / mã vào log. Chưa có `RESEND_API_KEY` +
  `EMAIL_FROM` thì không gửi (hiện trạng: **chưa cấu hình**, chờ tên miền — Q4).
- "Tải dữ liệu của em" thêm danh sách gói.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **607/607** đạt, 41 file | thêm `account-payments.test.ts` (11 ca): nội dung email (thoát HTML), chỉ hẹn gửi khi vừa cấp mã, chưa cấu hình → không gửi; lọc gói còn dùng được; `claimLicenseAction` dùng user id của phiên (bỏ `user_id` giả trong form), chuẩn hóa mã, các lý do từ chối, giới hạn tần suất |
| Lint, kiểu (tsc), `npm run build` | sạch | bảng route chỉ thêm `ƒ /api/tai-khoan/goi`, `ƒ /tai-khoan/don-hang`; `/kich-hoat`, `/luyen-thi` giữ nguyên kiểu |
| **E2E tài khoản** (`account.spec.ts`, bản production, DB thật, cổng giả lập) | **25 đạt**, 1 bỏ qua / 26 | thêm 3 ca B6: (8) đăng nhập → mua → `orders.user_id`, `buyer_email` = email tài khoản, mã thuộc tài khoản; trình duyệt khác chưa đăng nhập thấy "Đăng nhập để mở đề", đăng nhập → `/luyen-thi` báo gói của tài khoản, đề 2 mở bằng tài khoản (không có mã trên máy), xem được trang kết quả không cần cookie, `/tai-khoan/don-hang` có gói + đơn; (9) mua khi chưa đăng nhập → đăng nhập từ trang kết quả → lưu mã vào tài khoản (đơn vẫn không thuộc tài khoản), thêm lại → "đã có", máy khác mở đề bằng tài khoản, người khác thêm cùng mã → từ chối; xóa tài khoản → gói bỏ gắn, mã vẫn kích hoạt được bằng đường mã + thiết bị |
| E2E thanh toán, trợ năng | **14/14**, **42/42** đạt | |

**Lỗi tìm thấy khi kiểm thử (đã sửa):**

1. Đăng nhập từ trang kết quả thanh toán → "Không xem được đơn hàng". Server Action đăng nhập (POST `/dang-nhap`) dựng
   luôn trang đích trong cùng request, mà cookie xem đơn đặt `path=/thanh-toan` nên không đi kèm. Sửa: cookie đơn mới đặt
   `path=/` (vẫn httpOnly, sameSite=lax). Đơn cũ có cookie `path=/thanh-toan` vẫn xem được khi mở trực tiếp.
2. (B5) Đăng xuất ngay sau khi mở trang → tiến độ vừa học chưa kịp lên tài khoản (1/4 lần chạy). Nguyên nhân: `useSession`
   chỉ báo "đã đăng nhập" sau khi tải tên hiển thị qua mạng, nên `ProgressSync` chưa chạy. Sửa: báo ngay khi đọc được
   phiên (không qua mạng), tên cập nhật sau; bước "đẩy nốt" khi chưa tải xong bản của tài khoản thì PUT thẳng (server luôn
   gộp) thay vì chờ GET. Chạy lại 6/6 lần đạt.

**Chưa kiểm:** email mã kích hoạt gửi thật (cần Resend + tên miền); E2E quản trị `payments-admin.spec.ts` (cần
`TEST_PW`) — B6 chỉ đổi câu thông báo sau khi xác nhận tiền về muộn.

## 17. Tài khoản học sinh — giai đoạn B7: kiểm thử phân quyền, cấp quyền nhân sự, hoàn thiện (14/10/2026)

- **`tests/rls/learner.mjs`** — chạy THẬT trên database bằng phiên học sinh (2 tài khoản thử tạo bằng Admin API, xóa ở
  cuối). Học sinh = khách với mọi dữ liệu nội bộ; lệnh ghi / gọi hàm chỉ tính "bị chặn" khi lỗi đúng là thiếu quyền
  (`42501`) — lỗi dữ liệu (thiếu cột…) ghi ⚠ để không đạt nhầm; kiểm trước rằng dữ liệu tham chiếu có thật (bảng không
  trống). Có `TEST_PW` thì thêm cột Editor / Admin.
- **"Cấp quyền cho tài khoản đã có"** ở trang Nhân sự (mục 7.4): `find_auth_user_by_email` (chỉ service_role, gọi SAU
  `requireRole(["system_admin"])`) → chèn `staff_profiles` bằng phiên admin (RLS `admin_manage_staff`). Không tạo mật
  khẩu. "Tạo nhân sự mới" với email đã có giờ gợi ý dùng form này. `Field` thêm `idPrefix` để hai form cùng trang không
  trùng id.
- README (tính năng, biến môi trường, cấu hình Google / Manual linking, lệnh kiểm thử), ảnh chụp
  `docs/screenshots/tai-khoan-*.png` (7 ảnh, chụp lại bằng `node scripts/chup-anh-tai-khoan.mjs`).
- **Không làm:** CAPTCHA (tùy chọn) — cần khóa Cloudflare Turnstile / hCaptcha và bật *Attack protection* trong Supabase;
  hiện dựa vào giới hạn có sẵn của Supabase Auth.

**Kết quả `TEST_PW=… node tests/rls/learner.mjs`** (database thật, 14/10/2026):

| Thao tác | Khách | Học sinh | Editor | Admin |
|---|:-:|:-:|:-:|:-:|
| Đọc sự kiện `published` | ✅ | ✅ | ✅ | ✅ |
| Đọc sự kiện chưa công bố | ❌ | ❌ | ✅ | ✅ |
| Tạo sự kiện | ❌ | ❌ | ✅ | ✅ |
| Sửa sự kiện `published` (sự kiện thử) | ❌ | ❌ | ❌ | ✅ |
| Thêm `sources` | ❌ | ❌ | ✅ | ✅ |
| Đọc `staff_profiles` (của người khác) | ❌ | ❌ | ❌ | ✅ |
| Tự chèn hồ sơ nhân sự cho mình (leo quyền) | ❌ | ❌ | ❌ | ✅ * |
| `current_staff_role()` trả vai trò | ❌ | ❌ | ✅ | ✅ |
| Tải ảnh lên Storage `media` | ❌ | ❌ | ✅ | ✅ |
| Đọc câu hỏi đề `exam_questions` | ❌ | ❌ | ✅ | ✅ |
| Sửa đề nháp `exam_sets` (ghi lại đúng tiêu đề cũ) | ❌ | ❌ | ✅ | ✅ |
| Đọc `orders` | ❌ | ❌ | ❌ | ✅ |
| Đọc `licenses` | ❌ | ❌ | ❌ | ✅ |
| Tạo đơn trực tiếp | ❌ | ❌ | ❌ | ❌ |
| Gọi `claim_license` | ❌ | ❌ | ❌ | ❌ |
| Gọi `get_exam_set` (tự khai user id) | ❌ | ❌ | ❌ | ❌ |
| Gọi `find_auth_user_by_email` | ❌ | ❌ | ❌ | ❌ |
| Gọi `consume_rate_limit` | ❌ | ❌ | ❌ | ❌ |
| Đọc hồ sơ học sinh B | ❌ | ❌ | ❌ | ✅ |
| Sửa hồ sơ học sinh B | ❌ | ❌ | ❌ | ❌ |
| Đọc tiến độ học sinh B | ❌ | ❌ | ❌ | ❌ |
| Ghi tiến độ cho B | ❌ | ❌ | ❌ | ❌ |

\* Chỉ quản trị viên được ghi `staff_profiles`; dòng của chính admin đã có nên lệnh dừng ở trùng khóa (RLS đã cho qua).

**Cột Khách và Học sinh giống hệt nhau ở mọi dòng** — tài khoản học sinh không có quyền nội bộ nào. Cột nhân sự khớp ma
trận Phase 13 (`tests/rls/matrix.mjs`). Lần chạy này 84/88 ô khớp: 4 ô lệch đều ở dòng "Sửa đề" vì kỳ vọng ghi sai
trong kịch bản (biên tập viên được sửa đề nháp theo policy `editor_manage_editable`) — đã sửa kỳ vọng và cố định đề thử là
đề nháp; chạy lại không có `TEST_PW` 44/44.

**Sự cố khi kiểm thử (đã xử lý):** lần chạy đầu với `TEST_PW`, kịch bản bản trước dùng một sự kiện **thật** đã công bố cho
dòng "Sửa sự kiện `published`" → cột Admin (được phép) đổi tóm tắt sự kiện `dai-hoi-dang-lan-thu-vi` thành "x", và cột
Editor / Admin để lại 2 sự kiện + 2 nguồn thử. Đã khôi phục tóm tắt gốc từ `supabase/seed.sql`, xóa dữ liệu thử, rồi sửa
kịch bản: lệnh sửa chỉ nhắm vào sự kiện thử do kịch bản tự tạo hoặc ghi lại đúng giá trị cũ, dọn cả sự kiện / nguồn / tệp
Storage thử; lỗi ném ra ghi ⚠ chứ không tính "bị chặn".

Chủ tài khoản: ✅ đọc / sửa hồ sơ của mình, ✅ đọc / ghi tiến độ của mình, ✅ không đổi được id hồ sơ sang người khác, ✅
không tự xóa hồ sơ (chỉ xóa theo tài khoản), ✅ xóa tài khoản → hồ sơ + tiến độ xóa theo. **22/22 thao tác (44/44 ô), 5/5
ca chủ tài khoản, cascade đạt; dọn còn 0 tài khoản thử.** Trước đó, lần chạy đầu phát hiện chính kịch bản kiểm thử có ô "đạt nhầm"
(slug sản phẩm sai → lệnh chèn ném lỗi, bị tính là "bị chặn") — đã sửa bằng kiểm tiền điều kiện và yêu cầu mã `42501`.

| Nhóm | Kết quả | Ghi chú |
|---|---|---|
| Unit test (Vitest) | **612/612** đạt, 42 file | thêm `staff-grant.test.ts` (5 ca): `requireRole(["system_admin"])` chạy trước mọi tra cứu, kiểm dữ liệu, email chuẩn hóa, chèn hồ sơ không mật khẩu, chưa có tài khoản → gợi ý tạo mới, đã là nhân sự (23505) |
| Lint, kiểu (tsc), `npm run build` | sạch | bảng route không đổi so với B6 |
| Header bảo mật (bản production) | đạt | trang `/tai-khoan/*`, `/dang-nhap`, `/dat-lai-mat-khau`: `Cache-Control: private, no-cache, no-store`, `robots noindex`; `/api/tien-do`, `/api/tai-khoan/goi`: `private, no-store`; `robots.txt` chặn `/tai-khoan`, `/auth/`, `/dat-lai-mat-khau`; chưa đăng nhập vào `/tai-khoan/*` → 307 về `/dang-nhap?next=…` |
| E2E tài khoản / thanh toán / trợ năng | **25 + 14 + 42 = 81 đạt**, 2 bỏ qua | bỏ qua khi không có `TEST_PW`: gửi email thật (cần SMTP) và ca cấp quyền nhân sự |
| E2E cấp quyền nhân sự (B7, `TEST_PW`) | **1/1 đạt** | học sinh bị chặn khỏi `/quan-tri` → "Tạo nhân sự mới" bằng email đã có gợi ý form cấp quyền → admin cấp quyền Biên tập viên (email gõ hoa vẫn khớp) → hiện trong danh sách; cấp lần hai báo "đã là nhân sự"; học sinh vào `/quan-tri` bằng đúng phiên cũ, trang tài khoản có lối "Vào khu quản trị", trang Bảo mật không cho tự xóa tài khoản nhân sự. Lần chạy đầu đỏ do chính test (form xóa trắng sau khi cấp thành công, test chưa điền lại) — đã sửa |

**Checklist bảo mật (mục 10 kế hoạch):**

| Mục | Trạng thái | Bằng chứng |
|---|:-:|---|
| Quyền nội bộ chỉ từ `staff_profiles` | ✅ | `tests/rls/learner.mjs` (bảng trên), E2E (6) |
| Bảng mới bật RLS + `revoke` rồi mới `grant` | ✅ | migration `20261020000000_learner_accounts.sql`, `supabase/tests/learner_accounts.sql` 34/34, quy tắc trong `AGENTS.md` |
| User id chỉ từ `getUser()` / `getClaims()` | ✅ | unit test `claimLicenseAction` (bỏ `user_id` giả trong form), `/api/tien-do`, `/api/luyen-thi`, Server Action mua gói |
| `safeNext()` cho mọi `next` / `redirectTo` | ✅ | `account.test.ts` (45 ca), E2E (5) |
| Google qua PKCE, không xin scope thừa, không lưu `provider_token` | ✅ | `signInWithGoogleAction`, `linkGoogleAction` (chỉ `prompt=select_account`) |
| Không lộ email nào đã có tài khoản | ✅ | E2E (2), quên mật khẩu / gửi lại xác nhận cùng một thông báo |
| Mật khẩu 8–72 (≤ 72 byte), chữ + số; đặt lại / đổi xong đăng xuất máy khác | ✅ | E2E (3), E2E đổi mật khẩu (máy kia bị đăng xuất) |
| `no-store` + `noindex` cho route tài khoản | ✅ | hàng "Header bảo mật" ở trên |
| Giới hạn số lần thử `license_claim`, `progress_write` | ✅ | `lib/payments/rate-limit.ts`, unit test 429 |
| Xóa tài khoản: gõ lại email, không xóa tài khoản nhân sự | ✅ | E2E (10); trang Bảo mật ẩn form với nhân sự, Server Action kiểm lại bằng khóa bí mật |
| Nhân sự đăng nhập Google (Q1 — cho phép) | ✅ | `/auth/callback` (unit test "nhân sự đang hoạt động → đi tiếp") |
| Không ghi email, token, `code` vào log | ✅ | chỉ log mã đơn khi gửi email lỗi |
| CAPTCHA | — | tùy chọn, chưa làm |

**Còn chờ cấu hình tay / người dùng:** kiểm tay Google G1–G7 (mục 13–14, cần bật Google + *Manual linking*); SMTP +
email mã kích hoạt (cần tên miền, Q4); chạy `tests/rls/learner.mjs` và E2E cấp quyền nhân sự với `TEST_PW`.
