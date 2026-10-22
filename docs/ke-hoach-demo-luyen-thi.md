# Kế hoạch cho Claude Code: Dữ liệu demo luyện tập (3 bài) · Lời giải "sai ở đâu – bài nào – mục nào" · Đề luyện thi số 3 chuẩn THPT

> Repo: `tronghp160/WEB_LICH-SU_12` · Soạn ngày 22/10/2026 · Giao cho Claude Code làm **từng giai đoạn (GĐ-D1 → GĐ-D7)**,
> hết mỗi giai đoạn dừng lại báo chủ dự án.
> Tài liệu gốc phải đọc trước: `AGENTS.md`, `docs/ke-hoach-luyen-thi.md`, `docs/huong-dan-soan-cau-hoi.md`.

---

## 0. Mục tiêu và phạm vi

| # | Yêu cầu của chủ dự án | Kết quả cần có |
|---|---|---|
| 1 | Dữ liệu luyện tập **đầy đủ, chi tiết cho 3 bài** để demo hết chức năng trang Luyện tập | Bài 6, 7, 8 mỗi bài **38 câu** (30 trắc nghiệm + 8 Đúng/Sai), đủ mọi tổ hợp bộ lọc: dạng câu × mức độ × tư liệu × 10/20/30 câu |
| 2 | Câu sai phải giải thích **sai ở đâu, nằm ở bài nào, chi tiết ở chỗ nào trong bài** | Mỗi lựa chọn sai / mỗi ý Đúng-Sai có lời giải riêng + vị trí kiến thức (Bài N › Mục M, có liên kết tới `/bai/<slug>#muc-M`) + kiểu bẫy |
| 3 | Thêm **đề luyện thi số 3 chuẩn cấu trúc thi tốt nghiệp THPT** | `de-3`: Phần I 24 câu trắc nghiệm + Phần II 4 câu Đúng/Sai (mỗi câu 4 ý), 50 phút, 10 điểm, có ma trận, có tư liệu |

**Vì sao chọn Bài 6, 7, 8** (Cách mạng tháng Tám · Kháng chiến chống Pháp · Kháng chiến chống Mỹ): đây là phần chiếm nhiều
tiết nhất (Chủ đề 3 có 9/38 tiết) nên nặng điểm trong đề thật; web đã có sẵn nội dung "giàu" cho các bài này (bài học tương
tác Cách mạng tháng Tám, bản đồ phim / mô hình 3D Điện Biên Phủ, Tết Mậu Thân, Điện Biên Phủ trên không, chiến dịch Hồ Chí
Minh) → khi demo, liên kết "Kiến thức nằm ở Bài 7 › Mục 3" dẫn thẳng tới các trang đẹp nhất của web. Nếu chủ dự án muốn
đổi bài thì chỉ cần đổi bảng ở mục 5.2.

**Không làm lại những gì đã có** (đã xong GĐ0–GĐ8): phòng thi 24 + 4, chấm phía server, luyện tập + hạn mức 10 câu/ngày,
sổ câu sai Leitner, đề tự sinh, trang kết quả, báo lỗi câu, bản in. Việc lần này là **nội dung + làm giàu lời giải + 1 đề**.

### Cấu trúc đề thi tốt nghiệp THPT môn Lịch sử (đã kiểm tra lại 22/10/2026)

- Kỳ thi 2026 giữ nguyên cấu trúc từ năm 2025: **50 phút, 28 câu**. Phần I: 24 câu trắc nghiệm 4 lựa chọn, 0,25 điểm/câu
  (6 điểm). Phần II: 4 câu Đúng/Sai, mỗi câu 4 ý; đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm (4 điểm).
- Nhận xét đề 2026 của giáo viên: nhiều ngữ liệu lấy từ văn kiện, công trình nghiên cứu → nặng **đọc hiểu tư liệu**; có cả
  kiến thức **lớp 11** (khởi nghĩa Lam Sơn, cải cách Lê Thánh Tông); câu Đúng/Sai là phần phân hóa mạnh nhất; có câu liên
  hệ thực tiễn / rút bài học.
- Chưa có văn bản chính thức nào cho năm 2027 → giữ cấu trúc 2025 (trùng với `lib/exams/format.ts`, không phải sửa code chấm).
- Tỉ lệ mức độ dùng mặc định của repo `LEVEL_MIX_SUGGESTED` = Nhận biết 40% · Thông hiểu 30% · Vận dụng 30% (cần giáo viên
  xác nhận — mục 10).

---

## 1. Quy tắc bắt buộc (nhắc lại từ repo — vi phạm là làm lại)

1. **Next.js trong repo là bản mới, khác dữ liệu huấn luyện**: trước khi sửa code route / page, đọc hướng dẫn trong
   `node_modules/next/dist/docs/` như `AGENTS.md` yêu cầu.
2. **Database**: migration chỉ *thêm* / chuyển dữ liệu. Bảng mới: `enable row level security` + `revoke all … from anon,
   authenticated` rồi mới `grant`. Hàm `security definer`: `set search_path = ''`, chỉ `grant execute … to service_role`.
   **Migration đưa chủ dự án xem trước; chủ dự án tự chạy trong SQL Editor** (không tự chạy lên DB thật nếu chưa được phép).
3. **Không lộ đáp án trước khi nộp / trước khi bấm Kiểm tra**: mọi trường mới (lời giải từng lựa chọn, mục SGK, ghi nhớ)
   chỉ trả ra khi `reveal = true` trong `exam_attempt_view` — giống `explanation` hiện nay.
4. **Câu hỏi tự soạn**, không chép đề của Bộ / NXB / trung tâm / trang khác (kể cả sửa vài chữ). Tư liệu: chỉ trích nguyên
   văn **văn kiện công khai** (Tuyên ngôn độc lập, Lời kêu gọi toàn quốc kháng chiến, Di chúc, văn kiện Đại hội…) có ghi
   nguồn; còn lại là **đoạn tóm lược do web viết** và ghi rõ "Tóm lược của biên tập viên".
5. Mỗi câu có `source_note` ghi **tới mục**: `SGK Lịch sử 12 (KNTT), Bài 7, mục 3`. Số liệu / ngày tháng chưa chắc → ghi
   vào `docs/du-lieu-can-kiem-chung.md`, không đoán.
6. Hết mỗi giai đoạn: `npm run lint`, `npm test`, `npm run kiem-tra-ngan-hang`, SQL test liên quan, E2E liên quan, cập
   nhật `docs/test-report.md` (mục mới), cập nhật bảng GĐ trong `docs/ke-hoach-luyen-thi.md`, **commit riêng**.

---

## 2. Skill và công cụ Claude Code nên dùng

### 2.1. Tạo 2 skill dự án (làm ở GĐ-D0, nội dung đầy đủ ở Phụ lục C)

| Skill | Đặt ở | Dùng khi |
|---|---|---|
| `soan-cau-hoi-lich-su` | `.claude/skills/soan-cau-hoi-lich-su/SKILL.md` | Mỗi lần soạn / sửa câu trong `supabase/content/ngan-hang/*.json`: định dạng JSON mới, quy tắc phương án nhiễu, quy tắc ý sai Đúng/Sai, cách viết lời giải "sai ở đâu – bài nào – mục nào", checklist tự kiểm |
| `kiem-tra-de-thpt` | `.claude/skills/kiem-tra-de-thpt/SKILL.md` | Khi ghép / sửa một đề `thpt_2025`: kiểm 24 + 4, ma trận bài, mức độ, tư liệu, rải đáp án, lớp 11, thứ tự câu; chạy script kiểm đề |

Có thể dùng skill `skill-creator` (nếu Claude Code có) để tạo và chạy thử 2 skill này; không có thì tạo tay theo Phụ lục C.

