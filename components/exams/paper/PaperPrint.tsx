"use client";

import { AlertTriangle, PenLine } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { PrintButton } from "@/components/sgk/PrintButton";
import { LinkButton } from "@/components/ui/Button";
import { attemptPaths, parseAttemptView, type AttemptView } from "@/lib/exams/attempt";
import { DEVICE_HEADER, LICENSE_HEADER, examAccessMessage, examPaths } from "@/lib/exams/exam";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { useSession } from "@/lib/hooks/useSession";

type Load = { state: "loading" } | { state: "blocked"; message: string } | { state: "ready"; view: AttemptView };

/**
 * Bản in đề + phiếu trả lời (docs/ke-hoach-luyen-thi.md, mục 4.9 — GĐ8). Server tạo lượt `paper` (câu hỏi, thứ tự lựa
 * chọn đúng như sẽ chấm; KHÔNG có đáp án). Làm xong trên giấy → nhập đáp án ở trang "Nhập đáp án" trên CÙNG máy / tài
 * khoản để chấm và xem lời giải.
 */
export function PaperPrint({ slug, title, durationMin }: { slug: string; title: string; durationMin: number }) {
  const hydrated = useHydrated();
  const license = useLicense();
  const session = useSession();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const licenseCode = license?.code ?? null;
  const sessionKey = session.status === "signed-in" ? session.userId : session.status;

  useEffect(() => {
    if (!hydrated || sessionKey === "loading") return;
    let cancelled = false;
    const headers: Record<string, string> = { [DEVICE_HEADER]: getDeviceId() };
    if (licenseCode) headers[LICENSE_HEADER] = licenseCode;
    fetch(attemptPaths.paper(slug), { method: "POST", headers })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        if (cancelled) return;
        const view = body?.ok ? parseAttemptView(body) : null;
        setLoad(view ? { state: "ready", view } : { state: "blocked", message: examAccessMessage(body?.reason).message });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "blocked", message: examAccessMessage(undefined).message });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, sessionKey, slug, licenseCode]);

  if (load.state === "loading") {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-muted-foreground" role="status">
        Đang chuẩn bị bản in…
      </p>
    );
  }
  if (load.state === "blocked") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
        <p className="flex items-start gap-2 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          {load.message}
        </p>
        <Link href={examPaths.set(slug)} className="text-accent underline">
          Về trang đề
        </Link>
      </div>
    );
  }

  const { view } = load;
  const partOne = view.questions.filter((question) => question.kind === "mcq");
  const partTwo = view.questions.filter((question) => question.kind === "true_false");
  const code = view.id.slice(0, 8).toUpperCase();

  return (
    <div className="flex flex-col gap-6" data-testid="paper-print">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 print:hidden">
        <p className="text-sm text-foreground">
          In đề (hoặc lưu thành PDF), làm trên giấy trong <strong>{durationMin} phút</strong>. Làm xong, vào trang <strong>Nhập đáp án</strong> trên
          chính máy này (hoặc tài khoản này) để chấm điểm và xem lời giải. Bản in không có đáp án.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PrintButton label="In đề + phiếu trả lời" />
          <LinkButton href={examPaths.paperEntry(slug, view.id)} size="sm" variant="secondary">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Nhập đáp án đã làm
          </LinkButton>
        </div>
      </div>

      <article className="flex flex-col gap-5 bg-background text-foreground print:text-[11pt]">
        <header className="flex flex-col gap-1 border-b border-border pb-3">
          <h2 className="font-serif text-2xl font-bold">{title}</h2>
          <p className="text-sm">
            Thời gian làm bài: {durationMin} phút · {view.questions.length} câu · Mã bài in: <strong data-testid="paper-code">{code}</strong>
          </p>
          <p className="text-sm">Họ và tên: ................................................ Lớp: ..........</p>
        </header>

        {partOne.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="font-semibold uppercase">Phần I. Câu trắc nghiệm nhiều phương án lựa chọn</h3>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {partOne.map((question) => (
                <li key={question.itemId} className="flex break-inside-avoid flex-col gap-1.5">
                  {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
                  <p className="whitespace-pre-line">
                    <strong>Câu {question.n}.</strong> {question.stem}
                  </p>
                  <ol className="m-0 grid list-none gap-x-6 gap-y-1 p-0 sm:grid-cols-2 print:grid-cols-2">
                    {(question.choices ?? []).map((choice, index) => (
                      <li key={index}>
                        <strong>{CHOICE_LETTERS[index]}.</strong> {choice}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </section>
        )}

        {partTwo.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="font-semibold uppercase">Phần II. Câu trắc nghiệm đúng sai</h3>
            <p className="text-sm italic">Trong mỗi ý a), b), c), d) ở mỗi câu, chọn đúng hoặc sai.</p>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {partTwo.map((question, index) => (
                <li key={question.itemId} className="flex break-inside-avoid flex-col gap-1.5">
                  {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
                  <p className="whitespace-pre-line">
                    <strong>Câu {index + 1}.</strong> {question.stem}
                  </p>
                  <ol className="m-0 flex list-none flex-col gap-1 p-0">
                    {(question.statements ?? []).map((statement, slot) => (
                      <li key={slot}>
                        <strong>{STATEMENT_LETTERS[slot]})</strong> {statement}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="flex break-before-page flex-col gap-3 border-t border-border pt-4" aria-label="Phiếu trả lời" data-testid="answer-sheet">
          <h3 className="font-serif text-xl font-bold">Phiếu trả lời — {title}</h3>
          <p className="text-sm">Mã bài in: {code} · Tô kín một ô cho mỗi câu Phần I; ghi Đ hoặc S cho mỗi ý Phần II.</p>
          {partOne.length > 0 && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3 print:grid-cols-3">
              {partOne.map((question) => (
                <p key={question.itemId} className="m-0 font-mono">
                  {String(question.n).padStart(2, "0")}. {CHOICE_LETTERS.map((letter) => `○${letter}`).join(" ")}
                </p>
              ))}
            </div>
          )}
          {partTwo.length > 0 && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4 print:grid-cols-4">
              {partTwo.map((question, index) => (
                <div key={question.itemId} className="font-mono">
                  <p className="m-0 font-semibold">Câu {index + 1}</p>
                  {STATEMENT_LETTERS.map((letter) => (
                    <p key={letter} className="m-0">
                      {letter}) Đ □ S □
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
