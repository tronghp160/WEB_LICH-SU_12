import type { ReactNode } from "react";

type SectionHeaderProps = {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ id, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