### 2.2. Cách dùng Claude Code cho task này

- **Plan mode** (Shift+Tab) ở đầu mỗi giai đoạn: đọc file, đề xuất diff, chờ duyệt rồi mới sửa.
- **Subagent `Explore`** cho GĐ-D1 (quét toàn bộ chỗ dùng `explanation`, `lesson_slug`, `statement_explanations` trong
  `lib/`, `components/`, `app/`, `supabase/`).
- **Subagent soát nội dung độc lập** (tạo `.claude/agents/soat-cau-hoi.md`, chỉ có quyền đọc): sau khi soạn xong mỗi bài,
  giao cho agent này đọc file JSON *mà không xem quá trình soạn* để tìm: sai kiến thức, đáp án tranh cãi, phương án nhiễu
  vô lý, lời giải không chỉ ra chỗ sai, mục SGK gắn sai. Agent trả danh sách → agent chính sửa. (Câu hỏi lịch sử sai một chữ
  là mất uy tín khi demo cho giáo viên.)
- **Playwright** (đã có trong repo, `npm run test:e2e`) để chụp ảnh màn hình demo vào `docs/screenshots/`.
- Mỗi giai đoạn kết thúc bằng `/review` (hoặc tự đọc lại diff) trước khi commit.

---

## 3. GĐ-D0 — Khảo sát và chuẩn bị (không sửa code nghiệp vụ)

1. Đọc: `AGENTS.md`, `CLAUDE.md`, `docs/ke-hoach-luyen-thi.md`, `docs/huong-dan-soan-cau-hoi.md`,
   `docs/du-lieu-can-kiem-chung.md`.
2. Đọc code liên quan:
   - Dữ liệu: `lib/exams/items.ts` (zod schema), `lib/exams/attempt.ts` (kiểu `AttemptQuestion`, parse view),
     `lib/exams/compose.ts` (độ xoay `choice_shift`), `lib/exams/blueprint.ts`, `lib/exams/format.ts`,
     `lib/sgk/curriculum.ts` (bài, mục `muc-N`, `sgkPaths.section`).
   - SQL: `supabase/migrations/20261025000000_exam_bank.sql` (bảng, trigger `exam_item_integrity`, fingerprint),
     `20261029000000_exam_quality.sql` (bản **mới nhất** của `exam_attempt_view`), `20261027000000_exam_practice.sql`
     (`start_practice_attempt`, `check_attempt_item` — chỉ lấy câu `published`).
   - Giao diện: `components/exams/result/SolutionItem.tsx` (dùng chung cho trang kết quả **và** luyện tập sau "Kiểm tra"),
     `components/exams/practice/PracticeRoom.tsx`, `components/exams/result/ExamResult.tsx`,
     `components/exams/ExamItemPreview.tsx`, `components/admin/exam-bank/ExamItemForm.tsx`, `ImportForm.tsx`.
   - Nội dung + công cụ: `supabase/content/ngan-hang/*.json`, `scripts/build-exam-bank-sql.mjs`,
     `tests/unit/exam-bank-content.test.ts`, `supabase/seed-exam-mau.sql`, `supabase/seed-payments.sql` (đã tạo sẵn
     `de-1` … `de-10`, `de-1` miễn phí, còn lại thuộc gói).
3. Kiểm tra trên trang `/bai/7-khang-chien-chong-phap` rằng từng mục có `id="muc-N"` (neo để liên kết tới) — nếu chưa
   có thì ghi lại, sửa ở GĐ-D1.
4. Tạo 2 skill (Phụ lục C) + agent `soat-cau-hoi`. Commit: `chore: skill soạn câu hỏi và kiểm đề THPT`.

---

## 4. GĐ-D1 — Làm giàu lời giải: "sai ở đâu – bài nào – mục nào"

### 4.1. Hiện trạng

`exam_items` chỉ có `explanation` (1 đoạn chung) + `lesson_slug`; ý Đúng/Sai có `explanation` riêng. Trang lời giải
hiện "Em chọn B… Đáp án đúng: C…" + đoạn giải thích + liên kết **tới bài** (không tới mục). Không có lời giải riêng cho
từng phương án sai, không có vị trí trong bài, không có kiểu bẫy.

### 4.2. Dữ liệu mới (migration `supabase/migrations/20261101000000_exam_item_explain.sql`)

Thêm cột vào `public.exam_items` (đều cho phép null để câu cũ vẫn hợp lệ):

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `section_id` | `text` | `null` hoặc `^muc-[0-9]{1,2}$` | Mục SGK chứa kiến thức chính của câu (cùng `lesson_slug`) |
| `choice_notes` | `jsonb` | null, hoặc mảng **đúng 4** object, chỉ khi `kind = 'mcq'` | Lời giải **theo thứ tự lựa chọn gốc**: `{ "note": text 10–500, "lesson_slug"?: slug, "section_id"?: "muc-N", "ref"?: text ≤ 160 }` |
| `remember` | `text` | null hoặc 10–300 ký tự | "Ghi nhớ": 1 câu chốt kiến thức (vd. "Điện Biên Phủ 7-5-1954 đập tan hoàn toàn kế hoạch Na-va") |
| `content_key` | `text` | null hoặc `^[a-z0-9]+(-[a-z0-9]+)*$`, **unique** | Khóa ổn định để seed chạy lại / đề tham chiếu câu (vd. `b7-m3-tn-05`) |

Mở rộng object trong `statements` (jsonb, trigger kiểm): mỗi ý thêm tùy chọn `section_id`, `lesson_slug`, `ref`, `trap`.
`trap` ∈ `thoi_gian | chu_the | dia_diem | so_lieu | nhan_qua | tuyet_doi | khai_niem | ban_chat` (chỉ có ở ý **sai**).
Với câu trắc nghiệm, mỗi phần tử `choice_notes` cũng có thể có `trap`.

Việc trong migration:

1. `alter table … add column …` + các `check`.
2. Cập nhật trigger `exam_item_integrity()` (copy bản hiện tại, thêm kiểm): `choice_notes` chỉ đi với `mcq`, đủ 4 phần
   tử, mỗi `note` là chuỗi 10–500 ký tự; `section_id` trong ý / lựa chọn đúng mẫu; `trap` trong danh sách. **Không đổi
   công thức fingerprint** (để câu cũ không bị tính là câu mới).
3. `create or replace function public.exam_attempt_view(...)` — copy **nguyên thân** bản ở
   `20261029000000_exam_quality.sql`, chỉ thêm (tất cả bọc `case when q.reveal …`):
   - `'section_id'`, `'remember'`;
   - `'choice_notes'`: **xoay theo đúng công thức của `choices`**:
     `to_jsonb(array(select q.choice_notes -> (((k - a.choice_shifts[q.n] + 4) % 4)) from generate_series(0,3) k order by k))`
     — học sinh thấy lựa chọn gốc i ở vị trí (i + shift) mod 4, nên lời giải phải theo đúng vị trí đó;
   - `'statement_refs'`: mảng `{section_id, lesson_slug, ref, trap}` của từng ý.
4. Không bảng mới → không cần RLS mới; nhưng kiểm lại `grant` cột trên `exam_items` (học sinh vẫn **không** đọc được bảng).
5. SQL test mới `supabase/tests/exam_explain.sql` (tự `rollback`): câu mcq có `choice_notes` 3 phần tử bị từ chối;
   `true_false` có `choice_notes` bị từ chối; lượt chưa nộp **không** có `choice_notes` / `section_id` trong view; sau khi
   nộp có, và `choice_notes[vị trí hiển thị]` khớp `choices[vị trí hiển thị]` với `choice_shift` = 0, 1, 2, 3.

