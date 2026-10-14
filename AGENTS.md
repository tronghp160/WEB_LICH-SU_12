<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quy tắc database của dự án

- Supabase mặc định cấp quyền mọi bảng mới trong `public` cho `anon` và `authenticated` (migration
  `20260924000003_rls_policies.sql` còn `grant … on all tables … to authenticated`). Vì vậy **mọi bảng mới bắt buộc**
  `enable row level security` và `revoke all … from anon, authenticated` rồi mới `grant` đúng phần cần.
- Quyền nội bộ chỉ đến từ `staff_profiles` qua `current_staff_role()`. Tài khoản học sinh (`learner_profiles`) không bao giờ
  được thêm quyền nội bộ.
- Hàm nghiệp vụ `security definer`: `set search_path = ''`, `revoke all … from public, anon, authenticated`, chỉ
  `grant execute … to service_role`; server tự xác minh phiên rồi mới gọi bằng khóa bí mật.
