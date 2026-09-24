import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-serif text-6xl font-bold text-gold">404</p>
      <h1 className="font-serif text-2xl font-semibold text-foreground">
        Không tìm thấy trang
      </h1>
      <p className="max-w-md text-muted-foreground">
        Trang bạn tìm không tồn tại, đã bị ẩn, hoặc chưa được công bố. Vui lòng kiểm tra lại
        đường dẫn hoặc quay về trang chủ.
      </p>
      <LinkButton href="/" variant="primary">
        Về trang chủ
      </LinkButton>
    </div>
  );
}