### 4.3. TypeScript

- `lib/exams/items.ts`: thêm vào `examItemSchema` các trường mới; `superRefine` kiểm `section_id` **có thật trong bài**
  (`getSgkLesson(lesson_slug).sections`), `choice_notes` đủ 4 khi có, cảnh báo (không chặn) khi câu mcq lớp 12 thiếu
  `choice_notes` / `section_id`. Thêm `TRAP_KINDS` + nhãn tiếng Việt:
  `thoi_gian: "Đánh tráo thời gian"`, `chu_the: "Đánh tráo chủ thể"`, `dia_diem: "Nhầm địa điểm"`, `so_lieu: "Sai số liệu"`,
  `nhan_qua: "Nhầm nguyên nhân – kết quả"`, `tuyet_doi: "Tuyệt đối hóa (duy nhất, hoàn toàn…)"`,
  `khai_niem: "Nhầm khái niệm"`, `ban_chat: "Hiểu sai bản chất sự kiện"`.
- `lib/exams/attempt.ts`: parse thêm `section_id`, `remember`, `choice_notes`, `statement_refs` vào `AttemptQuestion`.
- `lib/database.types.ts`: cập nhật kiểu cột mới (sửa tay theo đúng mẫu file, hoặc sinh lại nếu có lệnh).
- `scripts/build-exam-bank-sql.mjs`: ghi thêm cột mới; dùng `content_key` khi có:
  `on conflict (content_key) do update set … where exam_items.workflow_status in ('draft','in_review')` (không đè câu đã
  công bố); câu không có `content_key` giữ hành vi cũ (`on conflict (fingerprint) do nothing`).
- `tests/unit/exam-bank-content.test.ts` + test của `items.ts`: thêm kiểm `section_id` hợp lệ, `choice_notes` đủ 4, mỗi
  ý sai của Đúng/Sai có `trap`, không có `content_key` trùng giữa các tệp.

### 4.4. Giao diện lời giải (`components/exams/result/SolutionItem.tsx`)

Thiết kế khối lời giải cho **câu trắc nghiệm** khi em chọn sai:

```
Câu 5.  …câu hỏi…                                        0 / 0,25 điểm
✗ Em chọn B. Chiến dịch Biên giới thu – đông 1950
   Vì sao sai: Chiến dịch Biên giới (1950) giúp ta giành quyền chủ động trên chiến trường chính Bắc Bộ — diễn ra
   3 năm TRƯỚC khi Pháp đề ra kế hoạch Na-va (1953).            [Nhầm thời gian]
   📖 Kiến thức này ở: Bài 7 › Mục 2. Giai đoạn 1946–1950  →
✓ Đáp án đúng: D. Chiến dịch Điện Biên Phủ (1954)
   Vì sao đúng: …  📖 Bài 7 › Mục 3. Giai đoạn 1951–1954 và chiến dịch Điện Biên Phủ  →
▸ Xem giải thích cả 4 phương án   (A, C gập lại; mở ra thấy lời giải + vị trí từng phương án)
💡 Ghi nhớ: Điện Biên Phủ (13-3 → 7-5-1954) đập tan hoàn toàn kế hoạch Na-va.
Liên quan: Sự kiện "Chiến dịch Điện Biên Phủ" · Bản đồ phim · Mô hình 3D       [Báo lỗi]
```

- **Câu Đúng/Sai**: mỗi ý một dòng như hiện nay, thêm: nhãn kiểu bẫy (ý sai), "📖 Bài N › Mục M" (liên kết
  `sgkPaths.section(lesson, section)`), ý em làm sai được tô nền nhạt.
- Câu lớp 11 (không có trang bài trên web): hiện `ref` dạng chữ ("SGK Lịch sử 11, Bài 12, mục 2"), không liên kết.
- Nhãn mục lấy từ `lib/sgk/curriculum.ts` (`Bài 7 › Mục 3. <title>`), **không** lưu tên mục trong DB.
- Liên kết "Liên quan": dùng `featureSlugs` / `eventSlugs` của mục (đã có trong curriculum) — đây là điểm "wow" khi demo.
- Accessibility: ✓ / ✗ luôn kèm chữ ("Đúng", "Sai"), không chỉ màu; `<details>` cho "Xem giải thích cả 4 phương án".
- Không đổi gì ở phòng thi (`components/exams/runner/*`) — câu chưa nộp không có dữ liệu mới.

### 4.5. Trang kết quả: khối "Kiến thức cần ôn lại" (`ExamResult.tsx`)

Tính phía trình duyệt từ danh sách câu đã reveal: gom câu chưa đạt tối đa theo `(lesson_slug, section_id)` → danh sách
"Bài 7 › Mục 3 — sai 3/5 câu → [Đọc lại mục] [Luyện 10 câu bài này]" (nút luyện dẫn `/luyen-thi/luyen-tap?bai=<slug>`),
sắp theo số câu sai giảm dần, tối đa 5 dòng. Luyện tập (PracticeRoom) hiện cùng khối này ở màn tổng kết lượt luyện.

### 4.6. Quản trị

- `ExamItemForm.tsx`: ô chọn **Mục** (lọc theo bài đã chọn), 4 ô "Giải thích phương án A/B/C/D" (+ chọn mục / kiểu bẫy
  cho từng phương án, mặc định cùng bài), ô "Ghi nhớ"; với Đúng/Sai: thêm mục + kiểu bẫy cho từng ý.
- `ExamItemPreview.tsx` (bản xem trước của kiểm duyệt viên): hiện đủ dữ liệu mới.
- `ImportForm.tsx` / trang "Nhập từ JSON": nhận định dạng mới (Phụ lục A); cập nhật mô tả định dạng trên trang.
- `docs/huong-dan-soan-cau-hoi.md`: thêm mục "Lời giải từng phương án và vị trí kiến thức".

### 4.7. Kiểm thử GĐ-D1

Unit (schema, xoay `choice_notes`, gom "kiến thức cần ôn") · SQL `exam_explain.sql` · E2E: nộp đề có câu sai → thấy "Vì sao
sai", nhãn bẫy, liên kết `#muc-N` mở đúng mục; **kiểm HTML / RSC / phản hồi API trước khi nộp không chứa `choice_notes`,
`section_id`, `remember`**. Commit: `feat(luyen-thi): lời giải từng phương án + vị trí kiến thức trong bài`.

---

## 5. GĐ-D2 — Nội dung luyện tập chi tiết cho Bài 6, 7, 8

### 5.1. File

- `supabase/content/ngan-hang/bai-06-cach-mang-thang-tam.json`
- `supabase/content/ngan-hang/bai-07-khang-chien-chong-phap.json`
- `supabase/content/ngan-hang/bai-08-khang-chien-chong-my.json`

**Chuyển** các câu nháp sẵn có của 3 bài này từ `chu-de-3.json` sang file mới (6 + 7 + 5 = 18 câu), bổ sung đủ trường mới,
sửa nếu cần — **không** để một câu nằm ở hai file (test trùng sẽ báo). Những câu đó tính vào chỉ tiêu bên dưới.

### 5.2. Chỉ tiêu mỗi bài (để mọi bộ lọc ở trang Luyện tập đều ra đủ câu)

Mỗi bài **30 trắc nghiệm + 8 Đúng/Sai = 38 câu**:

| Tiêu chí | Trắc nghiệm (30) | Đúng/Sai (8) |
|---|---|---|
| Mức độ | Nhận biết 12 · Thông hiểu 9 · Vận dụng 9 | Nhận biết 2 · Thông hiểu 3 · Vận dụng 3 (mức của câu = mức ý khó nhất) |
| Có tư liệu | ≥ 10 câu (dùng 3–4 đoạn tư liệu, mỗi đoạn 2–4 câu) | ≥ 5 câu |
| Không tư liệu | còn lại | còn lại |
| Năng lực | Tìm hiểu LS ~40% · Nhận thức & tư duy ~35% · Vận dụng ~25% | như trên |

