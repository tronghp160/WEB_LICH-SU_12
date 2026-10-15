import type { Metadata } from "next";
import { PassageForm } from "@/components/admin/exam-bank/PassageForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { requireRole } from "@/lib/auth";
import { examBankPaths } from "@/lib/exams/items";

export const metadata: Metadata = { title: "Tư liệu mới" };

export default async function NewPassagePage() {
  await requireRole(["editor", "system_admin"]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Ngân hàng câu hỏi", href: examBankPaths.list }, { label: "Tư liệu", href: examBankPaths.passages }, { label: "Mới" }]} />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">Tư liệu mới</h1>
      </div>
      <section className="rounded-card border border-border bg-surface p-5">
        <PassageForm />
      </section>
    </div>
  );
}
