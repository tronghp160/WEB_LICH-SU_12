import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client dùng trong Client Component (trình duyệt).
 * Chỉ dùng anon/publishable key — không bao giờ đưa secret key vào đây.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