→ Lọc 1 bài × "Trắc nghiệm" × "Vận dụng" vẫn có 9 câu; 1 bài × "30 câu" đủ; 3 bài × "Chỉ câu có tư liệu" ≥ 45 câu.

Phân bố theo **mục** (theo `lib/sgk/curriculum.ts`):

| Bài | Mục | Trắc nghiệm | Đúng/Sai | Nội dung trọng tâm cần phủ |
|---|---|---|---|---|
| 6 | muc-1 Khái quát CMT8 | 18 | 5 | Thời cơ (Nhật đầu hàng Đồng minh 15-8), Hội nghị toàn quốc của Đảng (Tân Trào 14 → 15-8), Quốc dân Đại hội Tân Trào (16-8), Ủy ban Dân tộc giải phóng, khởi nghĩa Hà Nội 19-8, Huế 23-8, Sài Gòn 25-8, 4 tỉnh giành chính quyền sớm nhất (Bắc Giang, Hải Dương, Hà Tĩnh, Quảng Nam 14→18-8), vua Bảo Đại thoái vị 30-8, Tuyên ngôn độc lập 2-9 |
| 6 | muc-2 Nguyên nhân, ý nghĩa, bài học | 12 | 3 | Nguyên nhân chủ quan/khách quan, ý nghĩa trong nước & quốc tế, bài học (đoàn kết, chớp thời cơ, kết hợp lực lượng chính trị & vũ trang, bạo lực cách mạng) |
| 7 | muc-1 1945–1946 | 7 | 2 | Khó khăn sau CMT8 ("ngàn cân treo sợi tóc"), xây dựng chính quyền, Tổng tuyển cử 6-1-1946, Hiệp định Sơ bộ 6-3-1946, Tạm ước 14-9-1946, Lời kêu gọi toàn quốc kháng chiến 19-12-1946 |
| 7 | muc-2 1946–1950 | 7 | 2 | Đường lối kháng chiến (toàn dân, toàn diện, trường kì, tự lực cánh sinh), Việt Bắc thu – đông 1947, Biên giới thu – đông 1950 |
| 7 | muc-3 1951–1954 + ĐBP | 10 | 2 | Đại hội II của Đảng (2-1951), kế hoạch Na-va, Đông – Xuân 1953–1954, Điện Biên Phủ (3 đợt, 13-3 → 7-5-1954), Hiệp định Giơ-ne-vơ 21-7-1954 |
| 7 | muc-4 Nguyên nhân, ý nghĩa | 6 | 2 | |
| 8 | muc-1 1954–1965 | 7 | 2 | Hai miền hai nhiệm vụ, Đồng khởi 1959–1960, Mặt trận Dân tộc giải phóng miền Nam (20-12-1960), "Chiến tranh đặc biệt", Ấp Bắc 1963, đường Trường Sơn |
| 8 | muc-2 1965–1973 | 9 | 2 | "Chiến tranh cục bộ", Vạn Tường, Tết Mậu Thân 1968, "Việt Nam hóa chiến tranh", Hà Nội – Điện Biên Phủ trên không 12-1972, Hiệp định Pa-ri 27-1-1973 |
| 8 | muc-3 1973–1975 | 8 | 2 | Phước Long, Tây Nguyên, Huế – Đà Nẵng, chiến dịch Hồ Chí Minh (26 → 30-4-1975) |
| 8 | muc-4 Nguyên nhân, ý nghĩa | 6 | 2 | |

**Mọi dữ kiện cụ thể** (ngày, số liệu, tên hội nghị) phải đối chiếu SGK in trước khi công bố; cái nào Claude Code không
chắc → thêm vào `docs/du-lieu-can-kiem-chung.md` và đánh dấu câu bằng `review_note`.

### 5.3. Quy tắc chất lượng (bắt buộc cho từng câu — chi tiết trong skill `soan-cau-hoi-lich-su`)

1. **Trắc nghiệm**: đủ 4 `choice_notes`. Lời giải phương án sai phải nói **sự thật của phương án đó** (nó là gì, xảy ra
   khi nào) + **vì sao không khớp câu hỏi** + vị trí (bài/mục *của phương án đó*, có thể khác bài của câu). Lời giải phương
   án đúng nói vì sao đúng. Không viết "B sai vì không đúng".
2. Phương án nhiễu: cùng loại, cùng giai đoạn, độ dài tương đương; ≥ 1 phương án nhiễu "gần" (cùng bài, khác mục).
3. **Đúng/Sai**: 4 ý độc lập, 1–3 ý đúng; ý a thường Nhận biết, ý d thường Vận dụng (rút ra nhận xét / bài học / liên hệ);
   ý sai có `trap` và lời giải nêu **chỗ bị đánh tráo** ("đề viết *duy nhất* — thực tế còn…").
4. **Tư liệu**: câu phải **cần đọc tư liệu mới làm được**; tư liệu 300–1200 ký tự, có `source_citation`.
5. Câu Vận dụng: so sánh, nhận xét, rút bài học, liên hệ hiện nay — không phải nhớ ngày tháng khó hơn.
6. Đáp án đúng của trắc nghiệm rải đều trong file (mỗi chữ cái gốc ~25%); dù khi ghép đề có xoay vẫn nên rải để bản xem
   trước dễ duyệt.
7. `content_key`: `b<bài>-m<mục>-tn-<nn>` / `b<bài>-m<mục>-ds-<nn>`, ví dụ `b7-m3-tn-05`.

### 5.4. Quy trình soạn trong Claude Code (mỗi bài một vòng)

1. Đọc mục tiêu bài + mục trong `curriculum.ts`, sự kiện đã công bố của bài (`supabase/seed-content*.sql`, trang `/bai/…`)
   để lời giải khớp nội dung web.
2. Soạn 3–4 đoạn tư liệu trước, rồi câu theo bảng 5.2.
3. `npm run kiem-tra-ngan-hang` → sửa hết lỗi / cảnh báo.
4. Giao subagent `soat-cau-hoi` soát độc lập → sửa → chạy lại bước 3.
5. In bảng thống kê (script nhỏ `scripts/thong-ke-ngan-hang.mjs`: đếm theo bài × mục × dạng × mức × tư liệu) và dán vào
   `docs/test-report.md` để chứng minh đủ chỉ tiêu.
6. Commit từng bài: `content(ngan-hang): Bài 7 — 30 TN + 8 Đ/S, lời giải từng phương án`.

---

## 6. GĐ-D3 — Đề luyện thi số 3 chuẩn cấu trúc THPT

### 6.1. Thông số đề

| Thuộc tính | Giá trị |
|---|---|
| `slug` | `de-3` (đã có sẵn dòng nháp từ `seed-payments.sql`) |
| `title` | `Đề luyện thi số 3 (đầy đủ, cấu trúc thi tốt nghiệp từ 2025)` |
| `format` | `thpt_2025` · `duration_min` = 50 · `difficulty` = 2 |
| `description` | "Đề đầy đủ 24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút, thang 10 điểm — đúng cấu trúc đề thi tốt nghiệp THPT môn Lịch sử từ năm 2025. Có lời giải từng phương án và chỉ ra kiến thức nằm ở bài, mục nào." |
| `product_id` | **Mặc định đề xuất: `null` (miễn phí)** — khớp mục 5 kế hoạch gốc ("miễn phí 1 đề đầy đủ") và để giáo viên mở được ngay khi demo. Chủ dự án xác nhận (mục 10). |

