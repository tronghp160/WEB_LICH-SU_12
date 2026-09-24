import Link from "next/link";
import { Button } from "@/components/ui/Button";

type FormFooterProps = {
  pending: boolean;
  cancelHref: string;
  /** Bản ghi ở trạng thái không cho sửa: ẩn nút lưu, chỉ còn "Quay lại". */
  readOnly?: boolean;
  submitLabel?: string;
};

export function FormFooter({ pending, cancelHref, readOnly, submitLabel = "Lưu" }: FormFooterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : submitLabel}
        </Button>
      )}
      <Link
        href={cancelHref}
        className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        {readOnly ? "← Quay lại danh sách" : "Hủy"}
      </Link>
    </div>
  );
}
