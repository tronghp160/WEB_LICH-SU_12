"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bulkBankAction } from "@/lib/actions/exam-bank";
import { initialActionState } from "@/lib/actions/state";
import { examBankPaths, examItemKindLabels, examItemLevelLabels } from "@/lib/exams/items";
import { STATS_MIN_ATTEMPTS, statsFlagLabels, statsFlags, type ItemStats } from "@/lib/exams/quality";
import type { BankListItem } from "@/lib/queries/exam-bank";

type Props = {
  items: BankListItem[];
  lessonNumbers: Record<string, number>;
  canSubmit: boolean;
  canPublish: boolean;
  /** Thống kê lượt thi theo id câu (GĐ7) — câu chưa có lượt nào không có trong map. */
  stats?: Record<string, ItemStats>;
  /** Hiện khi danh sách rỗng — vẫn giữ khung (và thông báo kết quả thao tác hàng loạt vừa làm). */
  empty: ReactNode;
};

/** Danh sách câu + chọn nhiều câu để gửi duyệt (biên tập viên) / công bố (kiểm duyệt viên) một lượt. */
export function BankItemTable({ items, lessonNumbers, canSubmit, canPublish, stats = {}, empty }: Props) {
  const [state, formAction, pending] = useActionState(bulkBankAction, initialActionState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulk = (canSubmit || canPublish) && items.length > 0;
  // Sau thao tác, danh sách có thể đổi (câu vừa công bố rời khỏi bộ lọc) → chỉ đếm câu đã chọn còn trên trang.
  const chosen = items.filter((item) => selected.has(item.id)).length;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />
      {bulk && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={items.length > 0 && chosen === items.length}
              onChange={(event) => setSelected(event.target.checked ? new Set(items.map((item) => item.id)) : new Set())}
            />
            Chọn cả trang
          </label>
          <span className="text-muted-foreground">Đã chọn {chosen}</span>
          {canSubmit && (
            <Button type="submit" name="op" value="submit" size="sm" variant="secondary" disabled={pending || chosen === 0}>
              Gửi duyệt các câu đã chọn
            </Button>
          )}
          {canPublish && (
            <Button type="submit" name="op" value="publish" size="sm" disabled={pending || chosen === 0}>
              Công bố các câu đã chọn
            </Button>
          )}
        </div>
      )}
      {items.length === 0 && empty}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-card border border-border bg-surface p-3">
            {bulk && (
              <input
                type="checkbox"
                name="ids"
                value={item.id}
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                aria-label={`Chọn câu: ${item.stem.slice(0, 60)}`}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Link href={examBankPaths.edit(item.id)} className="text-foreground hover:text-accent hover:underline">
                {item.stem.length > 180 ? `${item.stem.slice(0, 180)}…` : item.stem}
              </Link>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="shrink-0">{examItemKindLabels[item.kind]}</Badge>
                <Badge className="shrink-0">{examItemLevelLabels[item.level]}</Badge>
                {item.lessonSlug && lessonNumbers[item.lessonSlug] && <Badge className="shrink-0">Bài {lessonNumbers[item.lessonSlug]}</Badge>}
                {item.grade === 11 && <Badge className="shrink-0">Lớp 11{item.topicTag ? ` · ${item.topicTag}` : ""}</Badge>}
                {item.hasPassage && <Badge variant="gold" className="shrink-0">Tư liệu</Badge>}
                {item.setCount > 0 && <Badge className="shrink-0">Trong {item.setCount} đề</Badge>}
                <StatusBadge status={item.status} />
                {stats[item.id] && (
                  <Badge variant="outline" className="shrink-0" title={`${stats[item.id].n} lượt thi đã nộp`}>
                    Đạt {Math.round(stats[item.id].p * 100)}%{stats[item.id].n < STATS_MIN_ATTEMPTS ? ` (${stats[item.id].n} lượt)` : ""}
                  </Badge>
                )}
                {statsFlags(stats[item.id], item.correctIndex).map((flag) => (
                  <Badge key={flag} variant="outline" className="shrink-0 border-warning">
                    ⚠ {statsFlagLabels[flag]}
                  </Badge>
                ))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </form>
  );
}