### 6.2. Ma trận đề số 3

**Phần I — 24 câu trắc nghiệm (6 điểm)**: 20 câu lớp 12 chia theo số tiết (Chủ đề 1: 3 · 2: 2 · 3: 5 · 4: 3 · 5: 3 · 6: 4)
+ 4 câu lớp 11.

| Câu | Phạm vi | Mức | Tư liệu |
|---|---|---|---|
| 1 | Bài 1 Liên hợp quốc | NB | |
| 2 | Bài 2 Chiến tranh lạnh | NB | |
| 3 | Bài 3 Thế giới sau Chiến tranh lạnh | TH | |
| 4 | Bài 4 ASEAN | NB | |
| 5 | Bài 5 Cộng đồng ASEAN | VD (liên hệ Việt Nam) | |
| 6 | Bài 6 CMT8 | NB | |
| 7 | Bài 7 chống Pháp | TH | ✔ (tư liệu T1, dùng chung câu 7–8) |
| 8 | Bài 7 chống Pháp | VD | ✔ (T1) |
| 9 | Bài 8 chống Mỹ | NB | |
| 10 | Bài 8 chống Mỹ | TH | |
| 11 | Bài 9 Bảo vệ Tổ quốc sau 4/1975 | TH | |
| 12 | Bài 10 Đổi mới | NB | |
| 13 | Bài 10 Đổi mới | VD | ✔ (tư liệu T2) |
| 14 | Bài 11 Thành tựu Đổi mới | TH | |
| 15 | Bài 12 Đối ngoại đầu TK XX – 1945 | NB | |
| 16 | Bài 13 Đối ngoại 1945–1975 | TH | |
| 17 | Bài 14 Đối ngoại từ 1975 | NB | |
| 18 | Bài 15 Cuộc đời Hồ Chí Minh | NB | |
| 19 | Bài 16 HCM – anh hùng giải phóng dân tộc | TH | |
| 20 | Bài 16 | VD | |
| 21 | Bài 17 Dấu ấn Hồ Chí Minh | VD (liên hệ hiện nay) | |
| 22 | Lớp 11: Chiến tranh bảo vệ Tổ quốc (vd. khởi nghĩa Lam Sơn) | NB | |
| 23 | Lớp 11: Cải cách trong lịch sử (vd. Lê Thánh Tông / Minh Mạng) | TH | |
| 24 | Lớp 11: Biển Đông / chủ quyền | VD | |

Tổng Phần I: NB 10 · TH 8 · VD 6 (cộng Phần II thì tỉ lệ toàn đề sát 40 / 30 / 30). Thứ tự câu: theo mạch chương trình
lớp 12, khối lớp 11 xếp cuối Phần I (hoặc đổi vị trí nếu giáo viên muốn — ghi trong mục 10).

**Phần II — 4 câu Đúng/Sai (4 điểm)**, cả 4 câu dựa trên tư liệu (đề thật thiên về tư liệu), mỗi câu: ý a NB, ý b TH,
ý c TH, ý d VD; mỗi câu có 1–3 ý đúng, tổng 4 câu có 7–9 ý đúng (không để đáp án toàn Đ hoặc toàn S theo cột):

| Câu | Tư liệu (chủ đề) | Bài liên quan |
|---|---|---|
| 1 | Tư liệu về Hiệp định Giơ-ne-vơ 1954 / bước ngoặt Điện Biên Phủ | Bài 7 (+ Bài 13) |
| 2 | Trích văn kiện công khai thời kì chống Mỹ (vd. Hiệp định Pa-ri 1973 — điều khoản công nhận quyền dân tộc cơ bản) | Bài 8 (+ Bài 13) |
| 3 | Trích văn kiện Đại hội VI (1986) về đường lối Đổi mới | Bài 10, 11 |
| 4 | Tư liệu về ASEAN / hội nhập quốc tế của Việt Nam | Bài 4, 5, 14 |

### 6.3. Nguồn câu và cách dựng

1. Câu lớp 12: ưu tiên lấy từ ngân hàng (sau GĐ-D2 Bài 6–8 rất giàu; các bài khác dùng câu nháp sẵn có đã bổ sung trường
   mới), thiếu thì soạn mới vào file của bài đó. **Mọi câu trong đề số 3 phải có đủ `section_id` + `choice_notes` /
   `trap`** — đề này là đề mẫu để demo lời giải.
2. Câu lớp 11: soạn mới trong `supabase/content/ngan-hang/lop-11.json` với `grade: 11`, `topic_tag` (vd. "Lớp 11 –
   Chiến tranh bảo vệ Tổ quốc"), không có `lesson_slug`; vị trí ghi ở `ref` và `source_note` ("SGK Lịch sử 11 (KNTT),
   Bài …, mục …" — Claude Code **phải hỏi chủ dự án / ghi vào danh sách kiểm chứng** số bài, mục lớp 11 vì repo không có
   khung SGK 11).
3. Câu của đề **không được trùng** câu ở `de-1`, `de-2` (bảng `exam_questions` cũ) và không trùng nhau (fingerprint).
4. File mô tả đề: `supabase/content/de-thi/de-3.json`:
   ```json
   {
     "slug": "de-3", "format": "thpt_2025", "duration_min": 50, "difficulty": 2, "free": true,
     "title": "…", "description": "…",
     "section1": ["b1-m2-tn-01", "b2-m1-tn-03", "…24 content_key theo đúng thứ tự…"],
     "section2": ["de3-ds-01", "de3-ds-02", "de3-ds-03", "de3-ds-04"]
   }
   ```
5. Script mới `scripts/build-exam-set-sql.mjs` → sinh `supabase/seed-de-3.sql`:
   - kiểm: đúng 24 mcq ở section 1, 4 true_false ở section 2, mọi key tồn tại trong JSON ngân hàng, không trùng;
   - tính `choice_shift` bằng **đúng thuật toán của `lib/exams/compose.ts`** (import lại hoặc tách hàm thuần dùng chung):
     đáp án đúng ra **6 A · 6 B · 6 C · 6 D**, không quá 3 câu liền cùng chữ cái;
   - SQL: cập nhật `exam_sets` (title, description, format, duration_min, difficulty, product_id), xóa/chèn
     `exam_set_items` theo `content_key`, chạy lại được.
6. Chạy `kiem-tra-de-thpt` (skill + script `scripts/kiem-tra-de.mjs`, Phụ lục C) → in báo cáo ma trận: số câu theo
   chủ đề / mức / tư liệu / lớp, phân bố đáp án A–D, số ý đúng Phần II.
7. Sửa mô tả `de-1`, `de-2` ("Đề đầy đủ … đang được biên soạn" → "Xem đề đầy đủ: Đề luyện thi số 3").

Commit: `content(luyen-thi): đề số 3 đầy đủ 24 + 4 theo cấu trúc thi tốt nghiệp`.

---

## 7. GĐ-D4 — Seed demo và công bố

Câu trong ngân hàng đang ở **nháp**, mà luyện tập / đề chỉ dùng câu **đã công bố** → cần một bước công bố.

**Cách chuẩn (khuyến nghị nếu có thời gian):** giáo viên / kiểm duyệt viên lọc "Nháp" ở `/quan-tri/ngan-hang-cau-hoi`,
xem trước, gửi duyệt rồi công bố hàng loạt (≤ 200 câu/lượt); mở `de-3` ở "Đề luyện thi", gửi duyệt, công bố (công bố đề
sẽ công bố luôn câu đang chờ duyệt). → Đây cũng là một phần hay để demo quy trình cho giáo viên.

