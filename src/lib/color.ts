// Same palette as the backend UserColorService
export const CALENDAR_PALETTE = [
  '#E53935', '#1E88E5', '#43A047', '#8E24AA',
  '#F4511E', '#00897B', '#3949AB', '#C0CA33',
  '#D81B60', '#6D4C41', '#00ACC1', '#FB8C00',
  '#5E35B1', '#7CB342', '#546E7A', '#FDD835',
];

export const FALLBACK_COLOR = '#78909C';

export const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

export const colorOrFallback = (value?: string | null) =>
  value && isHexColor(value) ? value : FALLBACK_COLOR;

// Black or white text, whichever reads better on the given background (WCAG relative luminance)
export const readableTextColor = (background?: string | null): string => {
  const hex = colorOrFallback(background);
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // contrast with white = 1.05 / (L + 0.05); with black = (L + 0.05) / 0.05
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#FFFFFF' : '#000000';
};
