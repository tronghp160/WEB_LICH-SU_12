export function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p>
          Đây là <strong className="text-foreground">công cụ hỗ trợ học tập</strong>, không thay
          thế sách giáo khoa. Mọi mốc thời gian gần đúng/tranh luận và tọa độ ước lượng đều được
          ghi chú rõ trên từng nội dung.
        </p>
        <p>
          Dữ liệu bản đồ ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            OpenStreetMap contributors
          </a>
          .
        </p>
        <p>Đồ án cơ sở ngành — Viện Công nghệ số, Trường Đại học Thủ Dầu Một.</p>
      </div>
    </footer>
  );
}
