import { Construction } from "lucide-react";

type ComingSoonProps = {
  title: string;
  description: string;
  phase: number;
};

/** Trang giữ chỗ cho khu vực sẽ làm ở Phase sau; trang gọi nó vẫn PHẢI tự kiểm quyền bằng requireRole(). */
export function ComingSoon({ title, description, phase }: ComingSoonProps) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      <div className="mt-8 flex max-w-xl items-start gap-3 rounded-card border border-dashed border-border p-5 text-sm text-muted-foreground">
        <Construction className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
        <p>Chức năng này đang được xây dựng và sẽ hoàn thiện ở Phase {phase} của kế hoạch.</p>
      </div>
    </div>
  );
}
