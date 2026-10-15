import { randomInt } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { blueprintSize, getBlueprint } from "@/lib/exams/blueprint";
import { generateExam } from "@/lib/exams/generate";
import {
  attemptResponse,
  failure,
  getGeneratedIntro,
  loadGeneratorPool,
  NO_STORE,
  rateLimited,
  readCaller,
  recentItemIds,
  startGeneratedAttempt,
} from "@/lib/exams/attempts-server";

// Đề tự sinh theo ma trận (docs/ke-hoach-luyen-thi.md, mục 4.4 — GĐ5). ?ma-tran=thpt_2025 | quick_15 | tf_only | chu-de-N.
//   GET  — trang trước khi làm: có gói không, số câu, lượt dở (không có câu hỏi).
//   POST — đang có lượt dở cùng ma trận thì làm tiếp; không thì sinh đề mới (tránh câu đã làm 14 ngày) và bắt đầu lượt.
// Cần gói luyện thi (tài khoản hoặc mã kích hoạt trong header). Câu hỏi KHÔNG kèm đáp án; chấm như đề có sẵn.

const unavailable = () => Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });

function readBlueprint(request: Request) {
  return getBlueprint(new URL(request.url).searchParams.get("ma-tran") ?? "");
}

export async function GET(request: Request) {
  const blueprint = readBlueprint(request);
  if (!blueprint) return failure("not_found");
  try {
    const { data, error } = await getGeneratedIntro(blueprint.id, await readCaller(request));
    if (error) return unavailable();
    const body = data && typeof data === "object" && !Array.isArray(data) ? { ...data, question_count: blueprintSize(blueprint) } : data;
    return attemptResponse(body);
  } catch (error) {
    unstable_rethrow(error);
    return unavailable();
  }
}

export async function POST(request: Request) {
  const blueprint = readBlueprint(request);
  if (!blueprint) return failure("not_found");
  try {
    const caller = await readCaller(request);
    if (!caller.userId && !caller.deviceHash) return failure("no_device");
    if (await rateLimited("exam_start", caller.userId ? `user:${caller.userId}` : `device:${caller.deviceHash}`)) return failure("rate_limited");

    // Kiểm gói trước khi đọc ngân hàng: người chưa có gói không tốn công sinh đề.
    const intro = await getGeneratedIntro(blueprint.id, caller);
    if (intro.error) return unavailable();
    if (!intro.data || typeof intro.data !== "object" || Array.isArray(intro.data) || intro.data.ok !== true) return attemptResponse(intro.data);

    const [pool, recent] = await Promise.all([loadGeneratorPool(), recentItemIds(caller)]);
    if (!pool) return unavailable();
    const exam = generateExam(pool, blueprint, { seed: randomInt(2 ** 31), recent });
    // Lượt dở cùng ma trận vẫn mở lại được dù ngân hàng vừa bớt câu.
    if (!exam && !intro.data.in_progress) return failure("not_enough_items");

    const { data, error } = await startGeneratedAttempt(blueprint, caller, exam ?? { items: [], notes: [] });
    if (error) return unavailable();
    const fresh = !intro.data.in_progress;
    return attemptResponse(data && typeof data === "object" && !Array.isArray(data) && fresh ? { ...data, notes: exam?.notes ?? [] } : data);
  } catch (error) {
    unstable_rethrow(error);
    return unavailable();
  }
}
