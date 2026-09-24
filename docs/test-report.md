# Biên bản kiểm thử — Hệ thống hỗ trợ tìm hiểu Lịch sử Việt Nam lớp 12

> Phase 13 (mục 8, `KE_HOACH_DU_AN.md`). Mọi kiểm thử chạy trên **database Supabase thật** của dự án bằng các tài khoản thử
> `@test.local`; dữ liệu thử có tiền tố `zz-kiem-thu` / `ZZ KIỂM THỬ` và được dọn sạch sau mỗi lần chạy (đã kiểm tra: 0 dòng còn sót).
> Ngày lập: 24/09/2026.

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
| Unit test (Vitest) | 181 | 181 | 16 file |
| Ràng buộc CSDL — hợp lệ và không hợp lệ (mục 8.1) | 41 | 41 | gồm C1–C13 của kế hoạch |
| Ma trận phân quyền RLS (mục 8.2) | 70 ô (14 thao tác × 5 vai trò) | 70 | + kiểm tra hành vi `updated_at` (C12) |
| RLS chi tiết — `sources` (link + nguồn) | 13 | 13 | sau migration 000003 |
| RLS chi tiết — kiểm duyệt viên | 24 | 24 | sau migration 000005 (chạy 3 lần liên tiếp, đều 24/24) |
| E2E Playwright (mục 8.4) | 29 | 29 | E1–E9 + 7 ca UC13 (tạo tài khoản); xem lưu ý về mạng ở mục 5 |
| Phi chức năng (mục 8.5) | — | — | xem mục 5: đạt trợ năng; 1 điểm hiệu năng chưa đạt mục tiêu trong kịch bản mạng chậm |

## 2. Unit test (Vitest) — 181 test, 16 file

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
| `readiness.test.ts` | 8 | điều kiện gửi duyệt (bắt buộc / khuyến nghị) |
| `review.test.ts` | 18 | luật chuyển trạng thái kiểm duyệt khớp policy RLS, lý do bắt buộc |
| `staff-rules.test.ts` | 12 | không tự khóa mình, không khóa admin cuối cùng, Zod tạo nhân sự |
| `admin-content-rules.test.ts` | 8 | ưu tiên ẩn hơn xóa |
| `operations.test.ts` | 8 | tóm tắt vận hành: lỗi kiểm tra ⇒ "chưa xác định", không kết luận bình thường |

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

## 9. Cơ sở dữ liệu thực tế (cho Chương 2 của báo cáo)

- 10 bảng trong schema `public`, **cả 10 bật RLS**; PostGIS trong schema `extensions`; 8 trigger nghiệp vụ trong `public`.
- **Số policy thực tế: 48** (`public`) + 2 (`storage.objects`). Lúc mới tạo là 36; tăng 12 nhờ các migration siết quyền:
  bảng liên kết (4 bảng × 2 policy thêm) và bảng `sources` (+4). Báo cáo mẫu ghi 49 — không dùng.
- Migration đã chạy: `20260924000001–3` (bảng, trigger/index/hàm, RLS), `20260925000000` (toàn vẹn nghiệp vụ G1/G3/G4),
  `20260925000001` (bucket `media`), `20260925000002` (RLS bảng liên kết), `20260925000003` (RLS `sources`), `20260925000004` (G5).
  `20260925000005` (sửa G5 cho cột `geom`) — đã chạy ngày 2026-09-24. Không còn migration chờ chạy.
