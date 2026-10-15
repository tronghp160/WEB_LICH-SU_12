import "server-only";

// Sự kiện đã công bố chưa — cho trang TĨNH (chuyên đề tương tác /bai-hoc/[slug]) quyết định có hiện nút "Xem trang sự
// kiện" không, tránh dẫn người học tới trang 404 khi sự kiện còn là bản nháp chờ duyệt.
// Không dùng createPublicClient() (nó gọi connection() → trang thành động): gọi REST với lưu đệm 1 giờ → trang vẫn dựng
// sẵn, tự cập nhật trong vòng 1 giờ sau khi sự kiện được công bố.

const REVALIDATE_SECONDS = 3600;

/** Lỗi mạng / thiếu cấu hình → coi như ĐÃ công bố (giữ nút như trước, không ẩn nhầm sự kiện thật). */
export async function isEventPublished(slug: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return true;
  try {
    const query = new URLSearchParams({ select: "slug", slug: `eq.${slug}`, workflow_status: "eq.published", limit: "1" });
    const response = await fetch(`${url}/rest/v1/historical_events?${query}`, {
      headers: { apikey: key },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return true;
    const rows = (await response.json()) as unknown[];
    return rows.length > 0;
  } catch {
    return true;
  }
}
