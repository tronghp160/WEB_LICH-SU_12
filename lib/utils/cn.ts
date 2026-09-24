/** Gộp danh sách className, bỏ qua giá trị falsy. Không cần thêm thư viện ngoài. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
