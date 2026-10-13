import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

// Truy vấn công khai của chức năng thanh toán (anon key + RLS: chỉ sản phẩm đang bán).

export const EXAM_PACK_SLUG = "goi-luyen-thi-2027";
export const DONATION_SLUG = "ung-ho";

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
