import { unstable_rethrow } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { consumeRateLimit } from "@/lib/payments/rate-limit";
import { emptyProgress, parseProgress, type Progress } from "@/lib/progress/progress";
import { MAX_SYNC_BYTES, joinProgress, sameProgress } from "@/lib/progress/sync";
import { createClient } from "@/lib/supabase/server";

// Tiến độ học của tài khoản đang đăng nhập (docs/ke-hoach-tai-khoan.md, mục 7.1). Đọc / ghi bằng PHIÊN NGƯỜI DÙNG — RLS
// own_select / own_insert / own_update của learner_progress chỉ cho đụng dòng của chính mình; user id lấy từ token
// (getClaims), không từ body. Server không tin dữ liệu gửi lên: parseProgress bỏ mục hỏng, rồi GỘP với bản đang lưu
// (không ghi đè) — hai máy cùng học không làm mất tiến độ của nhau.

const NO_STORE = { "Cache-Control": "private, no-store" };
/** Số lần thử lại khi máy khác vừa ghi chen giữa lúc đọc và lúc ghi (khóa lạc quan theo updated_at). */
const WRITE_ATTEMPTS = 3;

type Row = { data: Json; updated_at: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const fail = (status: number, reason: string) => Response.json({ ok: false, reason }, { status, headers: NO_STORE });

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" && sub ? sub : null;
}

async function readRow(supabase: Supabase, userId: string): Promise<Row | null> {
  const { data, error } = await supabase.from("learner_progress").select("data, updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Không đọc được tiến độ: ${error.message}`);
  return data;
}

const progressOf = (row: Row | null): Progress => (row ? parseProgress(JSON.stringify(row.data)) : emptyProgress);

export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await currentUserId(supabase);
    if (!userId) return fail(401, "unauthenticated");
    const row = await readRow(supabase, userId);
    return Response.json({ ok: true, progress: progressOf(row), updatedAt: row?.updated_at ?? null }, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    return fail(503, "unavailable");
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await currentUserId(supabase);
    if (!userId) return fail(401, "unauthenticated");

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_SYNC_BYTES) return fail(413, "too_large");
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_SYNC_BYTES) return fail(413, "too_large");
    const incoming = parseProgress(text);

    // Không đếm được (mất kết nối, thiếu cấu hình) → cho qua: đồng bộ tiến độ không được hỏng vì bộ đếm.
    if ((await consumeRateLimit("progress_write", `user:${userId}`)) === "limited") return fail(429, "rate_limited");

    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
      const row = await readRow(supabase, userId);
      const stored = progressOf(row);
      const merged = joinProgress(stored, incoming);
      if (row && sameProgress(merged, stored)) {
        return Response.json({ ok: true, progress: stored, updatedAt: row.updated_at }, { headers: NO_STORE });
      }
      if (new TextEncoder().encode(JSON.stringify(merged)).length > MAX_SYNC_BYTES) return fail(413, "too_large");

      const data = merged as unknown as NonNullable<Json>;
      if (row) {
        // Chỉ ghi khi dòng chưa bị máy khác đổi kể từ lúc đọc; bị đổi → đọc lại, gộp lại.
        const { data: updated, error } = await supabase
          .from("learner_progress")
          .update({ data })
          .eq("user_id", userId)
          .eq("updated_at", row.updated_at)
          .select("updated_at");
        if (error) throw new Error(`Không lưu được tiến độ: ${error.message}`);
        if (updated.length) return Response.json({ ok: true, progress: merged, updatedAt: updated[0].updated_at }, { headers: NO_STORE });
      } else {
        const { data: inserted, error } = await supabase.from("learner_progress").insert({ user_id: userId, data }).select("updated_at").single();
        if (!error) return Response.json({ ok: true, progress: merged, updatedAt: inserted.updated_at }, { headers: NO_STORE });
        // 23505: máy khác vừa tạo dòng → vòng sau đọc lại và cập nhật.
        if (error.code !== "23505") throw new Error(`Không lưu được tiến độ: ${error.message}`);
      }
    }
    return fail(409, "conflict");
  } catch (error) {
    unstable_rethrow(error);
    return fail(503, "unavailable");
  }
}
