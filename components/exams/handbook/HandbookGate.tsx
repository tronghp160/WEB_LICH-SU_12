"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HandbookView } from "@/components/exams/handbook/HandbookView";
import { Callout } from "@/components/ui/Callout";
import { DEVICE_HEADER, LICENSE_HEADER, examPaths } from "@/lib/exams/exam";
import { FREE_HANDBOOK_LESSON, type Handbook } from "@/lib/exams/handbook";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";

type Load = { state: "checking" } | { state: "locked" } | { state: "ready"; handbook: Handbook };

/**
 * Sổ tay thuộc gói: server đã thử gói của TÀI KHOẢN mà chưa được. Người mua bằng mã có mã trong máy → tải sổ tay qua API
 * (mã đi trong header). Không có mã → lời mời mua gói + bài xem thử.
 */
export function HandbookGate({ lessonSlug }: { lessonSlug: string }) {
  const hydrated = useHydrated();
  const license = useLicense();
  const code = license?.code ?? null;
  const [load, setLoad] = useState<Load>({ state: "checking" });

  useEffect(() => {
    if (!hydrated || !code) return;
    let cancelled = false;
    fetch(`/api/luyen-thi/so-tay/${lessonSlug}`, { headers: { [DEVICE_HEADER]: getDeviceId(), [LICENSE_HEADER]: code }, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean; handbook?: Handbook } | null;
        if (!cancelled) setLoad(body?.ok && body.handbook ? { state: "ready", handbook: body.handbook } : { state: "locked" });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "locked" });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, code, lessonSlug]);

  // Không có mã trong máy → khóa ngay, không cần gọi API.
  const view: Load = hydrated && !code ? { state: "locked" } : load;
  if (view.state === "checking") {
    return (
      <p className="text-muted-foreground" role="status">
        Đang kiểm tra gói…
      </p>
    );
  }
  if (view.state === "ready") return <HandbookView handbook={view.handbook} />;
  return (
    <Callout variant="info" title="Sổ tay ôn thi thuộc Gói luyện thi">
      Có gói, em xem được sổ tay cả 17 bài và in ra giấy. Xem thử miễn phí:{" "}
      <Link href={examPaths.handbookLesson(FREE_HANDBOOK_LESSON)} className="text-accent underline">
        sổ tay Bài 6
      </Link>
      .{" "}
      <Link href={examPaths.hub} className="text-accent underline">
        Xem Gói luyện thi
      </Link>
      .
    </Callout>
  );
}
