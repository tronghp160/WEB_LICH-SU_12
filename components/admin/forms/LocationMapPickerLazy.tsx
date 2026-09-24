"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// Leaflet cần `window` nên chỉ nạp ở trình duyệt (ssr: false — chỉ được phép trong Client Component).
export const LocationMapPickerLazy = dynamic(() => import("@/components/admin/forms/LocationMapPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});
