import { createClient } from "@/lib/supabase/server";

// Trang tạm để xác nhận kết nối Supabase ở Phase 0.
// Sẽ được xóa khi bắt đầu Phase 3 (nền tảng giao diện).
export default async function KiemTraKetNoiPage() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("curriculum_topics")
    .select("*", { count: "exact", head: true });

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Kiểm tra kết nối Supabase</h1>
      {error ? (
        <p style={{ color: "red" }}>Lỗi kết nối: {error.message}</p>
      ) : (
        <p>
          Kết nối thành công. Số bản ghi trong <code>curriculum_topics</code>:{" "}
          <strong>{count ?? 0}</strong>
        </p>
      )}
    </main>
  );
}
