import { dienBienPhuMapFilm } from "@/lib/mapfilm/dien-bien-phu";
import type { MapFilmScript } from "@/lib/mapfilm/types";

/** Các "phim trên bản đồ 3D" hiện có, theo slug. */
export const mapFilms: Record<string, MapFilmScript> = {
  [dienBienPhuMapFilm.slug]: dienBienPhuMapFilm,
};

export function getMapFilm(slug: string): MapFilmScript | null {
  return mapFilms[slug] ?? null;
}
