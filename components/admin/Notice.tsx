const notices: Record<string, { tone: "success" | "warning"; text: string }> = {
  "da-tao": { tone: "success", text: "Đã tạo bản nháp. Bạn có thể tiếp tục bổ sung nội dung." },
  "da-tao-loi-lien-ket": {
    tone: "warning",
    text: "Đã tạo bản nháp nhưng chưa lưu được phần liên kết (nhân vật, địa điểm, nguồn). Hãy kiểm tra và bấm Lưu lại.",
  },
  "da-gui-duyet": { tone: "success", text: "Đã gửi kiểm duyệt. Nội dung sẽ chờ kiểm duyệt viên xử lý." },
  "da-xoa": { tone: "success", text: "Đã xóa." },
  // Kiểm duyệt (Phase 11)
  "da-tra-sua": { tone: "success", text: "Đã yêu cầu chỉnh sửa. Lý do đã được gửi tới biên tập viên." },
  "da-cong-bo": { tone: "success", text: "Đã công bố. Nội dung đã hiển thị ở trang công khai." },
  "da-an": { tone: "success", text: "Đã ẩn. Nội dung không còn hiển thị ở trang công khai." },
  "da-cong-bo-lai": { tone: "success", text: "Đã công bố lại. Nội dung đã hiển thị ở trang công khai." },
};

/** Thông báo sau khi chuyển trang (mã nằm ở `?thong-bao=`); mã lạ bị bỏ qua nên không thể chèn chữ tùy ý. */
export function Notice({ code }: { code: string | undefined }) {
  const notice = code && Object.hasOwn(notices, code) ? notices[code] : null;
  if (!notice) return null;

  return (
    <p
      role="status"
      className={
        notice.tone === "success"
          ? "rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm font-medium text-green-800 dark:text-green-300"
          : "rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-900 dark:text-orange-200"
      }
    >
      {notice.text}
    </p>
  );
}
