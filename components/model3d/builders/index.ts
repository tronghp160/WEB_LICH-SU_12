import type { ModelBuilder } from "@/components/model3d/kit";
import { buildBicycle } from "@/components/model3d/builders/bicycle";
import { bustBuilder } from "@/components/model3d/builders/bust";
import { buildValley } from "@/components/model3d/builders/valley";
import { buildTrenches } from "@/components/model3d/builders/trenches";
import { buildA1Tunnel } from "@/components/model3d/builders/a1-tunnel";
import { buildCommandBunker } from "@/components/model3d/builders/command-bunker";
import { buildC47 } from "@/components/model3d/builders/c47";
import { buildSoldier } from "@/components/model3d/builders/soldier";
import { buildHowitzer } from "@/components/model3d/builders/howitzer";

/** Bộ dựng của từng mô hình theo id (khớp `lib/models3d/specs.ts`). Nạp muộn: chỉ khi người xem bấm xem. */
export const builders: Record<string, ModelBuilder> = {
  "luu-phao-105": buildHowitzer,
  "xe-dap-tho": buildBicycle,
  "may-bay-c47": buildC47,
  "chien-si": buildSoldier,
  "ham-de-castries": buildCommandBunker,
  "duong-ham-a1": buildA1Tunnel,
  "chien-hao-a1": buildTrenches,
  "sa-ban-chien-thang": buildValley,
  "tuong-vo-nguyen-giap": bustBuilder({ name: "Võ Nguyên Giáp", role: "Đại tướng, Chỉ huy trưởng chiến dịch", hat: "helmet", epaulettes: true }),
  "tuong-de-castries": bustBuilder({ name: "Christian de Castries", role: "Chỉ huy tập đoàn cứ điểm của Pháp", hat: "kepi", epaulettes: true }),
  "tuong-phan-dinh-giot": bustBuilder({ name: "Phan Đình Giót", role: "Anh hùng LLVTND", hat: "floppy", epaulettes: false }),
  "tuong-to-vinh-dien": bustBuilder({ name: "Tô Vĩnh Diện", role: "Anh hùng LLVTND", hat: "floppy", epaulettes: false }),
};
