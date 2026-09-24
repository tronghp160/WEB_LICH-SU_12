"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import { validateRadiusKm } from "@/lib/utils/map";

export type RadiusResult =
  Database["public"]["Functions"]["find_published_locations_within_radius"]["Returns"][number];

export type SearchCenter = { lat: number; lng: number; label?: string };

type Status = "idle" | "loading" | "done" | "error";

type State = {
  center: SearchCenter | null;
  /** Vòng tròn đang vẽ: chỉ có khi bán kính hợp lệ và tìm kiếm đã chạy. */
  applied: { lat: number; lng: number; km: number } | null;
  status: Status;
  results: RadiusResult[];
  error: string | null;
};

const initialState: State = { center: null, applied: null, status: "idle", results: [], error: null };

/**
 * Trạng thái + thao tác "tìm địa điểm trong bán kính" (UC03). Gọi RPC
 * `find_published_locations_within_radius` (chỉ trả địa điểm published; hàm SQL
 * cũng tự kiểm tra bán kính/tọa độ). Kiểm tra bán kính ở client trước để báo lỗi
 * tiếng Việt ngay, không tốn một lượt gọi mạng.
 */
export function useRadiusSearch() {
  const [radiusInput, setRadiusInput] = useState("50");
  const [state, setState] = useState<State>(initialState);
  // Chỉ nhận kết quả của lượt tìm MỚI NHẤT (tránh lượt cũ về sau ghi đè).
  const latestRequest = useRef(0);
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);

  async function search(center: SearchCenter, rawRadius: string = radiusInput) {
    const requestId = ++latestRequest.current;
    const validation = validateRadiusKm(rawRadius);

    if (!validation.ok) {
      setState({ center, applied: null, status: "error", results: [], error: validation.message });
      return;
    }

    setState({ center, applied: null, status: "loading", results: [], error: null });

    supabase.current ??= createClient();
    // Tham số theo tên: PostGIS dùng (lng, lat) nhưng hàm RPC nhận rõ center_lat / center_lng.
    const { data, error } = await supabase.current.rpc("find_published_locations_within_radius", {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_m: validation.km * 1000,
    });

    if (requestId !== latestRequest.current) return;

    if (error) {
      setState({
        center,
        applied: null,
        status: "error",
        results: [],
        error: "Không tìm được địa điểm lúc này. Vui lòng kiểm tra kết nối mạng và thử lại.",
      });
      return;
    }

    setState({
      center,
      applied: { lat: center.lat, lng: center.lng, km: validation.km },
      status: "done",
      results: [...data].sort((a, b) => a.distance_m - b.distance_m),
      error: null,
    });
  }

  /** Xóa tâm, vòng tròn và kết quả; hủy lượt tìm đang chạy. */
  function clear() {
    latestRequest.current++;
    setState(initialState);
  }

  return { radiusInput, setRadiusInput, ...state, search, clear };
}
