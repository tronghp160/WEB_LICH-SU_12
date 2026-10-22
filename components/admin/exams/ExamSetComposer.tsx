import Link from "next/link";
import { ExternalLink, FilePlus2 } from "lucide-react";
import { ActionNoticeScope } from "@/components/admin/ActionNotice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { ExamItemPreview } from "@/components/exams/ExamItemPreview";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { addSetItemAction, moveSetItemAction, rebalanceSetAction, removeSetItemAction } from "@/lib/actions/exams";
import { CHOICE_LETTERS, EXAM_ITEM_KINDS, EXAM_ITEM_LEVELS, examBankPaths, examItemKindLabels, examItemLevelLabels } from "@/lib/exams/items";
import { displayedCorrect, rotateChoices } from "@/lib/exams/compose";
import { THPT_2025_MCQ, THPT_2025_TRUE_FALSE, type ExamFormat } from "@/lib/exams/format";
import type { PickerFilters, SetItemView } from "@/lib/queries/admin-exams";
import { sgkLessons } from "@/lib/sgk/curriculum";

const lessonNumber = new Map(sgkLessons.map((lesson) => [lesson.slug, lesson.number]));

type PickerItem = { id: string; kind: SetItemView["kind"]; stem: string; lessonSlug: string | null; level: SetItemView["level"]; status: SetItemView["status"]; hasPassage: boolean };

type Props = {
  slug: string;
  format: ExamFormat;
  items: SetItemView[];
  editable: boolean;
  picker: { items: PickerItem[]; filters: PickerFilters } | null;
};

function ItemMeta({ kind, level, lessonSlug, status, hasPassage }: { kind: PickerItem["kind"]; level: PickerItem["level"]; lessonSlug: string | null; status: PickerItem["status"]; hasPassage: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="shrink-0">{examItemKindLabels[kind]}</Badge>
      <Badge className="shrink-0">{examItemLevelLabels[level]}</Badge>
      {lessonSlug && lessonNumber.has(lessonSlug) && <Badge className="shrink-0">Bài {lessonNumber.get(lessonSlug)}</Badge>}
      {hasPassage && <Badge variant="gold" className="shrink-0">Tư liệu</Badge>}
      <StatusBadge status={status} />
    </span>
  );
}

