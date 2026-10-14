import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, recordQuiz, type Progress } from "@/lib/progress/progress";

// /api/tien-do — giai đoạn B5 (docs/ke-hoach-tai-khoan.md, mục 7.1). Supabase giả: bảng learner_progress trong bộ nhớ,
// đủ các lệnh route dùng; `beforeUpdate` mô phỏng máy khác ghi chen giữa lúc đọc và lúc ghi.

type Row = { data: unknown; updated_at: string };

const state = vi.hoisted(() => ({
  userId: "u-1" as string | null,
  row: null as Row | null,
  clock: 0,
  rate: "allowed" as "allowed" | "limited" | "unavailable",
  beforeUpdate: null as null | (() => void),
  writes: 0,
}));

const stamp = () => `2026-10-14T08:00:00.${String(++state.clock).padStart(6, "0")}+00:00`;

vi.mock("@/lib/payments/rate-limit", () => ({ consumeRateLimit: async () => state.rate }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: state.userId ? { claims: { sub: state.userId } } : null, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.row ? { ...state.row } : null, error: null }) }),
      }),
      update: (values: { data: unknown }) => ({
        eq: () => ({
          eq: (_column: string, expected: string) => ({
            select: async () => {
              state.beforeUpdate?.();
              state.beforeUpdate = null;
              if (!state.row || state.row.updated_at !== expected) return { data: [], error: null };
              state.writes++;
              state.row = { data: values.data, updated_at: stamp() };
              return { data: [{ updated_at: state.row.updated_at }], error: null };
            },
          }),
        }),
      }),
      insert: (values: { data: unknown }) => ({
        select: () => ({
          single: async () => {
            if (state.row) return { data: null, error: { code: "23505", message: "duplicate" } };
            state.writes++;
            state.row = { data: values.data, updated_at: stamp() };
            return { data: { updated_at: state.row.updated_at }, error: null };
          },
        }),
      }),
    }),
  }),
}));

const { GET, PUT } = await import("@/app/api/tien-do/route");

const at = (minute: number) => new Date(Date.UTC(2026, 9, 14, 8, minute));
const put = (body: string) => PUT(new Request("http://localhost/api/tien-do", { method: "PUT", body }));
const stored = () => state.row?.data as Progress;

describe("/api/tien-do", () => {
  beforeEach(() => {
    Object.assign(state, { userId: "u-1", row: null, clock: 0, rate: "allowed", beforeUpdate: null, writes: 0 });
  });

  it("chưa đăng nhập → 401 cho cả GET và PUT; header không lưu đệm", async () => {
    state.userId = null;
    const get = await GET();
    expect(get.status).toBe(401);
    expect(get.headers.get("cache-control")).toBe("private, no-store");
    expect((await put("{}")).status).toBe(401);
  });

  it("GET khi chưa có dòng → tiến độ trống", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ ok: true, progress: emptyProgress, updatedAt: null });
  });

  it("PUT lần đầu tạo dòng; PUT lại cùng dữ liệu không ghi thêm", async () => {
    const local = recordQuiz(emptyProgress, "bai-7", 8, 10, at(1));
    const first = await put(JSON.stringify(local));
    expect(first.status).toBe(200);
    expect((await first.json()).progress).toEqual(local);
    expect(state.writes).toBe(1);
    await put(JSON.stringify(local));
    expect(state.writes).toBe(1);
  });

  it("GỘP với bản đang lưu, không ghi đè; dữ liệu hỏng trong body bị bỏ", async () => {
    const phone = recordQuiz(emptyProgress, "bai-8", 9, 10, at(2));
    state.row = { data: phone, updated_at: stamp() };
    const school = recordQuiz(emptyProgress, "bai-7", 8, 10, at(1));
    const body = { ...school, quizzes: { ...school.quizzes, hong: { best: 99, total: 10 } } };
    const response = await put(JSON.stringify(body));
    const progress = (await response.json()).progress as Progress;
    expect(Object.keys(progress.quizzes).sort()).toEqual(["bai-7", "bai-8"]);
    expect(Object.keys(stored().quizzes).sort()).toEqual(["bai-7", "bai-8"]);
  });

  it("máy khác ghi chen giữa → đọc lại, gộp lại, không mất phần của máy kia", async () => {
    state.row = { data: emptyProgress, updated_at: stamp() };
    state.beforeUpdate = () => {
      state.row = { data: recordQuiz(emptyProgress, "bai-9", 7, 10, at(4)), updated_at: stamp() };
    };
    const response = await put(JSON.stringify(recordQuiz(emptyProgress, "bai-7", 8, 10, at(1))));
    expect(response.status).toBe(200);
    expect(Object.keys(stored().quizzes).sort()).toEqual(["bai-7", "bai-9"]);
  });

  it("vượt 64 KB → 413; vượt giới hạn tần suất → 429; bộ đếm hỏng → vẫn cho ghi", async () => {
    expect((await put("x".repeat(65537))).status).toBe(413);
    state.rate = "limited";
    expect((await put(JSON.stringify(recordQuiz(emptyProgress, "bai-7", 8, 10, at(1))))).status).toBe(429);
    expect(state.writes).toBe(0);
    state.rate = "unavailable";
    expect((await put(JSON.stringify(recordQuiz(emptyProgress, "bai-7", 8, 10, at(1))))).status).toBe(200);
  });

  it("body không phải JSON → coi như tiến độ trống (không lỗi 500)", async () => {
    const response = await put("khong-phai-json");
    expect(response.status).toBe(200);
    expect((await response.json()).progress).toEqual(emptyProgress);
  });
});
