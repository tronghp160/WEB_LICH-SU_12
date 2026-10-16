import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

// Truy vấn công khai của chức năng thanh toán (anon key + RLS: chỉ sản phẩm đang bán).

export const EXAM_PACK_SLUG = "goi-luyen-thi-2027";
export const DONATION_SLUG = "ung-ho";
/** Các gói bán ra (supabase/migrations/20261031000000_exam_plans.sql): mã cấp ra mở đề của gói gốc EXAM_PACK_SLUG. */
export const EXAM_PLAN_SLUGS = ["goi-luyen-thi-thang", "goi-luyen-thi-nam"] as const;

export type ExamPlan = { slug: string; name: string; priceVnd: number; durationDays: number; maxDevices: number };

/** Gói tháng / năm đang bán, theo thứ tự EXAM_PLAN_SLUGS. */
export async function getExamPlans(): Promise<ExamPlan[]> {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, name, price_vnd, duration_days, max_devices")
    .in("slug", [...EXAM_PLAN_SLUGS])
    .eq("is_active", true);
  if (error) throw error;
  return EXAM_PLAN_SLUGS.flatMap((slug) => {
    const row = data.find((product) => product.slug === slug);
    return row?.price_vnd && row.duration_days
      ? [{ slug, name: row.name, priceVnd: row.price_vnd, durationDays: row.duration_days, maxDevices: row.max_devices }]
      : [];
  });
}

export async function getActiveProduct(slug: string) {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, kind, name, description, price_vnd, min_vnd, max_vnd, max_devices, valid_until")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type WallEntry = { displayName: string; message: string | null; paidAt: string | null; tier: string | null };

/** Bức tường cảm ơn: view `donation_wall` chỉ lộ tên, lời nhắn ĐÃ DUYỆT, ngày, mức — không có số tiền hay email. */
export async function getDonationWall(limit = 60): Promise<WallEntry[]> {
  const supabase = await createPublicClient();
  const { data, error } = await supabase.from("donation_wall").select("display_name, message, paid_at, tier").order("paid_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    displayName: row.display_name?.trim() || "Một bạn đọc",
    message: row.message,
    paidAt: row.paid_at,
    tier: row.tier,
  }));
}
