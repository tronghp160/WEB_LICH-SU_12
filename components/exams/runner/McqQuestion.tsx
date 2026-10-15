"use client";

import { CHOICE_LETTERS } from "@/lib/exams/items";
import { cn } from "@/lib/utils/cn";

type Props = { choices: readonly string[]; chosen: number | null; onChoose: (choice: number) => void };

/** Bốn lựa chọn A–D, bấm lại lựa chọn đang chọn để bỏ chọn. Phím tắt 1–4 / A–D ở ExamRoom. */
export function McqQuestion({ choices, chosen, onChoose }: Props) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0" aria-label="Các đáp án">
      {choices.map((choice, position) => {
        const selected = chosen === position;
        return (
          <li key={position}>
            <button
              type="button"
              onClick={() => onChoose(position)}
              aria-pressed={selected}
              className={cn(
                "flex w-full items-start gap-3 rounded-card border bg-surface p-3 text-left text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                selected ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-muted",
              )}
            >
              <span
                className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold", selected ? "border-accent bg-accent text-accent-foreground" : "border-border")}
                aria-hidden="true"
              >
                {CHOICE_LETTERS[position]}
              </span>
              <span className="pt-0.5">{choice}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
