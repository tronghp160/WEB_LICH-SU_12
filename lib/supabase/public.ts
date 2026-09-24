import "server-only";

import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * Client Supabase ẩn danh (anon/publishable key) cho các truy vấn ĐỌC dữ liệu
 * công khai ở Server Component (Mục 5.1: "đọc dữ liệu published (anon key + RLS)").
 *
 * - KHÔNG dùng cookie/phiên đăng nhập: dù nhân sự đang đăng nhập xem trang công
 *   khai, truy vấn vẫn chạy với vai trò `anon` nên RLS luôn chặn bản ghi chưa
 *   công bố (draft, pending_review...). Các truy vấn vẫn lọc `published` rõ ràng
 *   để phòng thủ nhiều lớp.
 * - `await connection()` ép trang render THEO TỪNG REQUEST. Nếu bỏ, Next.js sẽ
 *   prerender trang lúc `next build` và đóng băng dữ liệu tại thời điểm đó
 *   (fetch không dùng API động sẽ chỉ chạy 1 lần khi build) — công bố nội dung
 *   xong sẽ không thấy đổi trên trang công khai.
 * - Luôn tạo client mới trong mỗi lần gọi, không lưu vào biến toàn cục.
 */
export async function createPublicClient() {
  await connection();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
