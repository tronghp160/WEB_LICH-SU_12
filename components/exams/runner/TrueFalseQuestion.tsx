"use client";

import { STATEMENT_LETTERS } from "@/lib/exams/items";
import { cn } from "@/lib/utils/cn";

type Props = { statements: readonly string[]; values: readonly (boolean | null)[]; onSet: (statement: number, value: boolean | null) => void };

/**
 * Câu Đúng/Sai: 4 ý a) – d), mỗi ý hai nút bật Đúng / Sai (không dùng checkbox — ô trống dễ hiểu nhầm là "Sai"). Bấm lại
 * nút đang bật để bỏ chọn ý đó. Phím tắt Q/W, E/R, T/Y, U/I ở ExamRoom.
 */
export function TrueFalseQuestion({ statements, values, onSet }: Props) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0" aria-label="Các ý Đúng/Sai">
      {statements.map((statement, position) => {
        const value = values[position] ?? null;
        return (
          <li key={position} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3 sm:flex-row sm:items-center">
            <span className="flex-1 text-foreground">
              <strong>{STATEMENT_LETTERS[position]})</strong> {statement}
            </span>
            <span className="flex shrink-0 gap-2" role="group" aria-label={`Ý ${STATEMENT_LETTERS[position]})`}>
              {([true, false] as const).map((option) => {
                const selected = value === option;
                return (
                  <button
                    key={String(option)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSet(position, selected ? null : option)}
                    className={cn(
                      "min-h-10 min-w-16 rounded-lg border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                      selected
                        ? option
                          ? "border-success bg-success text-white"
                          : "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted",
                    )}
                  >
                    {option ? "Đúng" : "Sai"}
                  </button>
                );
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
