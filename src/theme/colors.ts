/** Converts `#RGB` / `#RRGGBB` to an `rgba()` string with the given opacity. */
export function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw.slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return hex;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