**Cách nhanh cho buổi demo:** file `supabase/seed-demo-luyen-thi.sql` (theo mẫu cảnh báo của `seed-exam-mau.sql`):

1. Đầu file ghi rõ ⚠: *chạy file này sẽ CÔNG BỐ câu của Bài 6, 7, 8 + các câu và tư liệu của đề số 3, chưa qua màn hình
   kiểm duyệt*; đặt `review_note = 'Demo 10/2026 — cần giáo viên đối chiếu SGK in'`.
2. Thứ tự chạy: migration GĐ-D1 → `seed-ngan-hang.sql` (sinh lại) → `seed-de-3.sql` → `seed-demo-luyen-thi.sql`.
3. Công bố theo `content_key` (tư liệu trước, câu sau, đề cuối), chạy lại được.
4. Cuối file: các câu `select` kiểm tra (số câu đã công bố theo bài / dạng; `de-3` có 24 + 4 câu, `published`).

Claude Code **chỉ sinh file và đưa chủ dự án xem**; chủ dự án tự chạy trong SQL Editor (hoặc cho phép chạy bằng
`DATABASE_URL` như đã làm ở GĐ7).

---

## 8. GĐ-D5 — Kiểm thử tổng

| Loại | Nội dung |
|---|---|
| Unit | Schema mới; xoay `choice_notes`; thuật toán rải đáp án cho đề 3 (6/6/6/6); thống kê ma trận; gom "kiến thức cần ôn" |
| Nội dung | `npm run kiem-tra-ngan-hang` sạch; `node scripts/kiem-tra-de.mjs de-3` đạt; bảng đếm bài 6–8 đạt chỉ tiêu 5.2 |
| SQL | `supabase/tests/exam_explain.sql` + chạy lại các test cũ `exam_attempts.sql`, `exam_practice.sql`, `exam_quality.sql`, `exam_paper.sql` (đảm bảo `exam_attempt_view` mới không phá chức năng cũ) |
| E2E (Playwright) | (1) Luyện tập: chọn Bài 7 × Trắc nghiệm × Vận dụng × Chỉ câu có tư liệu × 10 câu → ra đủ câu, có khung tư liệu; trả lời sai → thấy "Vì sao sai", nhãn bẫy, liên kết `Bài 7 › Mục 3` mở đúng neo. (2) Đề 3: phòng thi hiện Phần I 24 + Phần II 4, đồng hồ 50:00; nộp → điểm thang 10, khối "Kiến thức cần ôn lại". (3) **Không lộ đáp án**: quét HTML/RSC/API trước khi nộp không có `correct_index`, `choice_notes`, `truths`, `section_id`. (4) 360 / 768 / 1280 px, `axe` không lỗi nghiêm trọng |
| Hồi quy | Đề 1, đề 2 cũ vẫn làm được; bản in đề 3 (`/luyen-thi/de-3/in`) đúng 2 phần; đề tự sinh: nếu ngân hàng đã đủ câu thì ma trận tự hiện — kiểm không lỗi |

Cập nhật `docs/test-report.md` (mục mới), ảnh chụp vào `docs/screenshots/demo-*.png`.

---

## 9. GĐ-D6 — Kịch bản demo cho giáo viên (`docs/kich-ban-demo-luyen-thi.md`)

Claude Code viết file này kèm ảnh chụp, gồm ~10 bước, mỗi bước: thao tác · điều cần chỉ cho giáo viên · ảnh:

1. `/luyen-thi` → danh sách đề: đề 1 (mẫu miễn phí), đề 2 (thuộc gói), **đề 3 đầy đủ**.
2. Làm đề 3: 2 phần, tư liệu chia đôi màn hình, đánh dấu câu, phiếu trả lời, tự lưu (tải lại trang không mất bài).
3. Nộp → điểm từng phần, biểu đồ theo bài / mức độ / dạng, **"Kiến thức cần ôn lại"**.
4. Mở 1 câu sai → **Vì sao sai + Bài 7 › Mục 3** → bấm vào liên kết → trang bài học đúng mục (bản đồ phim Điện Biên Phủ).
5. Câu Đúng/Sai → lời giải từng ý + kiểu bẫy ("Tuyệt đối hóa", "Đánh tráo thời gian").
6. Luyện tập: Bài 6 + 7 + 8, lần lượt thử từng bộ lọc; "Kiểm tra" từng câu.
7. "Ưu tiên câu em từng sai" / Sổ câu sai (cần tài khoản).
8. Bản in đề 3 + nhập đáp án giấy.
9. (Quản trị) Ngân hàng câu hỏi: lọc theo bài, xem trước, mục SGK, giải thích 4 phương án; trang soạn đề kiểm 24 + 4.
10. Cách giáo viên góp ý: nút "Báo lỗi" → hàng đợi báo lỗi.

Kèm chuẩn bị trước buổi demo: tài khoản học sinh có gói (để mở đề 2, sổ câu sai), 1 lượt đề 3 đã nộp sẵn có vài câu sai.

---

## 10. Câu cần chủ dự án xác nhận (Claude Code dùng mặc định, ghi lại trong `docs/ke-hoach-luyen-thi.md` mục 9)

| # | Câu hỏi | Mặc định |
|---|---|---|
| 1 | 3 bài làm demo | Bài 6, 7, 8 |
| 2 | Đề số 3 miễn phí hay thuộc gói? | Miễn phí (để demo + đúng "1 đề đầy đủ miễn phí") |
| 3 | Số câu lớp 11 trong đề 3 | 4 câu ở Phần I, Phần II toàn lớp 12 |
| 4 | Tỉ lệ mức độ | 40 / 30 / 30 (`LEVEL_MIX_SUGGESTED`) |
| 5 | Công bố cho demo bằng seed SQL hay qua giao diện duyệt? | Seed SQL `seed-demo-luyen-thi.sql`, kèm `review_note` để giáo viên duyệt lại |
| 6 | Claude Code được tự chạy migration bằng `DATABASE_URL`? | Không — chỉ sinh file, chủ dự án chạy |

---

## 11. Checklist nghiệm thu cuối

- [ ] Bài 6, 7, 8 mỗi bài ≥ 30 TN + 8 Đ/S đã công bố; đếm theo mức / tư liệu đạt bảng 5.2.
- [ ] 100% câu Bài 6–8 và đề 3 có `section_id`; 100% câu TN có 4 `choice_notes`; 100% ý sai Đ/S có `trap` + lời giải chỉ
      rõ chỗ sai.
- [ ] Lời giải hiện "Vì sao sai", "Bài N › Mục M" có liên kết tới đúng neo, "Ghi nhớ", liên kết sự kiện / bài tương tác.
- [ ] Đề 3: 24 + 4, 50 phút, max 10 điểm, ma trận đúng 6.2, đáp án A/B/C/D = 6/6/6/6, ≥ 4 câu có tư liệu, 4 câu lớp 11.
- [ ] Không lộ đáp án / lời giải trước khi nộp (E2E kiểm).
- [ ] Lint, unit, SQL test, E2E xanh; `docs/test-report.md`, `docs/ke-hoach-luyen-thi.md`, `docs/huong-dan-soan-cau-hoi.md`,
      `docs/du-lieu-can-kiem-chung.md` đã cập nhật; mỗi GĐ một commit.
- [ ] Có `docs/kich-ban-demo-luyen-thi.md` + ảnh chụp.

---

## Phụ lục A — Định dạng JSON mới của một câu

