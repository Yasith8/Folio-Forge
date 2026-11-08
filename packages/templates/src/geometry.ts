import { DENSITIES, PAGE_SIZES, type ResumeTheme } from '@folioforge/shared';

export interface PageGeometry {
  widthMm: number;
  heightMm: number;
  marginMm: number;
}

export function pageGeometry(theme: ResumeTheme): PageGeometry {
  const size = PAGE_SIZES[theme.pageSize];
  return {
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    marginMm: DENSITIES[theme.density].marginMm,
  };
}

/** CSS pixels per millimetre (CSS defines 1in = 96px = 25.4mm). */
export const PX_PER_MM = 96 / 25.4;