function Section({ title, target, rows, slug, editable }: { title: string; target: number | null; rows: SetItemView[]; slug: string; editable: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-serif text-lg font-semibold text-foreground">
        {title} <span className="text-base font-normal text-muted-foreground">({rows.length}{target !== null ? `/${target}` : ""} câu)</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có câu nào.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row, index) => {
            const choices = row.choices ? rotateChoices(row.choices, row.shift) : null;
            const correct = row.correctIndex !== null ? displayedCorrect(row.correctIndex, row.shift) : null;
            return (
              <li key={row.itemId} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Disclosure
                  className="min-w-0 flex-1"
                  summary={
                    <span className="flex flex-col gap-1">
                      <span className="text-sm">
                        <strong>Câu {index + 1}.</strong> {row.stem.length > 140 ? `${row.stem.slice(0, 140)}…` : row.stem}
                        {correct !== null && <span className="ml-1 text-muted-foreground">· đáp án {CHOICE_LETTERS[correct]}</span>}
                      </span>
                      <ItemMeta kind={row.kind} level={row.level} lessonSlug={row.lessonSlug} status={row.status} hasPassage={row.passage !== null} />
                    </span>
                  }
                >
                  <ExamItemPreview
                    kind={row.kind}
                    stem={row.stem}
                    passage={row.passage}
                    choices={choices}
                    correctIndex={correct}
                    statements={row.statements}
                    choiceNotes={row.choiceNotes ? rotateChoices(row.choiceNotes, row.shift) : null}
                    explanation={row.explanation}
                    remember={row.remember}
                    lessonSlug={row.lessonSlug}
                    sectionId={row.sectionId}
                    showAnswers
                  />
                  <Link href={examBankPaths.edit(row.itemId)} className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Mở câu trong ngân hàng
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Disclosure>
                {editable && (
                  <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col">
                    {index > 0 && <OrderActionButton action={moveSetItemAction} label="Lên" fields={{ slug, item_id: row.itemId, direction: "up" }} variant="ghost" />}
                    {index < rows.length - 1 && <OrderActionButton action={moveSetItemAction} label="Xuống" fields={{ slug, item_id: row.itemId, direction: "down" }} variant="ghost" />}
                    <OrderActionButton action={removeSetItemAction} label="Gỡ khỏi đề" fields={{ slug, item_id: row.itemId }} variant="ghost" danger />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Câu trong đề (Phần I trắc nghiệm, Phần II Đúng/Sai) + chọn câu từ ngân hàng. Đáp án hiển thị đã xoay như học sinh thấy. */
export function ExamSetComposer({ slug, format, items, editable, picker }: Props) {
  const full = format === "thpt_2025";
  const part1 = items.filter((row) => row.section === 1);
  const part2 = items.filter((row) => row.section === 2);

  return (
    <div className="flex flex-col gap-6">
      <ActionNoticeScope className="flex flex-col gap-6">
        <Section title="Phần I — Trắc nghiệm" target={full ? THPT_2025_MCQ : null} rows={part1} slug={slug} editable={editable} />
        <Section title="Phần II — Đúng/Sai" target={full ? THPT_2025_TRUE_FALSE : null} rows={part2} slug={slug} editable={editable} />
        {editable && part1.length > 1 && (
          <div>
            <OrderActionButton action={rebalanceSetAction} label="Rải đều đáp án A/B/C/D" fields={{ slug }} />
            <p className="mt-1 text-xs text-muted-foreground">Xoay thứ tự lựa chọn của từng câu trắc nghiệm (nội dung câu không đổi).</p>
          </div>
        )}
      </ActionNoticeScope>

      {editable && picker && (
        <section id="them-cau" aria-labelledby="them-cau-tieu-de" className="flex flex-col gap-4 rounded-card border border-dashed border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="them-cau-tieu-de" className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
              <FilePlus2 className="h-5 w-5 text-gold-deep" aria-hidden="true" />
              Thêm câu từ ngân hàng
            </h3>
            <div className="flex flex-wrap gap-2">
              {EXAM_ITEM_KINDS.map((kind) => (
                <LinkButton key={kind} href={`${examBankPaths.create(kind)}&de=${slug}`} size="sm" variant="secondary">
                  Soạn câu {examItemKindLabels[kind]} mới
                </LinkButton>
              ))}
            </div>
          </div>
          <form method="get" action={`#them-cau`} role="search" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tim-cau" className="text-sm font-medium text-foreground">Tìm câu</label>
              <Input id="tim-cau" name="tim" defaultValue={picker.filters.query ?? ""} placeholder="Gõ có dấu hoặc không dấu" maxLength={100} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loc-dang" className="text-sm font-medium text-foreground">Dạng</label>
              <Select id="loc-dang" name="dang" defaultValue={picker.filters.kind ?? ""}>
                <option value="">Tất cả</option>
                {EXAM_ITEM_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{examItemKindLabels[kind]}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loc-bai" className="text-sm font-medium text-foreground">Bài</label>
              <Select id="loc-bai" name="bai" defaultValue={picker.filters.lesson ?? ""}>
                <option value="">Tất cả</option>
                {sgkLessons.map((lesson) => (
                  <option key={lesson.slug} value={lesson.slug}>Bài {lesson.number}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loc-muc" className="text-sm font-medium text-foreground">Mức độ</label>
              <Select id="loc-muc" name="muc" defaultValue={picker.filters.level ?? ""}>
                <option value="">Tất cả</option>
                {EXAM_ITEM_LEVELS.map((level) => (
                  <option key={level} value={level}>{examItemLevelLabels[level]}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">Lọc</Button>
          </form>
          {picker.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có câu phù hợp (câu đã có trong đề và câu đã ẩn không hiện ở đây).</p>
          ) : (
            <ActionNoticeScope className="flex flex-col gap-2">
              <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Câu có thể thêm">
                {picker.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link href={examBankPaths.edit(item.id)} className="text-sm text-foreground hover:underline">
                        {item.stem.length > 160 ? `${item.stem.slice(0, 160)}…` : item.stem}
                      </Link>
                      <ItemMeta kind={item.kind} level={item.level} lessonSlug={item.lessonSlug} status={item.status} hasPassage={item.hasPassage} />
                    </div>
                    <OrderActionButton action={addSetItemAction} label="Thêm vào đề" fields={{ slug, item_id: item.id }} />
                  </li>
                ))}
              </ul>
            </ActionNoticeScope>
          )}
        </section>
      )}
    </div>
  );
}