```jsonc
{
  "content_key": "b7-m3-tn-05",
  "kind": "mcq",
  "stem": "Chiến dịch nào sau đây đã đập tan hoàn toàn kế hoạch Na-va của thực dân Pháp?",
  "choices": [
    "Chiến dịch Biên giới thu – đông năm 1950",
    "Chiến dịch Việt Bắc thu – đông năm 1947",
    "Chiến dịch Hòa Bình đông – xuân 1951–1952",
    "Chiến dịch Điện Biên Phủ năm 1954"
  ],
  "correct": 3,
  "choice_notes": [
    { "note": "Chiến dịch Biên giới (1950) giúp ta giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ — diễn ra trước khi Pháp đề ra kế hoạch Na-va (1953) nên không thể làm phá sản kế hoạch này.",
      "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-2", "trap": "thoi_gian" },
    { "note": "Thắng lợi Việt Bắc (1947) làm phá sản chiến lược \"đánh nhanh thắng nhanh\" của Pháp, không liên quan kế hoạch Na-va ra đời 6 năm sau.",
      "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-2", "trap": "thoi_gian" },
    { "note": "Chiến dịch Hòa Bình thuộc giai đoạn 1951–1954 nhưng diễn ra trước khi có kế hoạch Na-va (1953).",
      "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3", "trap": "thoi_gian" },
    { "note": "Đúng. Cuộc tiến công chiến lược Đông – Xuân 1953–1954 bước đầu làm phá sản kế hoạch Na-va; chiến dịch Điện Biên Phủ (13-3 → 7-5-1954) đập tan hoàn toàn kế hoạch này.",
      "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3" }
  ],
  "explanation": "Kế hoạch Na-va (1953) là cố gắng cuối cùng của Pháp có Mỹ giúp sức. Phân biệt mốc: Đông – Xuân 1953–1954 làm phá sản bước đầu; Điện Biên Phủ làm phá sản hoàn toàn.",
  "remember": "Điện Biên Phủ (13-3 → 7-5-1954) đập tan hoàn toàn kế hoạch Na-va.",
  "lesson_slug": "7-khang-chien-chong-phap",
  "section_id": "muc-3",
  "event_slug": "chien-dich-dien-bien-phu",
  "level": "thong_hieu",
  "competency": "nhan_thuc_tu_duy",
  "source_note": "SGK Lịch sử 12 (KNTT), Bài 7, mục 3"
}
```

Câu Đúng/Sai có tư liệu (tư liệu do web tóm lược):

```jsonc
{
  "passages": [{
    "key": "b7-gionevo",
    "title": "Hiệp định Giơ-ne-vơ về Đông Dương (1954)",
    "body": "Ngày 21-7-1954, Hiệp định Giơ-ne-vơ về chấm dứt chiến tranh, lập lại hòa bình ở Đông Dương được kí kết. Các nước tham dự hội nghị cam kết tôn trọng các quyền dân tộc cơ bản là độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của ba nước Việt Nam, Lào, Cam-pu-chia. Ở Việt Nam, vĩ tuyến 17 được lấy làm giới tuyến quân sự tạm thời; tổng tuyển cử thống nhất đất nước sẽ được tổ chức vào tháng 7-1956.",
    "source_citation": "Tóm lược của biên tập viên theo SGK Lịch sử 12 (KNTT), Bài 7, mục 3",
    "lesson_slug": "7-khang-chien-chong-phap"
  }],
  "items": [{
    "content_key": "b7-m3-ds-01",
    "kind": "true_false",
    "passage": "b7-gionevo",
    "stem": "Đọc đoạn tư liệu sau đây và cho biết mỗi ý a), b), c), d) đúng hay sai.",
    "statements": [
      { "text": "Hiệp định Giơ-ne-vơ được kí kết sau thắng lợi của chiến dịch Điện Biên Phủ.", "is_true": true,
        "explanation": "Điện Biên Phủ kết thúc 7-5-1954; ngay hôm sau (8-5) hội nghị bàn về Đông Dương khai mạc, hiệp định kí 21-7-1954.",
        "section_id": "muc-3" },
      { "text": "Vĩ tuyến 17 là đường biên giới quốc gia chia Việt Nam thành hai nước.", "is_true": false,
        "explanation": "Tư liệu ghi rõ đây là giới tuyến quân sự TẠM THỜI, chờ tổng tuyển cử 7-1956 — không phải biên giới quốc gia.",
        "section_id": "muc-3", "trap": "khai_niem" },
      { "text": "Các nước tham dự hội nghị cam kết tôn trọng các quyền dân tộc cơ bản của ba nước Đông Dương.", "is_true": true,
        "explanation": "Tư liệu nêu rõ cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam, Lào, Cam-pu-chia.",
        "section_id": "muc-3" },
      { "text": "Với Hiệp định Giơ-ne-vơ, cách mạng dân tộc dân chủ nhân dân đã hoàn thành trên cả nước.", "is_true": false,
        "explanation": "Hiệp định chỉ giải phóng hoàn toàn miền Bắc; miền Nam còn phải tiếp tục đấu tranh — vì vậy mới có cuộc kháng chiến chống Mỹ (Bài 8, mục 1).",
        "lesson_slug": "8-khang-chien-chong-my-cuu-nuoc", "section_id": "muc-1", "trap": "tuyet_doi" }
    ],
    "explanation": "Câu kiểm tra nội dung và ý nghĩa Hiệp định Giơ-ne-vơ: phân biệt giới tuyến quân sự tạm thời với biên giới, và thấy rõ thắng lợi mới trọn vẹn ở miền Bắc.",
    "remember": "Giơ-ne-vơ 21-7-1954: vĩ tuyến 17 là giới tuyến quân sự tạm thời; miền Bắc được giải phóng.",
    "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3",
    "event_slug": "hiep-dinh-geneve-ve-dong-duong",
    "level": "van_dung", "competency": "nhan_thuc_tu_duy",
    "source_note": "SGK Lịch sử 12 (KNTT), Bài 7, mục 3"
  }]
}
```

(Hai câu trên là **mẫu định dạng** — vẫn phải đối chiếu SGK in như mọi câu khác.)

---

## Phụ lục B — Danh sách file dự kiến thay đổi

| Loại | File |
|---|---|
| Migration | `supabase/migrations/20261101000000_exam_item_explain.sql` |
| SQL test | `supabase/tests/exam_explain.sql` |
| Lib | `lib/exams/items.ts`, `lib/exams/attempt.ts`, `lib/exams/compose.ts` (tách hàm rải đáp án dùng chung), `lib/database.types.ts`, (mới) `lib/exams/review-hints.ts` (gom "kiến thức cần ôn") |
| UI | `components/exams/result/SolutionItem.tsx`, `ExamResult.tsx`, `components/exams/practice/PracticeRoom.tsx`, `components/exams/ExamItemPreview.tsx`, `components/admin/exam-bank/ExamItemForm.tsx`, `ImportForm.tsx` |
| Script | `scripts/build-exam-bank-sql.mjs`, (mới) `scripts/build-exam-set-sql.mjs`, `scripts/kiem-tra-de.mjs`, `scripts/thong-ke-ngan-hang.mjs` |
| Nội dung | `supabase/content/ngan-hang/bai-06-…json`, `bai-07-…json`, `bai-08-…json`, `lop-11.json`, các file chủ đề (bổ sung trường cho câu dùng trong đề 3), `supabase/content/de-thi/de-3.json` |
| Seed | `supabase/seed-ngan-hang.sql` (sinh lại), `supabase/seed-de-3.sql`, `supabase/seed-demo-luyen-thi.sql`, `supabase/seed-exam-mau.sql` (sửa mô tả đề 1, 2) |
| Test | `tests/unit/exam-bank-content.test.ts`, test `items`/`compose`, E2E mới `tests/e2e/luyen-thi-demo.spec.ts` |
| Docs | `docs/ke-hoach-luyen-thi.md`, `docs/huong-dan-soan-cau-hoi.md`, `docs/du-lieu-can-kiem-chung.md`, `docs/test-report.md`, (mới) `docs/kich-ban-demo-luyen-thi.md` |
| Claude Code | `.claude/skills/soan-cau-hoi-lich-su/SKILL.md`, `.claude/skills/kiem-tra-de-thpt/SKILL.md`, `.claude/agents/soat-cau-hoi.md` |

