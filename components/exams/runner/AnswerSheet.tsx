"use client";

import { Flag } from "lucide-react";
import type { AttemptQuestion } from "@/lib/exams/attempt";
import { STATEMENT_LETTERS } from "@/lib/exams/items";
import { answerState } from "@/lib/exams/room";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { cn } from "@/lib/utils/cn";

type Props = {
  questions: readonly AttemptQuestion[];
  answers: Record<string, ItemAnswer>;
  current: number;
  onJump: (index: number) => void;
};

const STATE_LABEL = { empty: "chưa làm", partial: "làm dở", done: "đã làm" } as const;

/**
 * Phiếu trả lời: Phần I (trắc nghiệm) là lưới số câu; Phần II (Đúng/Sai) mỗi câu một hàng a b c d. Màu: chưa làm / đã
 * làm / làm dở; cờ = đánh dấu xem lại; viền đậm = câu đang xem. Bấm để nhảy tới câu.
 */
export function AnswerSheet({ questions, answers, current, onJump }: Props) {
  const parts = [
    { section: 1, title: "Phần I — Trắc nghiệm" },
    { section: 2, title: "Phần II — Đúng/Sai" },
  ]
    .map((part) => ({ ...part, items: questions.map((question, index) => ({ question, index })).filter(({ question }) => question.section === part.section) }))
    .filter((part) => part.items.length > 0);

  return (
    <nav aria-label="Chuyển nhanh tới câu" className="flex flex-col gap-4">
      {parts.map((part) => (
        <section key={part.section} aria-label={part.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {part.title} <span className="font-normal text-muted-foreground">({part.items.length} câu)</span>
          </h3>
          <ol className={cn("m-0 list-none p-0", part.section === 1 ? "grid grid-cols-6 gap-1.5" : "flex flex-col gap-1.5")}>
            {part.items.map(({ question, index }) => {
              const answer = answers[question.itemId];
              const state = answerState(question, answer);
              const flagged = answer?.flagged === true;
              return (
                <li key={question.itemId}>
                  <button
                    type="button"
                    onClick={() => onJump(index)}
                    aria-current={index === current ? "step" : undefined}
                    aria-label={`Câu ${index + 1} (${STATE_LABEL[state]}${flagged ? ", đã đánh dấu" : ""})`}
                    className={cn(
                      "relative flex h-9 w-full items-center gap-2 rounded-lg border text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                      part.section === 1 ? "justify-center" : "justify-start px-2",
                      state === "done" && "border-accent/40 bg-accent/15 text-foreground",
                      state === "partial" && "border-gold bg-gold/15 text-foreground",
                      state === "empty" && "border-border bg-surface text-muted-foreground",
                      index === current && "ring-2 ring-foreground/60",
                    )}
                  >
                    <span>{part.section === 1 ? index + 1 : `Câu ${index + 1}`}</span>
                    {part.section === 2 && (
                      <span className="flex gap-1" aria-hidden="true">
                        {STATEMENT_LETTERS.map((letter, slot) => {
                          const value = answer?.tf?.[slot];
                          return (
                            <span
                              key={letter}
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold",
                                value === true ? "bg-success text-white" : value === false ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {value === true ? "Đ" : value === false ? "S" : letter}
                            </span>
                          );
                        })}
                      </span>
                    )}
                    {flagged && <Flag className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-gold text-gold-deep" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-accent/40 bg-accent/15" /> đã làm
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-gold bg-gold/15" /> làm dở
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-border" /> chưa làm
        </span>
        <span className="inline-flex items-center gap-1">
          <Flag className="h-3 w-3 fill-gold text-gold-deep" /> đánh dấu
        </span>
      </p>
    </nav>
  );
}
