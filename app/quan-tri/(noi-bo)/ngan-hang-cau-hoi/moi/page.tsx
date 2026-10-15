import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamItemForm } from "@/components/admin/exam-bank/ExamItemForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { requireRole } from "@/lib/auth";
import { examAdminPaths } from "@/lib/exams/admin";
import { examBankPaths, examItemKindLabels, parseKindSegment } from "@/lib/exams/items";
import { getItemFormOptions } from "@/lib/queries/exam-bank";

export const metadata: Metadata = { title: "Câu hỏi mới" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function NewExamItemPage({ searchParams }: PageProps<"/quan-tri/ngan-hang-cau-hoi/moi">) {
  await requireRole(["editor", "system_admin"]);
  const query = await searchParams;
  const kind = parseKindSegment(first(query.dang));
  if (!kind) notFound();
  const set = first(query.de);
  const addToSet = set && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(set) ? set : null;
  const { events, passages } = await getItemFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            addToSet ? { label: `Đề ${addToSet}`, href: examAdminPaths.edit(addToSet) } : { label: "Ngân hàng câu hỏi", href: examBankPaths.list },
            { label: "Câu mới" },
          ]}
        />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">Câu {examItemKindLabels[kind]} mới</h1>
        {addToSet && <p className="mt-1 text-sm text-muted-foreground">Tạo xong, câu được thêm vào cuối phần tương ứng của đề {addToSet}.</p>}
      </div>
      <section className="rounded-card border border-border bg-surface p-5">
        <ExamItemForm kind={kind} events={events} passages={passages} addToSet={addToSet} />
      </section>
    </div>
  );
}