---

## Phụ lục C — Nội dung skill / agent để Claude Code tạo

### C.1. `.claude/skills/soan-cau-hoi-lich-su/SKILL.md`

```markdown
---
name: soan-cau-hoi-lich-su
description: Dùng khi soạn hoặc sửa câu hỏi luyện thi Lịch sử 12 trong supabase/content/ngan-hang/*.json (trắc nghiệm, Đúng/Sai, tư liệu) — định dạng, quy tắc phương án nhiễu, lời giải từng phương án kèm bài/mục SGK, checklist tự kiểm.
---

# Soạn câu hỏi luyện thi Lịch sử 12

Đọc trước: docs/huong-dan-soan-cau-hoi.md, lib/sgk/curriculum.ts (slug bài, id mục muc-N), lib/exams/items.ts.

## Định dạng
Theo "Phụ lục A" của docs/ke-hoach-demo-luyen-thi.md. Bắt buộc: content_key, section_id, source_note tới mục;
mcq có đủ 4 choice_notes; ý sai Đúng/Sai có trap.

## Viết câu
- Một câu kiểm tra một ý; không phủ định kép; không "tất cả các ý trên"; không nhắc chữ cái phương án khác.
- Phương án nhiễu cùng loại, cùng giai đoạn, độ dài tương đương; ít nhất một nhiễu "gần" (cùng bài, khác mục).
- Câu tư liệu: phải đọc tư liệu mới trả lời được. Tư liệu chỉ trích nguyên văn văn kiện công khai; còn lại tóm lược và ghi "Tóm lược của biên tập viên".
- Vận dụng = so sánh / nhận xét / bài học / liên hệ hiện nay, không phải ngày tháng hiếm.

## Viết lời giải (quan trọng nhất)
- Phương án sai: (1) sự thật của chính phương án đó, (2) vì sao không khớp câu hỏi, (3) bài/mục chứa phương án đó, (4) trap.
- Phương án đúng: vì sao đúng, dữ kiện chốt.
- Ý sai Đúng/Sai: chỉ đúng chữ bị đánh tráo ("đề viết 'duy nhất' — thực tế…").
- "remember": 1 câu ≤ 300 ký tự để học sinh chép vào sổ.

## Không bịa
Ngày tháng, số liệu, tên hội nghị không chắc → không dùng, hoặc ghi vào docs/du-lieu-can-kiem-chung.md và đặt review_note.

## Tự kiểm trước khi xong
1. npm run kiem-tra-ngan-hang không lỗi, không cảnh báo.
2. node scripts/thong-ke-ngan-hang.mjs → đạt chỉ tiêu bài (30 TN: 12/9/9, ≥10 tư liệu; 8 Đ/S, ≥5 tư liệu).
3. Đáp án gốc rải đều A/B/C/D.
4. Giao agent soat-cau-hoi soát độc lập, sửa hết điểm nó nêu.
```

### C.2. `.claude/skills/kiem-tra-de-thpt/SKILL.md`

```markdown
---
name: kiem-tra-de-thpt
description: Dùng khi ghép, sửa hoặc kiểm một đề luyện thi định dạng thpt_2025 (supabase/content/de-thi/*.json) — kiểm cấu trúc 24 trắc nghiệm + 4 Đúng/Sai, 50 phút, ma trận bài/mức độ/tư liệu/lớp 11, rải đáp án.
---

# Kiểm đề thi tốt nghiệp THPT môn Lịch sử

Cấu trúc (từ 2025, giữ cho 2026; xem lib/exams/format.ts):
- Phần I: 24 câu trắc nghiệm 4 lựa chọn, 0,25 điểm/câu.
- Phần II: 4 câu Đúng/Sai × 4 ý; 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm.
- 50 phút, tối đa 10 điểm.

Chạy: node scripts/kiem-tra-de.mjs <slug>. Đạt khi:
1. Đúng 24 mcq ở section 1, 4 true_false ở section 2, không câu trùng (kể cả với de-1, de-2).
2. Phân bố lớp 12 theo số tiết chủ đề (Chủ đề 1:3 · 2:2 · 3:5 · 4:3 · 5:3 · 6:4) + câu lớp 11 theo ma trận đề.
3. Mức độ toàn đề sát 40/30/30 (lệch ≤ 10 điểm %).
4. ≥ 2 câu Phần I có tư liệu; cả 4 câu Phần II có tư liệu; mỗi câu Phần II 1–3 ý đúng, ý a NB … ý d VD.
5. Sau khi xoay: đáp án Phần I đúng 6 A · 6 B · 6 C · 6 D, không quá 3 câu liền cùng chữ.
6. Mọi câu có section_id (lớp 12) hoặc ref (lớp 11), choice_notes / trap đầy đủ.
In bảng ma trận ra và dán vào docs/test-report.md.
```

### C.3. `.claude/agents/soat-cau-hoi.md`

```markdown
---
name: soat-cau-hoi
description: Soát độc lập một tệp câu hỏi Lịch sử 12 (JSON) — tìm sai kiến thức, đáp án tranh cãi, nhiễu vô lý, lời giải không chỉ ra chỗ sai, mục SGK gắn sai. Chỉ đọc, không sửa.
tools: Read, Grep, Glob
---
Bạn là giáo viên Lịch sử 12 khó tính. Với từng câu trong tệp được giao, kiểm:
1. Kiến thức đúng theo SGK Lịch sử 12 (KNTT)? Có dữ kiện nào nghi ngờ (ngày, số liệu, tên)?
2. Chỉ có đúng một đáp án đúng? Có phương án nào cũng có thể coi là đúng?
3. Phương án nhiễu hợp lý, cùng loại, độ dài tương đương?
4. Lời giải từng phương án / từng ý nói rõ vì sao sai và chỗ bị đánh tráo? section_id có khớp nội dung mục trong lib/sgk/curriculum.ts?
5. Câu tư liệu có thực sự cần đọc tư liệu? Tư liệu có nguồn?
6. Mức độ gắn có hợp lý?
Trả về bảng: content_key | vấn đề | mức (nghiêm trọng / nên sửa) | đề xuất sửa. Không viết lại cả câu nếu không cần.
```

---

## Nguồn tham khảo về cấu trúc đề

- [Cấu trúc đề thi tốt nghiệp THPT 2026 môn Lịch sử — Thư viện Pháp luật](https://thuvienphapluat.vn/phap-luat/cau-truc-de-thi-tot-nghiep-thpt-2026-mon-lich-su-moi-nhat-de-thi-mon-lich-su-co-may-cau-025-diem-261166.html)
- [Đề thi Lịch sử, Địa lí tốt nghiệp THPT 2026: cần tư duy phân tích dữ liệu — Tiền Phong](https://tienphong.vn/de-thi-lich-su-dia-li-tot-nghiep-thpt-can-tu-duy-phan-tich-du-lieu-de-dat-diem-cao-post1850841.tpo)
- [Đề thi môn Lịch sử kỳ thi tốt nghiệp THPT 2026 — VOV](https://vov.vn/xa-hoi/de-thi-mon-lich-su-ky-thi-tot-nghiep-thpt-2026-post1305028.vov)
- Quyết định 764/QĐ-BGDĐT (cấu trúc đề từ 2025) — đã ghi trong `docs/ke-hoach-luyen-thi.md`, mục 1.2.
