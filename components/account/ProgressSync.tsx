"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CHANGE_EVENT, readProgress, replaceProgress } from "@/lib/hooks/useProgress";
import { useSession } from "@/lib/hooks/useSession";
import { parseProgress, type Progress } from "@/lib/progress/progress";
import { SYNC_OWNER_KEY, contributedSummary, joinProgress, planInitialSync, sameProgress } from "@/lib/progress/sync";

// Đồng bộ tiến độ (Hộ chiếu) giữa máy này và tài khoản — docs/ke-hoach-tai-khoan.md, mục 7.1, giai đoạn B5. Chỉ chạy khi
// đã đăng nhập; khách vẫn dùng localStorage + mã LS12-… như cũ.
//  - Vừa đăng nhập: tải bản của tài khoản, gộp với máy (hoặc thay hẳn nếu máy đang giữ tiến độ của tài khoản KHÁC — máy
//    trường), đẩy phần mới lên.
//  - Tiến độ đổi: gom 3 giây rồi đẩy; rời trang thì đẩy ngay (keepalive). Server luôn gộp chứ không ghi đè.
//  - Quay lại tab sau ≥ 1 phút: tải lại bản của tài khoản (máy khác có thể vừa học thêm).

const API = "/api/tien-do";
const PUSH_DELAY_MS = 3000;
const PULL_AFTER_MS = 60_000;
const NOTICE_MS = 10_000;

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(SYNC_OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string) {
  try {
    window.localStorage.setItem(SYNC_OWNER_KEY, userId);
  } catch {
    // Không lưu được (chế độ riêng tư) → lần sau coi như máy mới, vẫn gộp đúng.
  }
}

/** Tài khoản sắp bị xóa: máy không còn thuộc tài khoản đó (tạo tài khoản mới trên máy này thì vẫn gộp được tiến độ). */
export function forgetSyncOwner() {
  try {
    window.localStorage.removeItem(SYNC_OWNER_KEY);
  } catch {
    // bỏ qua
  }
}

let activeFlush: (() => Promise<void>) | null = null;

/**
 * Đẩy nốt tiến độ còn chờ (thay đổi trong 3 giây cuối) lên tài khoản rồi mới đăng xuất — chờ tối đa 3 giây, mất mạng
 * thì thôi (tiến độ vẫn trên máy). Không đăng nhập / chưa đồng bộ thì xong ngay.
 */
export async function flushProgressSync(): Promise<void> {
  if (!activeFlush) return;
  await Promise.race([activeFlush().catch(() => {}), new Promise<void>((resolve) => window.setTimeout(resolve, 3000))]);
}

async function fetchServer(): Promise<Progress | null> {
  const response = await fetch(API, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) return null;
  const body = (await response.json()) as { progress?: unknown };
  return parseProgress(JSON.stringify(body.progress ?? null));
}

function noticeText(summary: { lessons: number; stamps: number }): string {
  const parts = [summary.lessons > 0 && `${summary.lessons} bài`, summary.stamps > 0 && `${summary.stamps} con dấu`].filter(Boolean);
  return parts.length
    ? `Đã gộp tiến độ trên máy này vào tài khoản (${parts.join(", ")}).`
    : "Đã gộp tiến độ trên máy này vào tài khoản.";
}

export function ProgressSync() {
  const session = useSession();
  const userId = session.status === "signed-in" ? session.userId : null;
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    /** Bản của tài khoản lần gần nhất biết được; null = chưa tải xong (chưa đẩy gì lên). */
    let server: Progress | null = null;
    let lastPull = 0;
    let timer: number | undefined;
    /** Lần đẩy đang chạy (để đẩy nốt trước khi đăng xuất thì chờ được). */
    let inFlight: Promise<void> | null = null;
    let again = false;

    const applyServer = (fromServer: Progress) => {
      server = fromServer;
      lastPull = Date.now();
      const local = readProgress();
      const next = joinProgress(local, fromServer);
      if (!sameProgress(next, local)) replaceProgress(next);
    };

    const push = async (keepalive = false) => {
      if (cancelled || !server) return;
      const local = readProgress();
      if (sameProgress(joinProgress(server, local), server)) return; // máy không có gì mới
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = (async () => {
        try {
          const response = await fetch(API, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(local),
            credentials: "same-origin",
            keepalive,
          });
          if (!cancelled && response.ok) {
            const body = (await response.json()) as { progress?: unknown };
            applyServer(parseProgress(JSON.stringify(body.progress ?? null)));
          }
        } catch {
          // Mất mạng: tiến độ vẫn trên máy, lần thay đổi / đăng nhập sau sẽ đẩy lại.
        }
      })();
      await inFlight;
      inFlight = null;
      if (again && !cancelled) {
        again = false;
        schedule();
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        void push();
      }, PUSH_DELAY_MS);
    };

    const flush = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      void push(true);
    };

    /** Đẩy ngay phần còn chờ (trước khi đăng xuất) và đợi xong. */
    activeFlush = async () => {
      window.clearTimeout(timer);
      timer = undefined;
      await started; // trang vừa mở, chưa tải xong bản của tài khoản → đợi rồi mới đẩy
      if (inFlight) await inFlight;
      await push();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush();
        return;
      }
      if (server && Date.now() - lastPull >= PULL_AFTER_MS) {
        fetchServer()
          .then((fromServer) => {
            if (fromServer && !cancelled) applyServer(fromServer);
          })
          .catch(() => {});
      }
    };

    const start = async () => {
      const fromServer = await fetchServer();
      if (!fromServer || cancelled) return;
      const owner = readOwner();
      const local = readProgress();
      const plan = planInitialSync(local, fromServer, owner, userId);
      const contributed = plan.kind === "merge" && owner !== userId ? contributedSummary(local, fromServer) : null;

      server = fromServer;
      lastPull = Date.now();
      if (!sameProgress(plan.next, local)) replaceProgress(plan.next);
      writeOwner(userId);
      if (contributed) setNotice(noticeText(contributed));
      await push();
    };

    window.addEventListener(CHANGE_EVENT, schedule);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    const started = start().catch(() => {});

    return () => {
      cancelled = true;
      activeFlush = null;
      window.clearTimeout(timer);
      window.removeEventListener(CHANGE_EVENT, schedule);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);

  useEffect(() => {
    if (!notice) return;
    const hide = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(hide);
  }, [notice]);

  if (!notice) return null;
  return (
    <div
      id="dong-bo-thong-bao"
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-start gap-3 rounded-card border border-border bg-surface p-4 text-sm text-foreground shadow-xl md:bottom-6 print:hidden"
    >
      <p className="flex-1">{notice}</p>
      <button
        type="button"
        onClick={() => setNotice(null)}
        aria-label="Đóng thông báo"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
